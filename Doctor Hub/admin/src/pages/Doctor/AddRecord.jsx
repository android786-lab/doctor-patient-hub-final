import { useCallback, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import PageHeader from '../../components/admin/PageHeader'
import axiosClient from '../../lib/axiosClient'
import { appointmentChatPath } from '../../utils/staffRole.js'
import PatientHistoryPanel from '@doctor-hub/ui/PatientHistoryPanel.jsx'
import AvatarImage from '@doctor-hub/ui/AvatarImage.jsx'

const emptyRx = () => ({
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
})

function isEligible(item) {
  if (item.status === 'confirmed' || item.status === 'completed') return true
  if (item.is_completed || item.isCompleted) return true
  return false
}

export default function AddRecord() {
  const { dToken, backendUrl, appointments, getAppointments } = useContext(DoctorContext)
  const { slotDateFormat, formatMoney } = useContext(AppContext)

  const [openId, setOpenId] = useState(null)
  const [step, setStep] = useState(null)
  const [historyApptId, setHistoryApptId] = useState(null)
  const [historyByAppt, setHistoryByAppt] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [recordForms, setRecordForms] = useState({})
  const [rxForms, setRxForms] = useState({})

  const authHeaders = useCallback(
    () => ({ token: dToken, dtoken: dToken, atoken: dToken }),
    [dToken]
  )

  const fetchHistoryForAppointment = useCallback(
    async (appointmentId) => {
      const { data } = await axiosClient.get(
        `${backendUrl}/api/history/appointment/${appointmentId}`,
        { headers: authHeaders() }
      )
      return data
    },
    [backendUrl, authHeaders]
  )

  const refreshApptHistory = async (appointmentId) => {
    const data = await fetchHistoryForAppointment(appointmentId)
    setHistoryByAppt((prev) => ({ ...prev, [appointmentId]: data }))
    return data
  }

  useEffect(() => {
    if (dToken) getAppointments()
  }, [dToken])

  const getRecordForm = (id) =>
    recordForms[id] || { symptoms: '', diagnosis: '', notes: '' }

  const getRxForm = (id) =>
    rxForms[id] || { medicines: [emptyRx()], instructions: '' }

  const updateRecordForm = (id, patch) => {
    setRecordForms((prev) => ({ ...prev, [id]: { ...getRecordForm(id), ...patch } }))
  }

  const updateRxForm = (id, patch) => {
    setRxForms((prev) => ({ ...prev, [id]: { ...getRxForm(id), ...patch } }))
  }

  const updateMedicine = (apptId, index, field, value) => {
    const f = getRxForm(apptId)
    const medicines = [...f.medicines]
    medicines[index] = { ...medicines[index], [field]: value }
    updateRxForm(apptId, { medicines })
  }

  const addMedicine = (apptId) => {
    const f = getRxForm(apptId)
    updateRxForm(apptId, { medicines: [...f.medicines, emptyRx()] })
  }

  const removeMedicine = (apptId, index) => {
    const f = getRxForm(apptId)
    if (f.medicines.length <= 1) return
    updateRxForm(apptId, { medicines: f.medicines.filter((_, i) => i !== index) })
  }

  const getVisitHistory = (item) => {
    const data = historyByAppt[item.id]
    const list = data?.history || []
    const forAppt = list.filter((h) => h.appointment_id === item.id)
    const withRx = forAppt.find((h) => h.prescriptions?.length > 0)
    const latest = forAppt[0]
    return { latest, hasRx: Boolean(withRx), historyId: latest?.id }
  }

  const openMedicalRecord = async (item) => {
    setOpenId(item.id)
    setStep('record')
    if (!historyByAppt[item.id]) {
      try {
        await refreshApptHistory(item.id)
      } catch {
        /* optional */
      }
    }
  }

  const saveMedicalRecord = async (item) => {
    const f = getRecordForm(item.id)
    if (!f.diagnosis.trim()) {
      toast.error('Diagnosis is required')
      return
    }

    setSubmitting(true)
    try {
      const patientId = item.patient_id || historyByAppt[item.id]?.patient?.id
      const { data } = await axiosClient.post(
        `${backendUrl}/api/doctor/medical-history`,
        {
          patientId,
          appointmentId: item.id,
          symptoms: f.symptoms,
          diagnosis: f.diagnosis,
          notes: f.notes,
        },
        { headers: authHeaders() }
      )
      if (data.success) {
        toast.success('Medical record saved')
        await refreshApptHistory(item.id)
        setStep('prescription')
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const savePrescription = async (item) => {
    const f = getRxForm(item.id)
    const medicines = f.medicines.filter((m) => m.name.trim())
    if (!medicines.length) {
      toast.error('Add at least one medicine')
      return
    }

    const { historyId, hasRx } = getVisitHistory(item)
    if (!historyId) {
      toast.error('Save a medical record first')
      return
    }
    if (hasRx) {
      toast.error('Prescription already submitted for this visit')
      return
    }

    setSubmitting(true)
    try {
      const patientId = item.patient_id || historyByAppt[item.id]?.patient?.id
      const { data } = await axiosClient.post(
        `${backendUrl}/api/doctor/prescription`,
        {
          patientId,
          appointmentId: item.id,
          medicalHistoryId: historyId,
          medicines,
          instructions: f.instructions,
        },
        { headers: authHeaders() }
      )
      if (data.success) {
        toast.success(data.message || 'Prescription saved')
        await refreshApptHistory(item.id)
        setOpenId(null)
        setStep(null)
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const eligible = appointments.filter(isEligible)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Clinical records"
        title="Medical records & prescriptions"
        description="Add visit records for confirmed appointments. History is permanent; prescriptions cannot be edited after submit."
      />

      {eligible.length === 0 ? (
        <div className="dh-card px-8 py-16 text-center">
          <p className="font-semibold text-slate-900">No confirmed appointments</p>
          <p className="mt-2 text-sm text-slate-500">
            Records can be added once payment is verified and the visit is confirmed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {eligible.map((item) => {
            const open = openId === item.id
            const { latest, hasRx, historyId } = getVisitHistory(item)
            const patientId =
              item.patient_id || historyByAppt[item.id]?.patient?.id || item.user_id
            const recordSaved = Boolean(latest)
            const f = getRecordForm(item.id)
            const rx = getRxForm(item.id)
            const patientName = item.user_data?.name || item.patient_name || 'Patient'
            const patientImage = item.user_data?.image || item.patient_image
            const visitDate = item.slot_date || item.date
            const visitTime = item.slot_time || item.time || '—'
            const fee = Number(item.amount)
            const visitStatus =
              item.status === 'completed' || item.is_completed || item.isCompleted
                ? 'Completed visit'
                : item.status === 'confirmed' || item.payment
                  ? 'Confirmed · paid'
                  : 'Confirmed visit'

            return (
              <article key={item.id} className="dh-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                  <div className="flex items-center gap-4">
                    <AvatarImage
                      src={patientImage}
                      name={patientName}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{patientName}</p>
                      <p className="text-sm text-slate-500">
                        {visitDate ? slotDateFormat(visitDate) : '—'} · {visitTime}
                        {fee > 0 ? ` · ${formatMoney(fee)}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-teal-700">{visitStatus}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {patientId && (
                      <Link
                        to={`/doctor/patients/${patientId}/history`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Full history
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setHistoryApptId(historyApptId === item.id ? null : item.id)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {historyApptId === item.id ? 'Hide timeline' : 'View timeline'}
                    </button>
                    <Link
                      to={appointmentChatPath(item.id, dToken)}
                      className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800"
                    >
                      Message
                    </Link>
                    {!hasRx && (
                      <button
                        type="button"
                        onClick={() => {
                          if (open) {
                            setOpenId(null)
                            setStep(null)
                          } else if (recordSaved) {
                            setOpenId(item.id)
                            setStep('prescription')
                          } else {
                            openMedicalRecord(item)
                          }
                        }}
                        className="dh-btn py-2 text-sm"
                      >
                        {recordSaved ? 'Add prescription' : 'Add medical record'}
                      </button>
                    )}
                    {hasRx && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                        Visit complete
                      </span>
                    )}
                  </div>
                </div>

                {historyApptId === item.id && (
                  <div className="border-b border-slate-100 p-5">
                    <PatientHistoryPanel
                      appointmentId={item.id}
                      fetchHistory={fetchHistoryForAppointment}
                      downloadPdfUrl={(hid) =>
                        `${backendUrl}/api/history/${hid}/prescription.pdf`
                      }
                      downloadAttachmentUrl={(hid, idx) =>
                        `${backendUrl}/api/history/${hid}/attachments/${idx}/download`
                      }
                      getAuthHeaders={authHeaders}
                      onClose={() => setHistoryApptId(null)}
                    />
                  </div>
                )}

                {open && step === 'record' && !recordSaved && (
                  <div className="space-y-4 bg-slate-50/80 p-6">
                    <h3 className="text-sm font-semibold text-slate-900">Medical record</h3>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Symptoms</label>
                      <input
                        className="dh-input mt-1"
                        value={f.symptoms}
                        onChange={(e) => updateRecordForm(item.id, { symptoms: e.target.value })}
                        placeholder="e.g. fever, headache"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Diagnosis *</label>
                      <input
                        className="dh-input mt-1"
                        value={f.diagnosis}
                        onChange={(e) => updateRecordForm(item.id, { diagnosis: e.target.value })}
                        placeholder="Primary diagnosis"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Notes</label>
                      <textarea
                        className="dh-input mt-1 min-h-[88px]"
                        rows={3}
                        value={f.notes}
                        onChange={(e) => updateRecordForm(item.id, { notes: e.target.value })}
                        placeholder="Clinical notes"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => saveMedicalRecord(item)}
                      className="dh-btn"
                    >
                      {submitting ? 'Saving…' : 'Save medical record'}
                    </button>
                  </div>
                )}

                {open && step === 'prescription' && recordSaved && !hasRx && (
                  <div className="space-y-4 bg-slate-50/80 p-6">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Prescriptions are <strong>permanent</strong> — you cannot edit or delete after
                      submit.
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">Prescription</h3>
                    <div className="space-y-3">
                      {rx.medicines.map((m, idx) => (
                        <div
                          key={idx}
                          className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
                        >
                          <input
                            className="dh-input sm:col-span-2"
                            placeholder="Medicine name *"
                            value={m.name}
                            onChange={(e) =>
                              updateMedicine(item.id, idx, 'name', e.target.value)
                            }
                          />
                          <input
                            className="dh-input"
                            placeholder="Dosage"
                            value={m.dosage}
                            onChange={(e) =>
                              updateMedicine(item.id, idx, 'dosage', e.target.value)
                            }
                          />
                          <input
                            className="dh-input"
                            placeholder="Frequency"
                            value={m.frequency}
                            onChange={(e) =>
                              updateMedicine(item.id, idx, 'frequency', e.target.value)
                            }
                          />
                          <input
                            className="dh-input sm:col-span-2"
                            placeholder="Duration"
                            value={m.duration}
                            onChange={(e) =>
                              updateMedicine(item.id, idx, 'duration', e.target.value)
                            }
                          />
                          {rx.medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicine(item.id, idx)}
                              className="text-left text-xs font-semibold text-red-600 sm:col-span-2"
                            >
                              Remove medicine
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addMedicine(item.id)}
                      className="text-sm font-semibold text-teal-700 hover:underline"
                    >
                      + Add medicine
                    </button>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        General instructions
                      </label>
                      <textarea
                        className="dh-input mt-1 min-h-[72px]"
                        rows={2}
                        value={rx.instructions}
                        onChange={(e) => updateRxForm(item.id, { instructions: e.target.value })}
                        placeholder="e.g. Take after meals"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => savePrescription(item)}
                      className="dh-btn"
                    >
                      {submitting ? 'Submitting…' : 'Submit prescription (final)'}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
