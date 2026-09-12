import { useState, useEffect, useRef, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ErrorBanner from '../components/ErrorBanner'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { Language, SUPPORTED_LANGUAGES } from '../i18n'
import {
  sendChatMessage,
  analyzeCropImage,
  CropImageAnalysisResponse,
} from '../api/client'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text?: string
  source?: 'ai' | 'fallback'
  imagePreview?: string
  diagnosis?: CropImageAnalysisResponse
}

const STARTER_PROMPTS = [
  { label: '📸 Diagnose Crop Disease from Photo', query: 'analyse this crop' },
  { label: '🌾 Falling Mandi Prices Strategy', query: 'What should I do if prices are falling?' },
  { label: '🍅 Tomato Blight & Leaf Curl Cure', query: 'How to cure tomato blight and leaf curl?' },
  { label: '📦 Potato Cold Storage Guide', query: 'How to store potatoes in cold storage without rotting?' },
  { label: '🏛️ PM-KISAN & Crop Insurance', query: 'How to claim PMFBY crop insurance and PM-KISAN subsidy?' },
]

function AssistantPage() {
  const { token, logout, t, language: preferredLanguage, setLanguage: setAuthLanguage, isAutoLanguage, detectedRegion, autoDetectLanguage } = useAuth()
  const navigate = useNavigate()
  const [language, setLanguage] = useState<Language>(preferredLanguage)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Image upload & camera capture state
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedCropHint, setSelectedCropHint] = useState<string>('Tomato')
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setLanguage(preferredLanguage), [preferredLanguage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, analyzingImage])

  const send = async (text: string) => {
    if (!token || !text.trim()) return
    setError('')
    const userMsgId = Date.now().toString()
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const res = await sendChatMessage(token, text, language)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: res.reply,
          source: res.source,
        },
      ])
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        logout()
        navigate('/login')
      } else {
        setError('Could not reach the assistant. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDiagnoseCropPhoto = async () => {
    if (!token || !selectedImage) return
    setError('')
    setAnalyzingImage(true)
    const userMsgId = Date.now().toString()

    // Append user image card to chat
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: `📸 Analyzing photo of ${selectedCropHint} crop...`,
        imagePreview: selectedImage,
      },
    ])

    try {
      const diagnosis = await analyzeCropImage(
        token,
        selectedImage,
        selectedCropHint,
        language
      )
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          source: 'ai',
          diagnosis,
        },
      ])
      setSelectedImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setError('Could not complete image diagnosis. Please check network connection.')
    } finally {
      setAnalyzingImage(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-soil flex items-center gap-2">
            <span>{t('askAgriFlow')}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-leaf text-white">
              AI Crop Doctor & Advisor
            </span>
          </h1>
          <p className="text-xs text-soil/60 mt-0.5">
            Ask any farming question or take a photo of an infected leaf to diagnose disease and get treatment dosages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {detectedRegion && isAutoLanguage && (
            <span
              className="text-[11px] font-bold text-leaf bg-leaf/10 border border-leaf/25 px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1"
              title={`${t('regionDetected')}: ${detectedRegion.state}`}
            >
              <span>📍</span>
              <span>{detectedRegion.state}</span>
            </span>
          )}

          <div className="flex items-center gap-2 bg-white border border-soil/20 rounded-xl px-3 py-1.5 shadow-xs" role="group" aria-label={t('responseLanguage')}>
            <label htmlFor="assistant-lang-select" className="text-xs font-semibold text-soil/70 flex items-center gap-1 cursor-pointer">
              <span>🌐</span>
              <span className="hidden sm:inline font-bold">{t('responseLanguage')}:</span>
            </label>
            <select
              id="assistant-lang-select"
              value={isAutoLanguage ? 'auto' : language}
              onChange={(e) => {
                if (e.target.value === 'auto') {
                  autoDetectLanguage().then((res) => {
                    setLanguage(res.language)
                  })
                } else {
                  const newLang = e.target.value as Language
                  setLanguage(newLang)
                  setAuthLanguage(newLang, true)
                }
              }}
              className="text-xs font-bold text-soil bg-transparent border-none outline-none cursor-pointer pr-1"
            >
              <option value="auto">
                📍 {t('autoDetectRegion')}{detectedRegion ? ` (${detectedRegion.state})` : ''}
              </option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.nativeName} ({lang.label})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Main Chat Stream */}
      <div className="bg-white rounded-3xl border border-soil/10 p-4 md:p-6 mb-4 min-h-[420px] max-h-[620px] overflow-y-auto flex flex-col gap-4 shadow-xs">
        {messages.length === 0 && (
          <div className="my-auto py-6 text-center max-w-xl mx-auto">
            <span className="text-4xl mb-2 block">🌾</span>
            <h2 className="text-base font-bold text-soil mb-1">
              {language === 'en'
                ? 'Welcome to AgriFlow Agricultural Advisor'
                : `${t('askAgriFlow')} - AI फसल सलाहकार`}
            </h2>
            <p className="text-xs text-soil/60 mb-5">
              {language === 'en'
                ? 'Diagnose crop diseases, get fertilizer dosages, or explore mandi selling strategies.'
                : 'रोग नियंत्रण, खाद की सही मात्रा, फसल की फोटो से जांच या मंडी भाव के बारे में पूछें।'}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.query === 'analyse this crop') {
                      fileInputRef.current?.click()
                    } else {
                      send(item.query)
                    }
                  }}
                  className="text-xs font-semibold text-leaf bg-leaf/10 border border-leaf/20 px-3.5 py-2 rounded-xl hover:bg-leaf hover:text-white transition shadow-xs"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-4 text-xs md:text-sm shadow-xs ${
                m.role === 'user'
                  ? 'bg-leaf text-white'
                  : 'bg-husk/50 border border-soil/10 text-soil'
              }`}
            >
              {/* Optional User Image Thumbnail */}
              {m.imagePreview && (
                <div className="mb-2.5 rounded-2xl overflow-hidden border border-white/20 max-w-[220px]">
                  <img
                    src={m.imagePreview}
                    alt="Uploaded Crop"
                    className="w-full h-36 object-cover"
                  />
                </div>
              )}

              {/* Text Message with Clean Paragraph Formatting */}
              {m.text && (
                <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                  {m.text}
                </div>
              )}

              {/* AI Vision Crop Diagnosis Card */}
              {m.diagnosis && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-soil/10">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-soil/50 block">
                        Diagnostic Result · {m.diagnosis.confidence_pct}% Confidence
                      </span>
                      <h3 className="font-black text-soil text-base md:text-lg">
                        {m.diagnosis.condition}
                      </h3>
                      <p className="text-xs text-soil/70 font-semibold">
                        Crop: {m.diagnosis.crop_name}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        m.diagnosis.severity === 'Severe'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : m.diagnosis.severity === 'Moderate'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      ● {m.diagnosis.severity}
                    </span>
                  </div>

                  {m.diagnosis.summary && (
                    <p className="text-xs text-soil/80 bg-white/70 p-2.5 rounded-xl border border-soil/10 italic">
                      "{m.diagnosis.summary}"
                    </p>
                  )}

                  <div className="space-y-2 text-xs">
                    <div className="bg-white p-3 rounded-2xl border border-soil/10">
                      <span className="font-bold text-soil flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                        <span>🔍</span> Observed Symptoms
                      </span>
                      <p className="text-soil/80 leading-relaxed">{m.diagnosis.symptoms}</p>
                    </div>

                    <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/60">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                        <span>🧪</span> Recommended Chemical Treatment (Dosage)
                      </span>
                      <p className="text-emerald-900 font-medium leading-relaxed">
                        {m.diagnosis.chemical_treatment}
                      </p>
                    </div>

                    <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/60">
                      <span className="font-bold text-amber-950 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                        <span>🌿</span> Organic & Natural Remedy
                      </span>
                      <p className="text-amber-900 leading-relaxed">
                        {m.diagnosis.organic_remedy}
                      </p>
                    </div>

                    <div className="bg-soil/5 p-3 rounded-2xl border border-soil/10">
                      <span className="font-bold text-soil flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                        <span>🛡️</span> Prevention & Cultural Practices
                      </span>
                      <p className="text-soil/70 leading-relaxed">{m.diagnosis.prevention}</p>
                    </div>
                  </div>
                </div>
              )}

              {m.role === 'assistant' && m.source && !m.diagnosis && (
                <p className="text-[10px] mt-2 opacity-60 font-semibold">
                  {m.source === 'ai' ? t('aiResponse') : t('quickAnswer')}
                </p>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-husk/50 border border-soil/10 rounded-2xl px-4 py-2.5 text-xs text-soil/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-leaf animate-ping"></span>
              <span>{t('thinking')}</span>
            </div>
          </div>
        )}

        {analyzingImage && (
          <div className="flex justify-start">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-center gap-3">
              <LoadingSpinner label="AI Plant Pathologist is analyzing crop foliage and symptoms..." />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Photo Pending Analysis Drawer */}
      {selectedImage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 mb-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src={selectedImage}
                alt="Selected crop"
                className="w-16 h-16 rounded-2xl object-cover border border-emerald-300 shadow-xs"
              />
              <div>
                <span className="text-xs font-black text-emerald-950 block">
                  Photo Ready for Disease Diagnosis
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-emerald-800 font-semibold">Crop:</span>
                  <select
                    value={selectedCropHint}
                    onChange={(e) => setSelectedCropHint(e.target.value)}
                    className="text-xs font-bold border border-emerald-300 rounded-lg px-2 py-0.5 bg-white text-emerald-900"
                  >
                    <option value="Tomato">Tomato (टमाटर)</option>
                    <option value="Potato">Potato (आलू)</option>
                    <option value="Wheat">Wheat (गेहूं)</option>
                    <option value="Chilli">Chilli (मिर्च)</option>
                    <option value="Onion">Onion (प्याज)</option>
                    <option value="Mustard">Mustard (सरसों)</option>
                    <option value="Rice">Rice / Paddy (धान)</option>
                    <option value="Other">Other / General Crop</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-xs font-bold text-soil/60 hover:text-soil px-3 py-2"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                onClick={handleDiagnoseCropPhoto}
                disabled={analyzingImage}
                className="px-4 py-2.5 rounded-xl bg-leaf text-white font-bold text-xs hover:bg-leaf/90 transition shadow-xs flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span>Diagnose Crop Disease Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for camera / file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelected}
        className="hidden"
      />

      {/* Chat & Photo Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Take Photo or Upload Crop Image"
          className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-white border border-leaf/40 text-leaf hover:bg-leaf/5 transition font-bold text-xs shadow-xs shrink-0"
        >
          <span className="text-base">📸</span>
          <span className="hidden sm:inline">Take Photo</span>
        </button>

        <label htmlFor="assistant-question" className="sr-only">
          {t('askQuestion')}
        </label>
        <input
          id="assistant-question"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            language === 'hi'
              ? 'फसल, खाद, रोग या मंडी भाव के बारे में पूछें…'
              : 'Ask about crop health, fertilizers, diseases, or prices…'
          }
          className="flex-1 border border-soil/20 rounded-2xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-leaf/30 bg-white shadow-xs"
        />

        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-leaf text-white font-bold px-5 py-3 rounded-2xl hover:bg-leaf/90 transition disabled:opacity-50 text-xs md:text-sm shadow-xs shrink-0"
        >
          {t('send')} ➔
        </button>
      </form>
    </Layout>
  )
}

export default AssistantPage
