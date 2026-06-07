export function classifyAppointment(row) {
  if (!row) return 'pending'
  if (row.cancelled || row.status === 'cancelled') return 'cancelled'
  if (row.is_completed || row.status === 'completed') return 'completed'
  if (
    row.status === 'confirmed' ||
    (row.payment === true && row.status !== 'awaiting_verification' && row.status !== 'payment_uploaded')
  ) {
    return 'confirmed'
  }
  return 'pending'
}

export function countByStatus(rows) {
  const stats = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
  for (const row of rows || []) {
    const s = classifyAppointment(row)
    stats[s] = (stats[s] || 0) + 1
    if (s !== 'cancelled') stats.total += 1
  }
  return stats
}

export function mapAppointmentSummary(row) {
  const status = classifyAppointment(row)
  const doctorName =
    row.doc_data?.name || row.doctor_name || row.doctor?.name || 'Doctor'
  const date =
    row.slot_date ||
    (row.scheduled_at ? new Date(row.scheduled_at).toLocaleDateString() : '—')
  const time = row.slot_time || '—'
  return {
    id: row.id,
    doctor_name: doctorName,
    slot_date: date,
    slot_time: time,
    status,
    disease_description: row.disease_description || row.disease_query || row.symptoms || '',
    amount: row.amount,
    cancelled: row.cancelled,
    is_completed: row.is_completed,
    raw: row,
  }
}
