import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { getMyProfile, FarmerProfile } from '../api/client'
import { Language, translate } from '../i18n'
import { detectRegionAndLanguage } from '../utils/regionLanguage'

export interface DetectedRegionInfo {
  state: string
  district?: string
  nativeName?: string
}

interface AuthContextValue {
  token: string | null
  user: FarmerProfile | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
  language: Language
  setLanguage: (language: Language, manual?: boolean) => void
  isAutoLanguage: boolean
  detectedRegion: DetectedRegionInfo | null
  autoDetectLanguage: (customOpts?: { coords?: { latitude: number; longitude: number }; location?: string }) => Promise<{ state: string; language: Language; nativeName: string }>
  t: (key: Parameters<typeof translate>[1]) => string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'agriflow_token'
const LANGUAGE_KEY = 'agriflow_language'
const MANUAL_LANG_KEY = 'agriflow_language_manual'
const DETECTED_REGION_KEY = 'agriflow_detected_region'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<FarmerProfile | null>(null)
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY) as Language
    return saved || 'hi'
  })
  const [isAutoLanguage, setIsAutoLanguage] = useState<boolean>(() => {
    return localStorage.getItem(MANUAL_LANG_KEY) !== 'true'
  })
  const [detectedRegion, setDetectedRegion] = useState<DetectedRegionInfo | null>(() => {
    try {
      const saved = localStorage.getItem(DETECTED_REGION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const autoDetectLanguage = useCallback(async (customOpts?: { coords?: { latitude: number; longitude: number }; location?: string }) => {
    let opts = customOpts

    // If no custom options provided, try user.location first, or browser geolocation
    if (!opts) {
      if (user?.location) {
        opts = { location: user.location }
      } else if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 4500,
            })
          })
          opts = { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }
        } catch {
          // Geolocation was denied or timed out
        }
      }
    }

    const res = await detectRegionAndLanguage({
      coords: opts?.coords,
      locationText: opts?.location,
    })

    setLanguageState(res.language)
    const regInfo: DetectedRegionInfo = { state: res.state, district: res.district, nativeName: res.nativeName }
    setDetectedRegion(regInfo)
    setIsAutoLanguage(true)
    localStorage.setItem(LANGUAGE_KEY, res.language)
    localStorage.setItem(DETECTED_REGION_KEY, JSON.stringify(regInfo))
    localStorage.removeItem(MANUAL_LANG_KEY)

    return res
  }, [user?.location])

  // On initial mount, auto-detect region language if user hasn't manually overridden it
  useEffect(() => {
    const isManual = localStorage.getItem(MANUAL_LANG_KEY) === 'true'
    if (!isManual) {
      autoDetectLanguage().catch(() => {})
    }
  }, [autoDetectLanguage])

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      getMyProfile(token).then((profile) => {
        setUser(profile)
        const isManual = localStorage.getItem(MANUAL_LANG_KEY) === 'true'
        if (!isManual && profile.location) {
          autoDetectLanguage({ location: profile.location }).catch(() => {})
        } else if (profile.language && isManual) {
          setLanguageState(profile.language as Language)
        }
      }).catch(() => {
        setUser(null)
      })
    } else {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [token, autoDetectLanguage])

  const login = (newToken: string) => setToken(newToken)
  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const setLanguage = (newLanguage: Language, manual = true) => {
    setLanguageState(newLanguage)
    localStorage.setItem(LANGUAGE_KEY, newLanguage)
    if (manual) {
      setIsAutoLanguage(false)
      localStorage.setItem(MANUAL_LANG_KEY, 'true')
    } else {
      setIsAutoLanguage(true)
      localStorage.removeItem(MANUAL_LANG_KEY)
    }
  }

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAuthenticated: !!token,
      login,
      logout,
      language,
      setLanguage,
      isAutoLanguage,
      detectedRegion,
      autoDetectLanguage,
      t: (key) => translate(language, key),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

