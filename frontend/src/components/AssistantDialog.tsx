import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { sendChatMessage, analyzeCropImage, CropImageAnalysisResponse } from '../api/client'
import { speakText, stopSpeech } from '../services/voice'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text?: string
  imagePreview?: string | null
  diagnosis?: CropImageAnalysisResponse
}

interface AssistantDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function AssistantDialog({ isOpen, onClose }: AssistantDialogProps) {
  const { token, language } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        language === 'hi'
          ? 'नमस्ते किसान साथी! 🙏 मैं आपका AgriFlow किसान डॉक्टर हूँ। अपनी फसल, रोग, खाद, सिंचाई, मौसम या मंडी भाव के बारे में पूछें, या नीचे कैमरा बटन से ग्रसित पत्ते की फोटो भेजें।'
          : 'Namaste Farmer! 🙏 I am your AgriFlow Kisan Doctor. Ask me about crop diseases, fertilizers, irrigation, weather, or mandi prices, or upload a leaf photo for instant diagnosis.',
    },
  ])
  const [sending, setSending] = useState(false)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [isOpen, messages, sending, analyzingImage])

  if (!isOpen) return null

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

    // Case 1: Image diagnosis
    if (selectedImage) {
      setAnalyzingImage(true)
      const userMsgId = Date.now().toString()
      const questionText = textToSend || (language === 'hi' ? '📸 इस पौधे / पत्ते की फोटो की जांच करें' : '📸 Please diagnose this crop leaf photo')

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
      setSelectedImage(null)
      setInput('')
      if (fileInputRef.current) fileInputRef.current.value = ''

      try {
        const diagnosis = await analyzeCropImage(token, imgData, undefined, language, textToSend || undefined)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            diagnosis,
          },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: language === 'hi' ? 'क्षमा करें, फोटो की जांच पूरी नहीं हो सकी। कृपया इंटरनेट कनेक्शन जांचें।' : 'Could not complete photo diagnosis. Please check your connection.',
          },
        ])
      } finally {
        setAnalyzingImage(false)
      }
      return
    }

    // Case 2: Text question
    if (!textToSend) return
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
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: language === 'hi' ? 'जवाब प्राप्त करने में समस्या आई। कृपया पुनः प्रयास करें।' : 'Could not fetch response. Please try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleSpeak = (msgId: string, text: string) => {
    if (speakingId === msgId) {
      stopSpeech()
      setSpeakingId(null)
      return
    }
    setSpeakingId(msgId)
    speakText(
      text,
      language,
      true,
      () => setSpeakingId(null),
      () => setSpeakingId(null)
    )
  }

  const QUICK_PROMPTS = [
    { label: language === 'hi' ? '🍅 टमाटर में कीट/झुलसा' : '🍅 Tomato pests & blight', query: language === 'hi' ? 'टमाटर में फल छेदक इल्ली और झुलसा की दवा' : 'Tomato fruit borer and blight treatment' },
    { label: language === 'hi' ? '🌾 गेहूं में खाद का समय' : '🌾 Wheat fertilizer dose', query: language === 'hi' ? 'गेहूं में यूरिया और डीएपी डालने का सही समय' : 'Best fertilizer and urea schedule for wheat' },
    { label: language === 'hi' ? '🧅 प्याज में थ्रिप्स' : '🧅 Onion thrips remedy', query: language === 'hi' ? 'प्याज में थ्रिप्स कीट और बैंगनी धब्बा का इलाज' : 'Onion thrips and purple blotch remedy' },
    { label: language === 'hi' ? '💰 मंडी भाव रणनीति' : '💰 Mandi selling strategy', query: language === 'hi' ? 'मंडी में अच्छा भाव पाने और सही समय पर बेचने की सलाह' : 'How to get best mandi rates and avoid distress sales' },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-dialog-title"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-5rem)] rounded-2xl shadow-2xl border-2 border-emerald-700/20 bg-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-900 text-white p-3.5 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-xs">
            👨‍🌾
          </div>
          <div>
            <h2 id="assistant-dialog-title" className="font-bold text-sm leading-tight flex items-center gap-1.5">
              <span>{language === 'hi' ? 'किसान डॉक्टर' : 'Kisan Doctor AI'}</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
            </h2>
            <p className="text-[11px] text-emerald-100/80 leading-none mt-0.5">
              {language === 'hi' ? 'कृषि रोग निदान एवं विशेषज्ञ सलाह' : 'Plant Pathology & Advisory'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 text-white flex items-center justify-center text-base transition font-bold"
            title={language === 'hi' ? 'बंद करें' : 'Close'}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-gradient-to-b from-sand/20 to-white text-xs">
        {messages.map((m) => {
          const isUser = m.role === 'user'
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              {/* User Image Thumbnail */}
              {m.imagePreview && (
                <div className="mb-1.5 rounded-xl overflow-hidden border border-soil/20 max-w-[200px] shadow-xs">
                  <img src={m.imagePreview} alt="Uploaded plant preview" className="w-full h-auto object-cover max-h-36" />
                </div>
              )}

              {/* Text Message Bubble */}
              {m.text && (
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-emerald-700 text-white rounded-tr-xs font-medium'
                      : 'bg-white border border-soil/15 text-soil rounded-tl-xs'
                  }`}
                >
                  {m.text}
                </div>
              )}

              {/* Crop Diagnostic Card */}
              {m.diagnosis && (
                <div className="w-full max-w-[94%] bg-white rounded-xl border border-soil/15 p-3.5 shadow-sm space-y-2 mt-1">
                  <div className="flex items-center justify-between border-b border-soil/10 pb-2">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {m.diagnosis.crop_name}
                    </span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md">
                      {m.diagnosis.confidence_pct}% Confidence
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-soil">{m.diagnosis.condition}</h3>
                  <p className="text-[11px] text-soil/75 italic">{m.diagnosis.summary}</p>

                  {m.diagnosis.chemical_treatment && m.diagnosis.chemical_treatment !== 'None required.' && (
                    <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-2 text-[11px]">
                      <span className="font-bold text-rose-900 block mb-0.5">
                        💊 {language === 'hi' ? 'रासायनिक दवा:' : 'Chemical Remedy:'}
                      </span>
                      <span className="text-rose-800">{m.diagnosis.chemical_treatment}</span>
                    </div>
                  )}

                  {m.diagnosis.organic_remedy && m.diagnosis.organic_remedy !== 'None required.' && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2 text-[11px]">
                      <span className="font-bold text-emerald-900 block mb-0.5">
                        🌿 {language === 'hi' ? 'जैविक उपाय:' : 'Organic Remedy:'}
                      </span>
                      <span className="text-emerald-800">{m.diagnosis.organic_remedy}</span>
                    </div>
                  )}

                  {m.diagnosis.prevention && (
                    <div className="text-[11px] text-soil/70 pt-1 border-t border-soil/10">
                      <span className="font-semibold text-soil/90">🛡️ {language === 'hi' ? 'बचाव सलाह: ' : 'Prevention: '}</span>
                      {m.diagnosis.prevention}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Listen Button for assistant message */}
              {!isUser && (m.text || m.diagnosis) && (
                <button
                  onClick={() => handleSpeak(m.id, m.text || `${m.diagnosis?.condition}. ${m.diagnosis?.summary}. ${m.diagnosis?.chemical_treatment}`)}
                  className="mt-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/50"
                >
                  <span>{speakingId === m.id ? '⏹️' : '🔊'}</span>
                  <span>{speakingId === m.id ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'सुनें' : 'Listen')}</span>
                </button>
              )}
            </div>
          )
        })}

        {/* Loading indicators */}
        {(sending || analyzingImage) && (
          <div className="flex items-center gap-2 text-soil/60 text-xs italic p-2 bg-white/80 rounded-xl border border-soil/10 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span>{analyzingImage ? (language === 'hi' ? 'चित्र की जांच हो रही है...' : 'Diagnosing image...') : (language === 'hi' ? 'किसान डॉक्टर सोच रहे हैं...' : 'Consulting pathology database...')}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-1.5 bg-sand/30 border-t border-soil/10 flex gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.query)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300/80 hover:bg-emerald-50 transition shadow-2xs"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Selected Image Preview before sending */}
      {selectedImage && (
        <div className="px-3 py-2 bg-emerald-50/80 border-t border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={selectedImage} alt="Preview thumbnail" className="w-9 h-9 rounded-lg object-cover border border-emerald-300" />
            <span className="text-[11px] font-bold text-emerald-900">
              {language === 'hi' ? 'फोटो तैयार है' : 'Image attached'}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedImage(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="text-xs text-rose-700 font-bold hover:underline"
          >
            ✕ {language === 'hi' ? 'हटाएं' : 'Remove'}
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2.5 bg-white border-t border-soil/15 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleImageSelected}
          className="hidden"
          id="assistant-dialog-file-input"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 rounded-xl border border-soil/20 hover:border-emerald-600 hover:bg-emerald-50 flex items-center justify-center text-lg text-soil transition"
          title={language === 'hi' ? 'पत्ते या पौधे की फोटो खींचें' : 'Take photo / Upload crop image'}
        >
          📸
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
          placeholder={language === 'hi' ? 'फसल, रोग, खाद या भाव पूछें...' : 'Ask crop doctor or disease...'}
          className="flex-1 bg-sand/30 border border-soil/20 rounded-xl px-3 py-2 text-xs font-semibold text-soil placeholder:text-soil/40 outline-none focus:border-emerald-600 focus:bg-white transition"
        />

        <button
          onClick={() => handleSend()}
          disabled={sending || analyzingImage || (!input.trim() && !selectedImage)}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center"
        >
          {language === 'hi' ? 'भेजें →' : 'Send →'}
        </button>
      </div>
    </div>
  )
}
