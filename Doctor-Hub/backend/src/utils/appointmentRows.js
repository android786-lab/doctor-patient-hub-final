import supabase from '../config/supabase.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

const PENDING_STATUSES = [
  'awaiting_verification',
  'payment_uploaded',
  'payment_processing',
]

function slotPartsFromScheduled(scheduledAt) {
  if (!scheduledAt) return { slot_date: '—', slot_time: '—' }
  const d = new Date(scheduledAt)
  const slot_date = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
  const slot_time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return { slot_date, slot_time }
}

/** Normalize for admin Verify Payments UI (CareLink + 001 shapes) */
export function mapAppointmentForAdmin(row) {
  const proof =
    row.payment_proof_url || row.proof_url || row.payment_proof || null
  const method = row.payment_method || row.method || null

  if (row?.user_data && row?.doc_data) {
    return { ...row, payment_proof_url: proof, payment_method: method }
  }

  const { slot_date, slot_time } = row.slot_date
    ? { slot_date: row.slot_date, slot_time: row.slot_time || '—' }
    : slotPartsFromScheduled(row.scheduled_at)

  return {
    ...row,
    slot_date,
    slot_time,
    amount: row.amount ?? 0,
    doc_data: row.doc_data || { name: 'Doctor', image: null },
    user_data: row.user_data || { name: 'Patient' },
    payment: row.payment ?? true,
    cancelled: row.cancelled ?? false,
    payment_proof_url: proof,
    payment_method: method,
    payment_reference: row.payment_reference || row.reference || null,
  }
}

async function attachPaymentProofs(rows) {
  if (!rows.length) return rows
  const ids = rows.map((r) => r.id)
  const { data: pays } = await supabase
    .from('payments')
    .select('appointment_id, proof_url, method, reference')
    .in('appointment_id', ids)

  if (!pays?.length) return rows
  const byAppt = Object.fromEntries(pays.map((p) => [p.appointment_id, p]))
  return rows.map((r) => {
    const p = byAppt[r.id]
    if (!p) return r
    return {
      ...r,
      payment_proof_url: r.payment_proof_url || p.proof_url,
      payment_method: r.payment_method || p.method,
      payment_reference: r.payment_reference || p.reference,
    }
  })
}

function isPendingForVerification(row) {
  if (!row) return false
  if (row.cancelled === true || row.status === 'cancelled') return false
  if (row.status === 'confirmed' || row.status === 'completed') return false
  if (row.payment_proof_url) return true
  if (row.status && PENDING_STATUSES.includes(row.status)) return true
  if (
    row.payment === true &&
    (!row.status || row.status === 'pending' || row.status === 'awaiting_verification')
  ) {
    return true
  }
  return false
}

export async function fetchPendingVerificationAppointments() {
  const byId = new Map()

  const addRows = (list) => {
    for (const row of list || []) {
      if (!row?.id || !isPendingForVerification(row)) continue
      byId.set(row.id, row)
    }
  }

  const byStatus = await supabase
    .from('appointments')
    .select('*')
    .in('status', PENDING_STATUSES)
    .order('created_at', { ascending: false })

  if (!byStatus.error) addRows(byStatus.data)
  else if (!/status|column|enum/i.test(byStatus.error.message || '')) throw byStatus.error

  const byProof = await supabase
    .from('appointments')
    .select('*')
    .not('payment_proof_url', 'is', null)
    .order('created_at', { ascending: false })

  if (!byProof.error) addRows(byProof.data)
  else if (!/payment_proof_url|column/i.test(byProof.error.message || '')) {
    console.warn('payment_proof_url query skipped:', byProof.error.message)
  }

  const carelinkPaid = await supabase
    .from('appointments')
    .select('*')
    .eq('payment', true)
    .eq('cancelled', false)
    .order('created_at', { ascending: false })

  if (!carelinkPaid.error) addRows(carelinkPaid.data)
  else if (!/payment|cancelled|column/i.test(carelinkPaid.error.message || '')) {
    console.warn('carelink payment query skipped:', carelinkPaid.error.message)
  }

  if (!byId.size && byStatus.error && byProof.error) {
    const all = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (all.error) throw all.error
    addRows(all.data)
  }

  const rows = [...byId.values()].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )
  return attachPaymentProofs(rows)
}

async function loadRecentAppointmentsWithPayments(limit = 300) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  const rows = data || []
  const withProofs = await attachPaymentProofs(rows)

  const ids = withProofs.map((r) => r.id)
  const payByAppt = {}
  if (ids.length) {
    const { data: pays } = await supabase
      .from('payments')
      .select('appointment_id, status, verified_at, reference')
      .in('appointment_id', ids)
    for (const p of pays || []) {
      payByAppt[p.appointment_id] = p
    }
  }

  return withProofs.map((r) => ({
    ...r,
    _payment_status: payByAppt[r.id]?.status || null,
    _payment_verified_at: payByAppt[r.id]?.verified_at || null,
  }))
}

function hadPaymentSubmission(row) {
  return Boolean(
    row.payment_proof_url ||
      row.proof_url ||
      row.payment_proof ||
      PENDING_STATUSES.includes(row.status) ||
      row.payment === true
  )
}

function isVerifiedPayment(row) {
  if (!row || row.cancelled === true) return false
  if (isPendingForVerification(row)) return false
  if (row.status === 'confirmed' || row.status === 'completed') return true
  if (row.verified_at || row._payment_verified_at) return true
  if (row._payment_status === 'succeeded' || row._payment_status === 'verified') return true
  return false
}

function isRejectedPayment(row) {
  if (!row) return false
  if (row.status === 'rejected' || row.status === 'payment_rejected') return true
  if (row._payment_status === 'rejected' || row._payment_status === 'failed') return true
  if (row.cancelled === true && hadPaymentSubmission(row)) return true
  return false
}

/** pending | verified | rejected */
export async function fetchAppointmentsForPaymentTab(tab) {
  const rows = await loadRecentAppointmentsWithPayments()
  const filtered = rows.filter((row) => {
    if (tab === 'pending') return isPendingForVerification(row)
    if (tab === 'verified') return isVerifiedPayment(row)
    if (tab === 'rejected') return isRejectedPayment(row)
    return false
  })
  return filtered.sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )
}

export async function rejectAppointmentById(appointmentId, reason = '') {
  const note = reason?.trim() || 'Payment not verified'
  const rejectedAt = new Date().toISOString()

  const attempts = [
    {
      status: 'pending_payment',
      cancelled: false,
      payment: false,
      payment_proof_url: null,
      proof_url: null,
      payment_reference: note,
      verified_at: null,
    },
    {
      status: 'pending_payment',
      cancelled: false,
      payment: false,
      payment_proof_url: null,
      payment_reference: note,
    },
    {
      status: 'pending_payment',
      cancelled: false,
      payment_proof_url: null,
    },
  ]

  let data = null
  let lastError = null
  for (const patch of attempts) {
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    )
    const { data: updated, error } = await supabase
      .from('appointments')
      .update(cleaned)
      .eq('id', appointmentId)
      .select()
      .single()
    if (!error) {
      data = updated
      break
    }
    lastError = error
    if (!isMissingColumn(error)) throw error
  }
  if (!data) throw lastError || new Error('Could not reject appointment')

  const paymentPatches = [
    { status: 'rejected', reference: note, verified_at: rejectedAt },
    { status: 'rejected', reference: note },
    { status: 'rejected' },
  ]
  for (const patch of paymentPatches) {
    const { error } = await supabase
      .from('payments')
      .update(patch)
      .eq('appointment_id', appointmentId)
    if (!error) break
    if (!isMissingColumn(error) && !/relation.*does not exist/i.test(error.message || '')) break
  }

  try {
    const { notifyFromAppointmentRow } = await import('../services/notificationService.js')
    await notifyFromAppointmentRow(data, 'payment_rejected', { reason: note })
  } catch (notifyErr) {
    console.warn('Payment rejected notification skipped:', notifyErr.message)
  }

  return data
}

export async function confirmAppointmentById(appointmentId) {
  const verifiedAt = new Date().toISOString()

  const attempts = [
    { status: 'confirmed', verified_at: verifiedAt, payment: true },
    { status: 'confirmed', verified_at: verifiedAt },
    { status: 'confirmed', payment: true },
    { status: 'confirmed' },
    { payment: true, is_completed: false },
    { payment: true, cancelled: false, is_completed: false },
  ]

  let data = null
  let lastError = null

  for (const patch of attempts) {
    const { data: updated, error } = await supabase
      .from('appointments')
      .update(patch)
      .eq('id', appointmentId)
      .select()
      .single()

    if (!error) {
      data = updated
      break
    }
    lastError = error
    if (!isMissingColumn(error)) throw error
  }

  if (!data) throw lastError || new Error('Could not confirm appointment')

  try {
    const { notifyFromAppointmentRow } = await import('../services/notificationService.js')
    await notifyFromAppointmentRow(data, 'confirmed')
  } catch (notifyErr) {
    console.warn('Appointment confirmed notification skipped:', notifyErr.message)
  }

  const paymentPatches = [
    { status: 'succeeded', verified_at: verifiedAt },
    { status: 'succeeded' },
  ]
  for (const patch of paymentPatches) {
    const { error } = await supabase
      .from('payments')
      .update(patch)
      .eq('appointment_id', appointmentId)
    if (!error) break
    if (!isMissingColumn(error) && !/relation.*does not exist/i.test(error.message || '')) {
      console.warn('payments update skipped:', error.message)
      break
    }
  }

  return data
}
