import api from '../services/api.js'

/** Download lab report / attachment with correct filename and PDF headers. */
export async function downloadHistoryAttachment(historyId, index, filename) {
  const res = await api.get(`/history/${historyId}/attachments/${index}/download`, {
    responseType: 'blob',
  })
  const blob = res.data
  const disposition = res.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const name = match?.[1] || filename || `report-${historyId.slice(0, 8)}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
