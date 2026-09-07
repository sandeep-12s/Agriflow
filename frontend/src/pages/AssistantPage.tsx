import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import { sendChatMessage } from '../api/client'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  source?: 'ai' | 'fallback'
}

const STARTER_QUESTIONS = [
  'Should I store my tomatoes?',
  'Where can I sell my wheat?',
  'What can I make from surplus mangoes?',
]

function AssistantPage() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const send = async (text: string) => {
    if (!token || !text.trim()) return
    setError('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const res = await sendChatMessage(token, text, language)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply, source: res.source },
      ])
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        logout()
        navigate('/login')
      } else {
        setError('Could not reach the assistant.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-soil">Ask AgriFlow</h1>
        <div className="flex gap-1 bg-white border border-soil/20 rounded-lg p-1" role="group" aria-label="Response language">
          {(['en', 'hi'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              aria-pressed={language === lang}
              className={`text-sm px-3 py-1 rounded-md transition ${
                language === lang ? 'bg-leaf text-white' : 'text-soil'
              }`}
            >
              {lang === 'en' ? 'English' : 'हिन्दी'}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="bg-white rounded-2xl border border-soil/10 p-4 mb-4 min-h-[300px] flex flex-col gap-3">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-soil/60 mb-3">Try asking:</p>
            <div className="flex flex-col gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-sm text-leaf bg-husk px-3 py-2 rounded-lg hover:bg-leaf/10 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user' ? 'bg-leaf text-white' : 'bg-husk text-soil'
              }`}
            >
              {m.text}
              {m.role === 'assistant' && m.source && (
                <p className="text-[10px] mt-1 opacity-60">
                  {m.source === 'ai' ? 'AI response' : 'Quick answer'}
                </p>
              )}
            </div>
          </div>
        ))}

        {sending && <p className="text-sm text-soil/40">Thinking…</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="assistant-question" className="sr-only">
          Ask a question
        </label>
        <input
          id="assistant-question"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={language === 'hi' ? 'अपना सवाल लिखें…' : 'Ask a question…'}
          className="flex-1 border border-soil/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-leaf/40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-leaf text-white font-medium px-4 py-2 rounded-lg hover:bg-leaf/90 transition disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </Layout>
  )
}

export default AssistantPage
