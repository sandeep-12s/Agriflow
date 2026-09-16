import { useState, FormEvent, ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerFarmer, requestRegistrationOtp } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { SUPPORTED_LANGUAGES, Language } from '../i18n'
import { detectLanguageFromLocationText, detectRegionAndLanguage } from '../utils/regionLanguage'
import ErrorBanner from '../components/ErrorBanner'
import Logo from '../components/Logo'
import PhoneEmailSignInButton from '../components/PhoneEmailSignInButton'
import { PhoneEmailVerifyResponse } from '../api/client'

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
  const [smsSent, setSmsSent] = useState(false)
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneVerifiedMsg, setPhoneVerifiedMsg] = useState('')
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

  const handlePhoneEmailSuccess = (data: PhoneEmailVerifyResponse) => {
    setError('')
    setForm((f) => ({ ...f, phone: data.phone }))
    setPhoneVerified(true)
    setPhoneVerifiedMsg(`+91 ${data.phone}`)
    setOtp(data.verification_token)
    setOtpRequested(true)
    setSmsSent(true)
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
      setOtp('')
      setSmsSent(Boolean(response.sms_sent))
      setSimulatedCode(response.dev_code || null)
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
          <div className="mb-12">
            <Logo size="lg" variant="light" />
          </div>
          <p className="auth-eyebrow">A better harvest starts here</p>
          <h2>Grow with clarity.</h2>
          <p>Bring your produce, markets, and next best move into one calm workspace.</p>
        </div>
      </div>

      <div className="auth-panel">
        <form onSubmit={handleSubmit} className="auth-form-card auth-register-card">
          <div className="auth-mobile-brand mb-8">
            <Logo size="md" variant="dark" />
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

          {phoneVerified ? (
            <div className="p-3 mb-4 rounded-xl border-2 bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-bold text-xs text-emerald-900">Phone Verified via SMS / WhatsApp</p>
                  <p className="text-[11px] font-mono font-medium text-emerald-800">{phoneVerifiedMsg}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhoneVerified(false)
                  setOtpRequested(false)
                  setOtp('')
                }}
                className="text-[10px] text-soil/60 hover:text-soil underline cursor-pointer"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
              <PhoneEmailSignInButton
                onSuccess={handlePhoneEmailSuccess}
                onError={(msg) => setError(msg)}
                label="Verify Mobile Number via Free SMS (Phone.Email):"
              />
            </div>
          )}

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

          {otpRequested && !phoneVerified && (
            <>
              {smsSent ? (
                <div
                  className="p-4 mb-4 rounded-xl border text-xs leading-relaxed bg-emerald-50 border-emerald-200 text-emerald-900 shadow-xs"
                  role="status"
                >
                  <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-emerald-800">
                    <span>📱 Real SMS Sent to Phone</span>
                  </div>
                  <p className="font-medium">
                    A 6-digit verification code has been sent via SMS to <strong>{form.phone}</strong>. Please check your phone messages and enter the code below.
                  </p>
                </div>
              ) : (
                <div
                  className="p-4 mb-4 rounded-xl border text-xs leading-relaxed bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs"
                  role="status"
                >
                  <div className="flex items-center gap-2 mb-1 font-bold text-sm text-amber-900">
                    <span>⚠️ SMS Gateway Not Configured on Server</span>
                  </div>
                  <p className="font-medium text-soil/80">
                    No SMS gateway key (Fast2SMS) is active on Render, so SMS cannot reach your phone yet.
                  </p>
                  {simulatedCode && (
                    <div className="bg-white/95 border border-amber-300/80 rounded-lg p-2.5 mt-2.5 flex items-center justify-between shadow-xs">
                      <span className="font-semibold text-soil/80">Test Verification Code:</span>
                      <span className="font-mono font-bold text-base tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        {simulatedCode}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-soil/60 mt-2">
                    💡 Tip: You can verify instantly with real SMS above using <strong>Phone.Email</strong>, or add <strong>FAST2SMS_API_KEY</strong> to Render.
                  </p>
                </div>
              )}

              <label htmlFor="otp" className="auth-label">
                Enter 6-Digit Verification Code (OTP)
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="• • • • • •"
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="auth-input mb-6 tracking-widest text-center text-lg font-bold"
              />
            </>
          )}

          <button
            type={otpRequested || phoneVerified ? 'submit' : 'button'}
            onClick={otpRequested || phoneVerified ? undefined : handleRequestOtp}
            disabled={loading}
            className="auth-submit"
          >
            {loading
              ? (phoneVerified ? 'Creating account…' : otpRequested ? 'Verifying…' : 'Sending code…')
              : (phoneVerified ? (role === 'buyer' ? 'Create buyer account' : 'Create farmer account') : otpRequested ? 'Verify and create account' : 'Send verification code')}
          </button>

          {otpRequested && !phoneVerified && (
            <button
              type="button"
              className="auth-secondary-action"
              onClick={() => {
                setOtpRequested(false)
                setOtp('')
                setSmsSent(false)
                setSimulatedCode(null)
              }}
            >
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
