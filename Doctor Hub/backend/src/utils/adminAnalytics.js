import supabase from '../config/supabase.js'
import { fetchDoctorsForAdmin, fetchPatientsForAdmin } from './adminPortalRows.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function dayKey(d) {
  return d.toISOString().slice(0, 10)
}

export async function getAdminAnalytics() {
  const doctors = await fetchDoctorsForAdmin()
  const patients = await fetchPatientsForAdmin()

  let appointmentCount = 0
  let revenue = 0
  const appointmentsPerDay = []
  const treatmentTypeCounts = { allopathic: 0, homeopathic: 0, herbal: 0, other: 0 }

  const { count: apptCount, error: apptErr } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
  if (!apptErr) appointmentCount = apptCount ?? 0

  const last7 = []
  const now = new Date()
  const todayKey = dayKey(now)
  let appointmentsToday = 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    last7.push({ date: dayKey(d), count: 0 })
  }
  const dayIndex = Object.fromEntries(last7.map((x, i) => [x.date, i]))

  const { data: recentAppts } = await supabase
    .from('appointments')
    .select('created_at, scheduled_at, status, amount')
    .order('created_at', { ascending: false })
    .limit(500)

  for (const row of recentAppts || []) {
    const raw = row.created_at || row.scheduled_at
    if (!raw) continue
    const key = dayKey(new Date(raw))
    if (dayIndex[key] !== undefined) {
      last7[dayIndex[key]].count += 1
    }
    if (key === todayKey) appointmentsToday += 1
    if (row.status === 'confirmed' || row.status === 'completed') {
      revenue += Number(row.amount || 0)
    }
  }

  const { data: pays } = await supabase
    .from('payments')
    .select('amount, status')
    .limit(1000)
  if (pays?.length) {
    revenue = pays
      .filter((p) => ['verified', 'succeeded'].includes(String(p.status || '').toLowerCase()))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  }

  const { data: doctorRows } = await supabase
    .from('doctors')
    .select('treatment_type')
    .limit(500)
  for (const d of doctorRows || []) {
    const t = (d.treatment_type || 'other').toLowerCase()
    if (treatmentTypeCounts[t] !== undefined) treatmentTypeCounts[t] += 1
    else treatmentTypeCounts.other += 1
  }

  if (!doctorRows?.length) {
    for (const d of doctors) {
      const t = (d.treatment_type || 'allopathic').toLowerCase()
      if (treatmentTypeCounts[t] !== undefined) treatmentTypeCounts[t] += 1
      else treatmentTypeCounts.other += 1
    }
  }

  return {
    total_doctors: doctors.length,
    total_patients: patients.length,
    total_appointments: appointmentCount,
    appointments_today: appointmentsToday,
    total_revenue: Math.round(revenue * 100) / 100,
    appointments_per_day: last7,
    treatment_types: Object.entries(treatmentTypeCounts).map(([type, count]) => ({
      type,
      count,
    })),
  }
}
