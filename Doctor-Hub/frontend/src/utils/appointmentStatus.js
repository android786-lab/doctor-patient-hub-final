export function getAppointmentStatus(item) {
  if (item.cancelled) return { label: 'Cancelled', tone: 'red' }
  if (item.is_completed) return { label: 'Completed', tone: 'green' }
  if (item.status === 'confirmed') return { label: 'Confirmed', tone: 'green' }
  if (
    item.status === 'pending_payment' &&
    !item.payment_proof_url &&
    item.payment_reference
  ) {
    return { label: 'Payment rejected — re-upload proof', tone: 'red' }
  }
  if (
    item.status === 'payment_uploaded' ||
    (item.status === 'awaiting_verification' && item.payment_proof_url)
  ) {
    return { label: 'Proof sent — awaiting approval', tone: 'amber' }
  }
  if (item.status === 'awaiting_verification' || (item.payment && !item.status)) {
    return { label: 'Awaiting verification', tone: 'amber' }
  }
  if (item.payment) return { label: 'Paid', tone: 'blue' }
  return { label: 'Pending payment', tone: 'slate' }
}

/** Payment is only collected during booking — never prompt again on My Appointments. */
export function appointmentNeedsPayment() {
  return false
}
