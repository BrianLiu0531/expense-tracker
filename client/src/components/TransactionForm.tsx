import { useState, type FormEvent } from 'react';
import { CATEGORIES, formatMoney, gstOf, parseDollars, REGIONS, todayISO } from '../lib/region';
import type { Region, TransactionInput, TransactionType } from '../types';

interface Props {
  region: Region;
  initial?: TransactionInput;
  submitting?: boolean;
  serverError?: string;
  onSubmit: (input: TransactionInput) => void;
  onCancel: () => void;
}

export default function TransactionForm({ region, initial, submitting, serverError, onSubmit, onCancel }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(initial ? (initial.amountCents / 100).toFixed(2) : '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [gstApplicable, setGstApplicable] = useState(initial?.gstApplicable ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const cents = parseDollars(amount);
  const { gstRate, taxAuthority } = REGIONS[region];

  function changeType(next: TransactionType) {
    setType(next);
    if (!CATEGORIES[next].includes(category)) setCategory('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (cents === null || cents <= 0) next.amount = 'Enter a positive amount, e.g. 12.50';
    if (!category) next.category = 'Choose a category';
    if (!date) next.date = 'Choose a date';
    setErrors(next);
    if (Object.keys(next).length > 0 || cents === null) return;

    onSubmit({
      type,
      amountCents: cents,
      category,
      date,
      description: description.trim() || null,
      gstApplicable,
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="segmented" role="radiogroup" aria-label="Transaction type">
        {(['EXPENSE', 'INCOME'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            className={type === t ? 'active' : ''}
            onClick={() => changeType(t)}
          >
            {t === 'EXPENSE' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Amount ({REGIONS[region].currency})</span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-invalid={!!errors.amount}
        />
        {errors.amount && <small className="error">{errors.amount}</small>}
      </label>

      <div className="field-row">
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={!!errors.category}>
            <option value="">Select…</option>
            {CATEGORIES[type].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {errors.category && <small className="error">{errors.category}</small>}
        </label>

        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
          {errors.date && <small className="error">{errors.date}</small>}
        </label>
      </div>

      <label className="field">
        <span>Description (optional)</span>
        <input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="checkbox">
        <input type="checkbox" checked={gstApplicable} onChange={(e) => setGstApplicable(e.target.checked)} />
        <span>
          Includes GST ({gstRate * 100}%)
          {gstApplicable && cents !== null && cents > 0 && (
            <span className="muted"> — {formatMoney(gstOf(cents, region), region)} reportable to {taxAuthority}</span>
          )}
        </span>
      </label>

      {serverError && <p className="error" role="alert">{serverError}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
