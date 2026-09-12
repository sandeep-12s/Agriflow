import { useState, FormEvent, ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerFarmer, requestRegistrationOtp } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { SUPPORTED_LANGUAGES, Language } from '../i18n'
import { detectLanguageFromLocationText, detectRegionAndLanguage } from '../utils/regionLanguage'
import ErrorBanner from '../components/ErrorBanner'

function RegisterPage() {
  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    location: '',
    language: 'hi' as Language,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpMessage, setOtpMessage] = useState('')
  const [detectedRegionBadge, setDetectedRegionBadge] = useState<string | null>(null)
  const [detectingGps, setDetectingGps] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const update =
    (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleLocationChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((f) => ({ ...f, location: val }))
    const match = detectLanguageFromLocationText(val)
    if (match) {
      setForm((f) => ({ ...f, location: val, language: match.language }))
      setDetectedRegionBadge(`📍 ${match.state} detected → Language auto-set to ${match.nativeName}`)
    } else {
      setDetectedRegionBadge(null)
    }
  }

  const handleAutoDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setDetectingGps(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await detectRegionAndLanguage({
            coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          })
          const resolvedLoc = res.district ? `${res.district}, ${res.state}` : res.state
          setForm((f) => ({ ...f, location: resolvedLoc, language: res.language }))
          setDetectedRegionBadge(`📍 ${res.state} detected → Language auto-set to ${res.nativeName}`)
        } catch {
          setError('Could not auto-detect location.')
        } finally {
          setDetectingGps(false)
        }
      },
      () => {
        setDetectingGps(false)
        setError('Location permission denied.')
      },
      { timeout: 8000 }
    )
  }

  const handleRequestOtp = async () => {
    setError('')
    if (form.phone.trim().length < 7) {
      setError('Enter a valid phone number to receive a verification code.')
      return
    }

    setLoading(true)
    try {
      const response = await requestRegistrationOtp(form.phone)
      setOtpRequested(true)
      setOtpMessage(response.dev_code ? `${response.message} Development code: ${response.dev_code}` : response.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification code.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await registerFarmer({ ...form, role, otp })
      login(access_token)
      if (role === 'buyer') {
        navigate('/buyer/portal')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
          <p className="auth-eyebrow">A better harvest starts here</p>
          <h2>Grow with clarity.</h2>
          <p>Bring your produce, markets, and next best move into one calm workspace.</p>
        </div>
      </div>

      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-form-card auth-register-card">
          <div className="auth-mobile-brand flex items-center gap-2.5 mb-8">
            <span className="brand-mark">AF</span>
            <span className="text-xl font-bold tracking-tight text-soil">AgriFlow</span>
          </div>
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf/75 mb-2">Get started</p>
            <h1 className="text-3xl font-bold text-soil mb-2">
              {role === 'buyer' ? 'Create your buyer account' : 'Create your farmer account'}
            </h1>
            <p className="auth-intro text-sm">
              {role === 'buyer'
                ? 'Post purchasing orders and source quality produce directly from farmers.'
                : 'Set up your workspace and make your next harvest count.'}
            </p>

            {/* Account Type Selector */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-soil/5 rounded-2xl border border-soil/10">
              <button
                type="button"
                onClick={() => setRole('farmer')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  role === 'farmer' ? 'bg-white shadow-xs text-leaf' : 'text-soil/60 hover:text-soil'
                }`}
              >
                👨‍🌾 Farmer / Producer
              </button>
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  role === 'buyer' ? 'bg-white shadow-xs text-leaf' : 'text-soil/60 hover:text-soil'
                }`}
              >
                🏢 Buyer / Trader
              </button>
            </div>
          </div>

          <ErrorBanner message={error} />

          <Field id="name" label="Full name" value={form.name} onChange={update('name')} autoComplete="name" />
          <Field id="phone" label="Phone" value={form.phone} onChange={update('phone')} type="tel" autoComplete="tel" />
          <Field id="email" label="Email" value={form.email} onChange={update('email')} type="email" autoComplete="email" />
          <Field
            id="password"
            label="Password"
            value={form.password}
            onChange={update('password')}
            type="password"
            autoComplete="new-password"
          />
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="location" className="auth-label mb-0">Location / Farm District</label>
            <button
              type="button"
              onClick={handleAutoDetectLocation}
              disabled={detectingGps}
              className="text-[11px] font-bold text-leaf hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>📍</span>
              <span>{detectingGps ? 'Detecting GPS…' : 'Auto-detect GPS'}</span>
            </button>
          </div>
          <input
            id="location"
            type="text"
            required
            placeholder="e.g. Nashik, Ludhiana, Rajkot, Guntur, Bareilly"
            value={form.location}
            onChange={handleLocationChange}
            className="auth-input mb-3"
          />

          {detectedRegionBadge && (
            <p className="text-xs font-bold text-leaf bg-leaf/10 border border-leaf/25 px-3 py-2 rounded-xl mb-4 flex items-center gap-1.5 animate-fadeIn shadow-xs">
              {detectedRegionBadge}
            </p>
          )}

          <label htmlFor="language" className="auth-label">
            Preferred language (Auto-selected by region)
          </label>
          <select id="language" value={form.language} onChange={update('language')} className="auth-input mb-6">
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.nativeName} ({l.label})
              </option>
            ))}
          </select>

          {otpRequested && (
            <>
              <div className="otp-message" role="status">{otpMessage}</div>
              <label htmlFor="otp" className="auth-label">Phone verification code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="auth-input mb-6"
              />
            </>
          )}

          <button
            type={otpRequested ? 'submit' : 'button'}
            onClick={otpRequested ? undefined : handleRequestOtp}
            disabled={loading}
            className="auth-submit"
          >
            {loading ? (otpRequested ? 'Verifying…' : 'Sending code…') : otpRequested ? 'Verify and create account' : 'Send verification code'}
          </button>

          {otpRequested && (
            <button type="button" className="auth-secondary-action" onClick={() => { setOtpRequested(false); setOtpMessage(''); setOtp('') }}>
              Change phone number
            </button>
          )}

          <p className="text-sm text-soil/60 text-center mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-leaf font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </form>
        <p className="auth-footnote">AgriFlow · Decisions after harvest, made clearer.</p>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <>
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={onChange}
        className="auth-input"
      />
    </>
  )
}

export default RegisterPage
