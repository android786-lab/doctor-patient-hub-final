/** Use react-toastify in App; this is the Module 1 placeholder component */
export default function Toast({ message, type = 'info' }) {
  if (!message) return null
  const styles = {
    info: 'bg-slate-800 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
  }
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-xl px-4 py-3 text-sm shadow-lg ${styles[type]}`}
      role="alert"
    >
      {message}
    </div>
  )
}
