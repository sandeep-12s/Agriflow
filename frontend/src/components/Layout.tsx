import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', key: 'dashboard' },
  { to: '/produce', key: 'produce' },
  { to: '/market', key: 'market' },
  { to: '/buyers', key: 'buyers' },
  { to: '/storage', key: 'storage' },
  { to: '/processing', key: 'processing' },
  { to: '/assistant', key: 'assistant' },
  { to: '/analytics', key: 'analytics' },
] as const

function Layout({ children }: { children: ReactNode }) {
  const { logout, language, setLanguage, t } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

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
            <Link to="/dashboard" className="flex items-center gap-2.5 text-soil hover:text-leaf">
              <span className="brand-mark">AF</span>
              <span className="text-lg font-bold tracking-tight">AgriFlow</span>
            </Link>
            {/* Full nav shown from md breakpoint up — below that it collapses
                into the hamburger menu so 8 links never overflow a phone screen. */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
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
            <span className="hidden lg:inline text-xs font-medium text-soil/45 mr-2">{t('farmerWorkspace')}</span>
            <div className="hidden md:flex items-center gap-1 border border-soil/20 rounded-lg p-1" role="group" aria-label={t('responseLanguage')}>
              <button onClick={() => setLanguage('en')} className={`text-xs px-2 py-1 rounded ${language === 'en' ? 'bg-leaf text-white' : 'text-soil'}`}>EN</button>
              <button onClick={() => setLanguage('hi')} className={`text-xs px-2 py-1 rounded ${language === 'hi' ? 'bg-leaf text-white' : 'text-soil'}`}>हिन्दी</button>
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
            {NAV_ITEMS.map((item) => (
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
            <div className="flex items-center gap-1 mt-1 px-1" role="group" aria-label={t('responseLanguage')}>
              <button onClick={() => setLanguage('en')} className={`text-xs px-2 py-1 rounded ${language === 'en' ? 'bg-leaf text-white' : 'text-soil'}`}>EN</button>
              <button onClick={() => setLanguage('hi')} className={`text-xs px-2 py-1 rounded ${language === 'hi' ? 'bg-leaf text-white' : 'text-soil'}`}>हिन्दी</button>
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
