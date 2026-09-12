import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SUPPORTED_LANGUAGES } from '../i18n'

interface NavItem {
  to: string
  key: 'dashboard' | 'produce' | 'market' | 'buyers' | 'buyerPortal' | 'storage' | 'processing' | 'assistant' | 'analytics'
  roles: ('farmer' | 'buyer')[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', key: 'dashboard', roles: ['farmer', 'buyer'] },
  { to: '/produce', key: 'produce', roles: ['farmer'] },
  { to: '/market', key: 'market', roles: ['farmer', 'buyer'] },
  { to: '/buyers', key: 'buyers', roles: ['farmer'] },
  { to: '/buyer/portal', key: 'buyerPortal', roles: ['buyer'] },
  { to: '/storage', key: 'storage', roles: ['farmer'] },
  { to: '/processing', key: 'processing', roles: ['farmer'] },
  { to: '/assistant', key: 'assistant', roles: ['farmer', 'buyer'] },
  { to: '/analytics', key: 'analytics', roles: ['farmer'] },
]

function Layout({ children }: { children: ReactNode }) {
  const { user, logout, language, setLanguage, t, isAutoLanguage, detectedRegion, autoDetectLanguage } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isBuyer = user?.role === 'buyer'
  const navItems = ALL_NAV_ITEMS.filter((item) =>
    isBuyer ? item.roles.includes('buyer') : item.roles.includes('farmer')
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`)

  const linkClasses = (to: string) =>
    `text-sm font-medium px-3 py-2 rounded-lg transition ${
      isActive(to) ? 'bg-leaf text-white shadow-sm' : 'text-soil/75 hover:bg-husk hover:text-soil'
    }`

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-7">
            <Link to={isBuyer ? '/buyer/portal' : '/dashboard'} className="flex items-center gap-2.5 text-soil hover:text-leaf">
              <span className="brand-mark">AF</span>
              <span className="text-lg font-bold tracking-tight">AgriFlow</span>
            </Link>
            {/* Full nav shown from md breakpoint up — below that it collapses
                into the hamburger menu so 8 links never overflow a phone screen. */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                  className={linkClasses(item.to)}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden lg:inline text-xs font-bold px-2.5 py-1 rounded-full bg-soil/5 text-soil/60 mr-2">
              {isBuyer ? '🏢 BUYER WORKSPACE' : '🌾 ' + t('farmerWorkspace')}
            </span>

            {/* Detected Region Badge if auto-selected */}
            {detectedRegion && isAutoLanguage && (
              <span
                className="hidden xl:inline-flex items-center gap-1 text-[11px] font-bold text-leaf bg-leaf/10 border border-leaf/25 px-2.5 py-1 rounded-xl shadow-xs"
                title={`${t('regionDetected')}: ${detectedRegion.state}`}
              >
                <span>📍</span>
                <span>{detectedRegion.state}</span>
              </span>
            )}

            <div className="hidden md:flex items-center gap-1.5 bg-sand/60 border border-soil/20 rounded-xl px-2.5 py-1.5 shadow-xs" role="group" aria-label={t('responseLanguage')}>
              <span className="text-sm">🌐</span>
              <select
                value={isAutoLanguage ? 'auto' : language}
                onChange={(e) => {
                  if (e.target.value === 'auto') {
                    autoDetectLanguage()
                  } else {
                    setLanguage(e.target.value as any, true)
                  }
                }}
                className="bg-transparent text-xs font-bold text-soil outline-none cursor-pointer pr-1"
                aria-label="Select state language"
              >
                <option value="auto">
                  📍 {t('autoDetectRegion')}{detectedRegion ? ` (${detectedRegion.state})` : ''}
                </option>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.nativeName} ({l.label})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:inline-block text-sm font-medium text-soil border border-soil/20 rounded-lg px-3 py-2 hover:bg-husk transition"
            >
              {t('logout')}
            </button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-soil/20 text-soil text-lg"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label="Main navigation, mobile"
            className="md:hidden border-t border-soil/10 px-4 py-3 flex flex-col gap-1"
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(item.to) ? 'page' : undefined}
                className={linkClasses(item.to)}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="flex items-center justify-between py-2 px-3 bg-sand/40 border border-soil/15 rounded-xl my-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-soil/75">🌐 {t('responseLanguage')}:</span>
                {detectedRegion && isAutoLanguage && (
                  <span className="text-[10px] font-bold text-leaf bg-leaf/10 px-1.5 py-0.5 rounded-md">
                    📍 {detectedRegion.state}
                  </span>
                )}
              </div>
              <select
                value={isAutoLanguage ? 'auto' : language}
                onChange={(e) => {
                  if (e.target.value === 'auto') {
                    autoDetectLanguage()
                  } else {
                    setLanguage(e.target.value as any, true)
                  }
                }}
                className="bg-white border border-soil/20 text-xs font-bold text-soil rounded-lg px-2.5 py-1 outline-none"
              >
                <option value="auto">📍 {t('autoDetectRegion')}</option>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.nativeName}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleLogout}
              className="text-left text-sm font-medium text-soil border border-soil/20 rounded-lg px-3 py-2 mt-1 hover:bg-husk transition"
            >
              {t('logout')}
            </button>
          </nav>
        )}
      </header>
      <main className="page-container">{children}</main>
    </div>
  )
}

export default Layout
