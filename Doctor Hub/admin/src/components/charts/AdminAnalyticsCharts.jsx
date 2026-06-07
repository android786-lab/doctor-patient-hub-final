import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PIE_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#94a3b8']

export function AppointmentsBarChart({ data = [] }) {
  const chartData = data.map((d) => ({
    label: String(d.date || '').slice(5),
    count: Number(d.count) || 0,
  }))

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
          <Tooltip />
          <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} name="Appointments" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TreatmentPieChart({ data = [] }) {
  const filtered = data.filter((d) => Number(d.count) > 0)
  const chartData = filtered.map((d) => ({
    name: String(d.type || 'other').replace(/^\w/, (c) => c.toUpperCase()),
    value: Number(d.count) || 0,
  }))

  if (!chartData.length) {
    return <p className="py-12 text-center text-sm text-slate-500">No treatment data yet</p>
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={88}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
