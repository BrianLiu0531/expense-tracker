import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import { api, ApiError, toQuery } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CATEGORIES, formatDate, formatMoney } from '../lib/region';
import type { Transaction, TransactionInput, TransactionPage } from '../types';

const PAGE_SIZE = 15;
const ALL_CATEGORIES = [...new Set([...CATEGORIES.EXPENSE, ...CATEGORIES.INCOME])].sort();

type Editing = { mode: 'create' } | { mode: 'edit'; tx: Transaction } | null;

export default function TransactionsPage() {
  const { user } = useAuth();
  const region = user!.region;
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ type: '', category: '', from: '', to: '', search: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing>(null);

  // Debounce free-text search so we don't fire a request per keystroke
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => ({ ...f, search }));
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const params = { ...filters, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api<TransactionPage>(`/transactions${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ predicate: (q) => ['transactions', 'summary'].includes(q.queryKey[0] as string) });

  const save = useMutation({
    mutationFn: (input: TransactionInput) =>
      editing?.mode === 'edit'
        ? api<Transaction>(`/transactions/${editing.tx.id}`, { method: 'PUT', json: input })
        : api<Transaction>('/transactions', { method: 'POST', json: input }),
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function openEditor(next: Editing) {
    save.reset();
    setEditing(next);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const exportHref = `/api/transactions/export.csv${toQuery({ ...filters })}`;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Transactions</h1>
        <div className="row">
          <a className="btn btn-ghost" href={exportHref} download>
            Export CSV
          </a>
          <button className="btn btn-primary" onClick={() => openEditor({ mode: 'create' })}>
            + Add transaction
          </button>
        </div>
      </div>

      <div className="card filters">
        <input placeholder="Search description…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)} aria-label="Type">
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
        <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} aria-label="From date" />
        <input type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} aria-label="To date" />
      </div>

      <div className="card table-card">
        {isError && <p className="error">Couldn’t load transactions.</p>}
        {isLoading && <p className="muted">Loading…</p>}
        {data && data.items.length === 0 && <p className="muted empty">No transactions match these filters.</p>}
        {data && data.items.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th className="num">Amount</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((tx) => (
                <tr key={tx.id}>
                  <td data-label="Date">{formatDate(tx.date, region)}</td>
                  <td data-label="Description">
                    {tx.description || <span className="muted">—</span>}
                    {tx.gstApplicable && <span className="badge">GST</span>}
                  </td>
                  <td data-label="Category">{tx.category}</td>
                  <td data-label="Amount" className={`num ${tx.type === 'INCOME' ? 'positive' : 'negative'}`}>
                    {tx.type === 'INCOME' ? '+' : '−'}
                    {formatMoney(tx.amountCents, region)}
                  </td>
                  <td className="actions">
                    <button className="btn btn-small" onClick={() => openEditor({ mode: 'edit', tx })}>
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      disabled={remove.isPending}
                      onClick={() => confirm('Delete this transaction?') && remove.mutate(tx.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > PAGE_SIZE && (
          <div className="pagination">
            <button className="btn btn-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span className="muted small">
              Page {page} of {totalPages} · {data.total} transactions
            </span>
            <button className="btn btn-small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.mode === 'edit' ? 'Edit transaction' : 'New transaction'} onClose={() => setEditing(null)}>
          <TransactionForm
            region={region}
            initial={editing.mode === 'edit' ? editing.tx : undefined}
            submitting={save.isPending}
            serverError={save.error instanceof ApiError ? save.error.message : save.error ? 'Could not save' : undefined}
            onSubmit={(input) => save.mutate(input)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
