import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginFarmer } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from '../components/ErrorBanner'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await loginFarmer({ email, password })
      login(access_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1400&q=85"
          alt=""
        />
        <div className="auth-visual-copy">
          <div className="flex items-center gap-2.5 mb-12">
            <span className="brand-mark">AF</span>
            <span className="text-xl font-bold tracking-tight">AgriFlow</span>
          </div>
          <p className="auth-eyebrow">Harvest intelligence</p>
          <h2>Make every harvest count.</h2>
          <p>One calm workspace for better selling, storing, and processing decisions.</p>
        </div>
      </div>

      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-form-card">
          <div className="auth-mobile-brand flex items-center gap-2.5 mb-10">
            <span className="brand-mark">AF</span>
            <span className="text-xl font-bold tracking-tight text-soil">AgriFlow</span>
          </div>
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf/75 mb-2">Welcome back</p>
            <h1 className="text-3xl font-bold text-soil mb-2">Log in to your farm workspace</h1>
            <p className="auth-intro text-sm">Pick up where your harvest decisions left off.</p>
          </div>

          <ErrorBanner message={error} />

          <label htmlFor="email" className="auth-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />

          <label htmlFor="password" className="auth-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input mb-7"
          />

          <button
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>

          <p className="text-sm text-soil/60 text-center mt-5">
            New here?{' '}
            <Link to="/register" className="text-leaf font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </form>
        <p className="auth-footnote">AgriFlow · Decisions after harvest, made clearer.</p>
      </div>
    </div>
  )
}

export default LoginPage
