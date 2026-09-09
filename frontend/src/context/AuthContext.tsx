import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getMyProfile } from '../api/client'
import { Language, translate } from '../i18n'

interface AuthContextValue {
  token: string | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
  language: Language
  setLanguage: (language: Language) => void
  t: (key: Parameters<typeof translate>[1]) => string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// localStorage is fine for a hackathon MVP; a production app would use an
// httpOnly cookie instead so the token isn't reachable from JS (XSS risk).
const TOKEN_KEY = 'agriflow_token'
const LANGUAGE_KEY = 'agriflow_language'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem(LANGUAGE_KEY) === 'hi' ? 'hi' : 'en')

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    if (localStorage.getItem(LANGUAGE_KEY)) return
    getMyProfile(token).then((profile) => {
      if (profile.language === 'hi' || profile.language === 'en') setLanguageState(profile.language)
    }).catch(() => undefined)
  }, [token])

  const login = (newToken: string) => setToken(newToken)
  const logout = () => setToken(null)
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
    localStorage.setItem(LANGUAGE_KEY, newLanguage)
  }

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, language, setLanguage, t: (key) => translate(language, key) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
