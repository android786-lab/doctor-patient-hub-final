import supabase from '../config/supabase.js'
import { listAdminRegistrationRequests } from '../utils/adminRegistrationRows.js'
import { fetchPendingVerificationAppointments } from '../utils/appointmentRows.js'

export async function getSuperAdminOverview(req, res) {
  try {
    const pendingRequests = await listAdminRegistrationRequests({ status: 'pending' })

    const countTable = async (table, filter) => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true })
      if (filter) q = filter(q)
      const { count, error } = await q
      if (error && !/does not exist|relation/i.test(error.message || '')) return 0
      return count ?? 0
    }

    const [usersCount, doctorsCount, patientsCount, appointmentsCount] = await Promise.all([
      countTable('users'),
      countTable('doctors'),
      countTable('patients'),
      countTable('appointments'),
    ])

    const { count: unverifiedDoctorsCount, error: unvErr } = await supabase
      .from('doctors')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', false)
    const unverifiedDoctors = unvErr ? 0 : unverifiedDoctorsCount ?? 0

    const pendingPayments = await fetchPendingVerificationAppointments()

    return res.json({
      stats: {
        pendingAdminRequests: pendingRequests.length,
        totalUsers: usersCount,
        totalDoctors: doctorsCount,
        unverifiedDoctors,
        totalPatients: patientsCount,
        totalAppointments: appointmentsCount,
        pendingPaymentVerifications: pendingPayments.length,
      },
      pendingAdminRequests: pendingRequests.slice(0, 5),
    })
  } catch (err) {
    console.error('getSuperAdminOverview:', err)
    return res.status(500).json({ message: err.message || 'Failed to load overview' })
  }
}
