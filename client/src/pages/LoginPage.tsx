import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent, creds = { email, password }) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(creds.email, creds.password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card form" onSubmit={submit}>
        <h1>💰 Ledgerly</h1>
        <p className="muted">Track spending and GST across the AU &amp; NZ financial year.</p>

        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={(e) => submit(e, { email: 'demo@example.com', password: 'Demo1234!' })}
        >
          Try the demo account
        </button>
        <p className="muted small center">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
