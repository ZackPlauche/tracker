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

  function paintPage() {
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()
    doc.setFillColor(10, 10, 15)
    doc.rect(0, 0, w, h, 'F')
  }

  paintPage()
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setTextColor(244, 244, 248)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(sheet.funnelName, 36, 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(156, 163, 175)
  doc.text('Tracker', 36, 54)
  const generated = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  doc.text(generated, pageWidth - 36, 54, { align: 'right' })

  const chartColors: [number, number, number][] = [
    [99, 102, 241],
    [34, 197, 94],
    [245, 158, 11],
    [236, 72, 153],
    [6, 182, 212],
    [167, 139, 250],
  ]
  const left = 36
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - 72
  let y = 78

  function ensure(space: number) {
    if (y + space <= pageHeight - 36) return
    doc.addPage()
    paintPage()
    y = 36
  }

  const totals = sheet.headers.map((_, index) =>
    sheet.rows.reduce((sum, row) => sum + (row.cells[index] ?? 0), 0),
  )
  const funnelMax = Math.max(1, ...totals)
  ensure(28 + sheet.headers.length * 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(244, 244, 248)
  doc.text('Funnel', left, y)
  y += 16
  sheet.headers.forEach((header, index) => {
    const value = totals[index] ?? 0
    const [r, g, b] = chartColors[index % chartColors.length]
    const barWidth = Math.max(4, (value / funnelMax) * (contentWidth - 120))
    doc.setFillColor(r, g, b)
    doc.roundedRect(left, y, barWidth, 12, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(244, 244, 248)
    doc.text(`${header}  ${value}`, left + barWidth + 8, y + 9)
    y += 18
  })
  y += 12

  const days = sheet.rows.slice(-14)
  const dayMax = Math.max(1, ...days.map((row) => row.cells.reduce((sum, n) => sum + n, 0)))
  const chartHeight = 88
  ensure(chartHeight + 36)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(244, 244, 248)
  const dayTitle = sheet.rows.length > 14 ? 'By day (last 14)' : 'By day'
  doc.text(dayTitle, left, y)
  y += 12
  const slot = contentWidth / Math.max(days.length, 1)
  days.forEach((row, index) => {
    let stacked = 0
    row.cells.forEach((value, metricIndex) => {
      const height = (value / dayMax) * chartHeight
      if (height < 0.6) return
      const [r, g, b] = chartColors[metricIndex % chartColors.length]
      doc.setFillColor(r, g, b)
      doc.rect(left + index * slot + 2, y + chartHeight - stacked - height, Math.max(slot - 4, 2), height, 'F')
      stacked += height
    })
  })
  y += chartHeight + 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(156, 163, 175)
  days.forEach((row, index) => {
    if (days.length > 8 && index % 2 === 1) return
    doc.text(row.label, left + index * slot + 1, y)
  })
  y += 18

  autoTable(doc, {
    startY: y,
    margin: { left: 36, right: 36, top: 36 },
    head: [['Date', ...sheet.headers]],
    body: sheet.rows.map((row) => [row.label, ...row.cells.map((n) => (n === 0 ? '—' : String(n)))]),
    theme: 'plain',
    willDrawPage: (data) => {
      if (data.pageNumber > 1) paintPage()
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      textColor: [244, 244, 248],
      fillColor: [26, 26, 36],
      lineColor: [42, 42, 58],
      lineWidth: 0.4,
      cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [18, 18, 26] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [244, 244, 248] },
    },
  })

  doc.save(`${slug(sheet.funnelName)}-sheet.pdf`)
}
