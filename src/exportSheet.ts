export type SheetExport = {
  funnelName: string
  headers: string[]
  rows: { label: string; cells: number[] }[]
}

function slug(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return clean || 'tracker'
}

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadSheetCsv(sheet: SheetExport) {
  const lines = [
    ['Date', ...sheet.headers].map(csvCell).join(','),
    ...sheet.rows.map((row) => [row.label, ...row.cells].map(csvCell).join(',')),
  ]
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `${slug(sheet.funnelName)}-sheet.csv`)
}

export async function downloadSheetPdf(sheet: SheetExport) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const wide = sheet.headers.length > 4
  const doc = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(18, 18, 26)
  doc.rect(0, 0, pageWidth, 72, 'F')
  doc.setTextColor(244, 244, 248)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(sheet.funnelName, 36, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(156, 163, 175)
  doc.text('Tracker', 36, 50)
  const generated = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  doc.text(generated, pageWidth - 36, 50, { align: 'right' })

  autoTable(doc, {
    startY: 88,
    margin: { left: 36, right: 36 },
    head: [['Date', ...sheet.headers]],
    body: sheet.rows.map((row) => [row.label, ...row.cells.map((n) => (n === 0 ? '—' : String(n)))]),
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      textColor: [36, 36, 48],
      cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [244, 244, 248] },
    columnStyles: {
      0: { fontStyle: 'bold' },
    },
  })

  doc.save(`${slug(sheet.funnelName)}-sheet.pdf`)
}
