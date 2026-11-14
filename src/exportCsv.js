// Downloads all reports as a CSV file (opens in Excel / Google Sheets)
export function exportCsv(reports, nameOf) {
  const cols = [
    'created_at', 'waste_type', 'description', 'address', 'lat', 'lng',
    'status', 'assigned_to', 'collected_at', 'photo_url', 'proof_url',
  ]
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const rows = reports.map((r) =>
    cols.map((c) => (c === 'assigned_to' ? esc(r.assigned_to ? nameOf(r.assigned_to) : '') : esc(r[c]))).join(',')
  )
  const csv = '\uFEFF' + [cols.join(','), ...rows].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `ecotrack-reports-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
