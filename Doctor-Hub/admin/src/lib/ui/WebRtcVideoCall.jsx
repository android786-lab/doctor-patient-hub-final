import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function waitForIceGathering(pc, timeoutMs = 4000) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done()
    }
    pc.addEventListener('icegatheringstatechange', onChange)
    setTimeout(done, timeoutMs)
  })
}

/**
 * In-browser 1:1 video (WebRTC) — no Jitsi login required.
 * Doctor creates offer; patient answers. Signaling via appointment chat API.
 */
export default function WebRtcVideoCall({
  appointmentId,
  backendUrl,
  authHeaders,
  role,
  displayName,
  onClose,
}) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const pollRef = useRef(null)
  const lastSignalAtRef = useRef(null)
  const processedIdsRef = useRef(new Set())
  const makingOfferRef = useRef(false)
  const [status, setStatus] = useState('Starting…')
  const [error, setError] = useState(null)
  const [remoteReady, setRemoteReady] = useState(false)
  const isInitiator = role === 'doctor'

  const headers = useCallback(() => authHeaders(), [authHeaders])

  const postSignal = useCallback(
    async (type, payload) => {
      await axios.post(
        `${backendUrl}/api/appointments/chat/${appointmentId}/webrtc/signal`,
        { type, payload },
        { headers: headers() }
      )
    },
    [appointmentId, backendUrl, headers]
  )

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
  }, [])

  const ensurePc = useCallback(() => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.ontrack = (event) => {
      const stream = event.streams?.[0]
      if (stream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
      }
      setStatus('Connected')
      setRemoteReady(true)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('Connected')
      if (pc.connectionState === 'failed') {
        setError('Connection failed — check network and try again')
      }
    }

    pcRef.current = pc
    return pc
  }, [])

  const handleRemoteSignal = useCallback(
    async (signal) => {
      if (!signal?.id || processedIdsRef.current.has(signal.id)) return
      if (signal.sender_role === role) return
      processedIdsRef.current.add(signal.id)

      const pc = ensurePc()

      if (signal.type === 'offer' && !isInitiator) {
        if (!localStreamRef.current) return
        await pc.setRemoteDescription(signal.payload)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await waitForIceGathering(pc)
        await postSignal('answer', pc.localDescription)
        setStatus('Connecting…')
      }

      if (signal.type === 'answer' && isInitiator) {
        await pc.setRemoteDescription(signal.payload)
        setStatus('Connecting…')
      }

      if (signal.type === 'hangup') {
        setStatus('Call ended')
        cleanup()
        onClose?.()
      }
    },
    [cleanup, ensurePc, isInitiator, onClose, postSignal, role]
  )

  const pollSignals = useCallback(async () => {
    try {
      const params = lastSignalAtRef.current ? { after: lastSignalAtRef.current } : {}
      const { data } = await axios.get(
        `${backendUrl}/api/appointments/chat/${appointmentId}/webrtc/signals`,
        { headers: headers(), params }
      )
      if (!data?.success) return
      for (const sig of data.signals || []) {
        lastSignalAtRef.current = sig.created_at
        await handleRemoteSignal(sig)
      }
    } catch {
      /* retry on next poll */
    }
  }, [appointmentId, backendUrl, handleRemoteSignal, headers])

  const startCall = useCallback(async () => {
    try {
      setStatus('Allow camera & microphone when prompted…')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const pc = ensurePc()
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pollRef.current = setInterval(pollSignals, 1500)
      await pollSignals()

      if (isInitiator && !makingOfferRef.current) {
        makingOfferRef.current = true
        setStatus('Waiting for patient to join…')
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await waitForIceGathering(pc)
        await postSignal('offer', pc.localDescription)
      } else if (!isInitiator) {
        setStatus('Waiting for doctor to connect…')
        await postSignal('ready', {})
      }
    } catch (err) {
      setError(
        err?.name === 'NotAllowedError'
          ? 'Please allow camera and microphone access in your browser settings.'
          : err?.message || 'Could not start video'
      )
      setStatus('Failed')
    }
  }, [ensurePc, isInitiator, pollSignals, postSignal])

  useEffect(() => {
    startCall()
    return () => cleanup()
  }, [startCall, cleanup])

  const hangUp = async () => {
    try {
      await postSignal('hangup', {})
    } catch {
      /* ignore */
    }
    cleanup()
    onClose?.()
  }

  return (
    <div className="border-b border-slate-200 bg-slate-900">
      <div className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-white">Live video — {displayName || 'Consultation'}</p>
          <p className="text-[10px] text-slate-300">{status}</p>
        </div>
        <button
          type="button"
          onClick={hangUp}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
        >
          End call
        </button>
      </div>

      {error ? (
        <div className="bg-red-950 px-4 py-3 text-center text-xs text-red-100">{error}</div>
      ) : null}

      <div className="relative grid min-h-[280px] grid-cols-1 bg-black sm:grid-cols-2 sm:min-h-[320px]">
        <div className="relative aspect-video bg-slate-950">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
            {isInitiator ? 'Patient' : 'Doctor'}
          </span>
          {!remoteReady ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Waiting for other person…
            </div>
          ) : null}
        </div>
        <div className="relative aspect-video border-t border-slate-800 sm:border-l sm:border-t-0">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover mirror"
          />
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
            You
          </span>
        </div>
      </div>
    </div>
  )
}
