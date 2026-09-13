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
  const [selectedCropHint, setSelectedCropHint] = useState<string>('')
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setLanguage(preferredLanguage), [preferredLanguage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, analyzingImage])

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : input).trim()
    if (!token) return

    // Case 1: Image is attached -> Send multimodal image + question
    if (selectedImage) {
      setError('')
      setAnalyzingImage(true)
      const userMsgId = Date.now().toString()
      const questionText = textToSend || (
        selectedCropHint
          ? (language === 'hi' ? `📸 इस ${selectedCropHint} की फोटो की जांच करें और दवा बताएं` : `📸 Please diagnose this ${selectedCropHint} photo and recommend treatment`)
          : (language === 'hi' ? '📸 इस पौधे / पत्ते की फोटो की जांच करें और समस्या व उपचार बताएं' : '📸 Please diagnose this crop / plant photo and recommend treatment')
      )

      // Append user message with image and question
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          text: questionText,
          imagePreview: selectedImage,
        },
      ])

      const imgData = selectedImage
      const cropHint = selectedCropHint ? selectedCropHint : undefined
      setSelectedImage(null)
      setSelectedCropHint('')
      setInput('')
      if (fileInputRef.current) fileInputRef.current.value = ''

      try {
        const diagnosis = await analyzeCropImage(
          token,
          imgData,
          cropHint,
          language,
          textToSend || undefined
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
      } catch {
        setError('Could not complete image diagnosis. Please check network connection.')
      } finally {
        setAnalyzingImage(false)
      }
      return
    }

    // Case 2: Regular text message
    if (!textToSend) return
    setError('')
    const userMsgId = Date.now().toString()
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: textToSend }])
    setInput('')
    setSending(true)
    try {
      const res = await sendChatMessage(token, textToSend, language)
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSend()
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
                      handleSend(item.query)
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
              {m.diagnosis && m.diagnosis.is_crop === false && (
                <div className="bg-rose-50 border-2 border-dashed border-rose-300 p-4 rounded-2xl text-soil mt-2">
                  <div className="flex items-center gap-2 mb-2 text-rose-700 font-bold text-sm">
                    <span className="text-xl">⚠️</span>
                    <span>{m.diagnosis.condition || 'Not a Crop Photo / फसल का चित्र नहीं है'}</span>
                  </div>
                  <p className="text-xs text-soil/80 leading-relaxed bg-white/70 p-3 rounded-xl border border-rose-200/60 mb-2">
                    {m.diagnosis.summary}
                  </p>
                  <div className="text-[11px] text-rose-800 bg-rose-100/70 p-2.5 rounded-xl border border-rose-200">
                    💡 <strong>कृषि सलाह / Note:</strong> कृपया केवल अपनी फसल, पत्ते, पौधे, तने या उपज की साफ फोटो अपलोड करें ताकि किसान डॉक्टर सही बीमारी और उचित उपचार बता सके।
                  </div>
                </div>
              )}

              {m.diagnosis && m.diagnosis.is_crop !== false && (
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

      {/* Selected Photo Attachment Chip */}
      {selectedImage && (
        <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-3 mb-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src={selectedImage}
                alt="Selected crop"
                className="w-14 h-14 rounded-xl object-cover border border-emerald-400/60 shadow-xs"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-950">
                    📸 {language === 'hi' ? 'फोटो संलग्न है' : 'Photo Attached'}
                  </span>
                  <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                    {language === 'hi' ? 'सवाल लिखकर भेजें' : 'Add custom query or send'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    {language === 'hi' ? 'फसल:' : 'Crop:'}
                  </span>
                  <select
                    value={selectedCropHint}
                    onChange={(e) => setSelectedCropHint(e.target.value)}
                    className="text-xs font-bold border border-emerald-300 rounded-lg px-2 py-0.5 bg-white text-emerald-900"
                  >
                    <option value="Tomato">Tomato (टमाटर)</option>
                    <option value="Potato">Potato (आलू)</option>
                    <option value="Wheat">Wheat (गेहूं)</option>
                    <option value="Rose">Rose / Floral (गुलाब / फूल)</option>
                    <option value="Chilli">Chilli (मिर्च)</option>
                    <option value="Onion">Onion (प्याज)</option>
                    <option value="Mustard">Mustard (सरसों)</option>
                    <option value="Rice">Rice / Paddy (धान)</option>
                    <option value="Cotton">Cotton (कपास)</option>
                    <option value="Other">Other / General Crop</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedImage(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="text-xs font-bold text-soil/60 hover:text-rose-700 bg-white border border-soil/15 px-2.5 py-1.5 rounded-lg transition"
            >
              ✕ {language === 'hi' ? 'फोटो हटाएं' : 'Remove Photo'}
            </button>
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

      {/* Unified Chat & Photo Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={language === 'hi' ? 'कैमरा या गैलरी से फोटो जोड़ें' : 'Take Photo or Attach Crop Image'}
          className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-white border border-leaf/40 text-leaf hover:bg-leaf/5 transition font-bold text-xs shadow-xs shrink-0"
        >
          <span className="text-base">📸</span>
          <span className="hidden sm:inline">{language === 'hi' ? 'फोटो लें' : 'Take Photo'}</span>
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
            selectedImage
              ? (language === 'hi'
                  ? 'इस फोटो के बारे में अपना सवाल लिखें (जैसे: क्या बीमारी है और दवा बताएं)…'
                  : 'Type what you want to ask about this photo (or send to diagnose)…')
              : (language === 'hi'
                  ? 'फसल, खाद, रोग या मंडी भाव के बारे में पूछें…'
                  : 'Ask about crop health, fertilizers, diseases, or prices…')
          }
          className="flex-1 border border-soil/20 rounded-2xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-leaf/30 bg-white shadow-xs"
        />

        <button
          type="submit"
          disabled={sending || analyzingImage || (!input.trim() && !selectedImage)}
          className="bg-leaf text-white font-bold px-5 py-3 rounded-2xl hover:bg-leaf/90 transition disabled:opacity-50 text-xs md:text-sm shadow-xs shrink-0"
        >
          {analyzingImage
            ? (language === 'hi' ? 'जांच जारी है…' : 'Diagnosing…')
            : sending
            ? (language === 'hi' ? 'भेज रहे हैं…' : 'Sending…')
            : selectedImage
            ? (language === 'hi' ? 'फोटो + सवाल भेजें ➔' : 'Send Photo & Query ➔')
            : `${t('send')} ➔`}
        </button>
      </form>
    </Layout>
  )
}

export default AssistantPage
