/**
 * Hospital-style data table: card list on mobile, clinical table on md+.
 */
export default function ClinicalDataList({
  columns,
  rows,
  rowKey = 'id',
  emptyMessage = 'No records found.',
  mobileCard,
}) {
  if (!rows?.length) {
    return (
      <div className="dh-portal-panel px-6 py-14 text-center text-sm text-slate-500">{emptyMessage}</div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) =>
          mobileCard ? (
            <div key={row[rowKey]}>{mobileCard(row)}</div>
          ) : (
            <article key={row[rowKey]} className="dh-portal-panel p-4">
              {columns
                .filter((c) => !c.mobileHide)
                .map((col) => (
                  <div
                    key={col.key}
                    className={`${col.key !== columns[0]?.key ? 'mt-3 border-t border-slate-100 pt-3' : ''}`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{col.label}</p>
                    <div className="mt-1 text-sm text-slate-800">
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </div>
                  </div>
                ))}
            </article>
          )
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md ring-1 ring-slate-100 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50 text-xs font-bold uppercase tracking-wider text-teal-900">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row[rowKey]} className="transition hover:bg-teal-50/30">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right' : ''} ${col.cellClass || ''}`}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
