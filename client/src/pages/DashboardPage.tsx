import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { currentFY, formatMoney, fyLabel, REGIONS } from '../lib/region';
import type { Summary } from '../types';

const PALETTE = ['#2563eb', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#65a30d', '#64748b', '#be123c'];

function monthLabel(key: string) {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-AU', { month: 'short' });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const region = user!.region;
  const latest = currentFY(region);
  const [fy, setFy] = useState(latest);
  const money = (c: number) => formatMoney(c, region);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', fy, region],
    queryFn: () => api<Summary>(`/reports/summary?fy=${fy}`),
  });

  const t = data?.totals;
  const savingsRate = t && t.income > 0 ? Math.round((t.net / t.income) * 100) : null;
  const { taxAuthority, fyName } = REGIONS[region];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            {data ? `${data.range.from} → ${data.range.to}` : '…'} · {fyName}
          </p>
        </div>
        <select value={fy} onChange={(e) => setFy(Number(e.target.value))} aria-label="Financial year">
          {Array.from({ length: 5 }, (_, i) => latest - i).map((y) => (
            <option key={y} value={y}>
              {fyLabel(y)}
            </option>
          ))}
        </select>
      </div>

      {isError && <p className="error">Couldn’t load the summary. Please try again.</p>}
      {isLoading && <p className="muted">Loading…</p>}

      {t && data && (
        <>
          <section className="kpis">
            <Kpi label="Income" value={money(t.income)} tone="positive" />
            <Kpi label="Expenses" value={money(t.expense)} tone="negative" />
            <Kpi label="Net savings" value={money(t.net)} tone={t.net >= 0 ? 'positive' : 'negative'} />
            <Kpi label="Savings rate" value={savingsRate === null ? '—' : `${savingsRate}%`} />
          </section>

          <section className="grid-2">
            <div className="card">
              <h2>Monthly cash flow</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={(v: number) => `$${Math.round(v / 100000)}k`} tickLine={false} axisLine={false} fontSize={12} width={44} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2>Spending by category</h2>
              {data.expenseByCategory.length === 0 ? (
                <p className="muted">No expenses recorded for {data.label}.</p>
              ) : (
                <div className="category-chart">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.expenseByCategory} dataKey="total" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {data.expenseByCategory.map((c, i) => (
                          <Cell key={c.category} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="legend-list">
                    {data.expenseByCategory.map((c, i) => (
                      <li key={c.category}>
                        <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span>{c.category}</span>
                        <span className="muted">{Math.round((c.total / t.expense) * 100)}%</span>
                        <strong>{money(c.total)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <h2>GST summary ({taxAuthority})</h2>
            <p className="muted small">
              Based on transactions marked as GST-inclusive. Useful for sole traders preparing a BAS (AU) or GST return (NZ).
            </p>
            <div className="gst-grid">
              <div>
                <span className="muted small">GST collected on sales</span>
                <strong>{money(t.gstCollected)}</strong>
              </div>
              <div>
                <span className="muted small">GST credits on purchases</span>
                <strong>{money(t.gstPaid)}</strong>
              </div>
              <div>
                <span className="muted small">{t.netGst >= 0 ? `Net payable to ${taxAuthority}` : `Refund from ${taxAuthority}`}</span>
                <strong>{money(Math.abs(t.netGst))}</strong>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="card kpi">
      <span className="muted small">{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}
