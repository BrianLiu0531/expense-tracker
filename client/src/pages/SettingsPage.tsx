import { useState, type FormEvent } from 'react';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { REGIONS } from '../lib/region';
import type { Region } from '../types';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user!.name);
  const [region, setRegion] = useState<Region>(user!.region);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await updateProfile({ name, region });
      setStatus({ ok: true, message: 'Settings saved' });
    } catch (err) {
      setStatus({ ok: false, message: err instanceof ApiError ? err.message : 'Could not save settings' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack narrow">
      <h1>Settings</h1>
      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={user!.email} disabled />
        </label>

        <fieldset className="field">
          <legend>Region</legend>
          {(Object.keys(REGIONS) as Region[]).map((r) => {
            const cfg = REGIONS[r];
            return (
              <label key={r} className={`region-option ${region === r ? 'selected' : ''}`}>
                <input type="radio" name="region" value={r} checked={region === r} onChange={() => setRegion(r)} />
                <div>
                  <strong>
                    {cfg.label} · {cfg.currency}
                  </strong>
                  <p className="muted small">
                    GST {cfg.gstRate * 100}% · {cfg.fyName} · reports to {cfg.taxAuthority}
                  </p>
                </div>
              </label>
            );
          })}
        </fieldset>

        {status && <p className={status.ok ? 'success' : 'error'} role="status">{status.message}</p>}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
