import PDFDocument from 'pdfkit'

export function buildPrescriptionPdfBuffer({
  clinicName = 'Doctor Hub',
  doctorName,
  doctorSpecialization,
  patientName,
  diagnosis,
  notes,
  prescriptions = [],
  issuedAt = new Date(),
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []

    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(20).fillColor('#0d9488').text(clinicName, { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(12).fillColor('#334155').text('E-Prescription', { align: 'center' })
    doc.moveDown(1.5)

    doc.fontSize(10).fillColor('#64748b')
    doc.text(`Issued: ${issuedAt.toLocaleString()}`)
    doc.moveDown(0.8)

    doc.fontSize(11).fillColor('#0f172a')
    doc.text(`Doctor: ${doctorName || '—'}`)
    if (doctorSpecialization) doc.text(`Specialization: ${doctorSpecialization}`)
    doc.text(`Patient: ${patientName || '—'}`)
    doc.moveDown(1)

    doc.fontSize(12).fillColor('#0d9488').text('Diagnosis')
    doc.fontSize(11).fillColor('#334155').text(diagnosis || '—')
    doc.moveDown(0.6)

    if (notes) {
      doc.fontSize(12).fillColor('#0d9488').text('Clinical notes')
      doc.fontSize(11).fillColor('#334155').text(notes)
      doc.moveDown(0.8)
    }

    doc.fontSize(12).fillColor('#0d9488').text('Medicines')
    doc.moveDown(0.4)

    if (!prescriptions.length) {
      doc.fontSize(11).fillColor('#64748b').text('No medicines listed.')
    } else {
      prescriptions.forEach((rx, i) => {
        doc
          .fontSize(11)
          .fillColor('#0f172a')
          .text(`${i + 1}. ${rx.medicine_name || 'Medicine'}`)
        const line = [rx.dosage, rx.duration].filter((x) => x && x !== '—').join(' · ')
        if (line) doc.fontSize(10).fillColor('#475569').text(`   ${line}`)
        if (rx.instructions && rx.instructions !== '—') {
          doc.fontSize(10).fillColor('#64748b').text(`   Instructions: ${rx.instructions}`)
        }
        doc.moveDown(0.5)
      })
    }

    doc.moveDown(2)
    doc
      .fontSize(9)
      .fillColor('#94a3b8')
      .text(
        'This is a computer-generated prescription from Doctor Hub. For emergencies, contact local emergency services.',
        { align: 'center' }
      )

    doc.end()
  })
}
