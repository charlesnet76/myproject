const R = 52
const CX = 80
const CY = 80
const STROKE = 20
const CIRCUMFERENCE = 2 * Math.PI * R

const SEGMENTS = [
  { key: 'Male',   color: '#3b82f6' },
  { key: 'Female', color: '#ec4899' },
  { key: 'Other',  color: '#8b5cf6' },
]

export default function StatsChart({ stats }) {
  const total = (stats.Male || 0) + (stats.Female || 0) + (stats.Other || 0)

  let cumulative = 0
  const segments = SEGMENTS.map(({ key, color }) => {
    const value = stats[key] || 0
    const pct = total > 0 ? value / total : 0
    const dash = pct * CIRCUMFERENCE
    const offset = -(cumulative * CIRCUMFERENCE)
    cumulative += pct
    return { key, color, value, pct, dash, offset }
  }).filter(s => s.value > 0)

  return (
    <div className="chart-card">
      <p className="chart-title">Gender Breakdown</p>
      <div className="chart-inner">
        <div className="chart-donut">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {total === 0 ? (
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
            ) : (
              segments.map((s) => (
                <circle
                  key={s.key}
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${s.dash} ${CIRCUMFERENCE}`}
                  strokeDashoffset={s.offset}
                  transform={`rotate(-90, ${CX}, ${CY})`}
                />
              ))
            )}
            <text x={CX} y={CY - 6} textAnchor="middle" fill="var(--text-h)" fontSize="24" fontWeight="700">{total}</text>
            <text x={CX} y={CY + 14} textAnchor="middle" fill="var(--text)" fontSize="12">gendered</text>
          </svg>
        </div>
        <div className="chart-legend">
          {SEGMENTS.map(({ key, color }) => {
            const value = stats[key] || 0
            const pct = total > 0 ? Math.round(value / total * 100) : 0
            return (
              <div key={key} className="legend-row">
                <div className="legend-dot" style={{ background: color }} />
                <span className="legend-key">{key}</span>
                <span className="legend-val">{value}</span>
                <span className="legend-pct">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
