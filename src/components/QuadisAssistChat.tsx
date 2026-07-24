import { useState, useRef, useEffect } from 'react'


interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsInvoked?: string[]
  handoffTriggered?: boolean
}

const QUICK_SUGGESTIONS = [
  'Rooms in Sector 51 Noida',
  'Hold a Deluxe Room for 15 mins',
  'Banquet RFP for 200 guests',
  'Status of QD-1234',
  'Connect with Human Manager',
]

export default function QuadisAssistChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 *Welcome to Quadis Assist!* I am your personal AI Concierge for our 10 luxury properties across Noida and New Delhi.\n\nHow may I elevate your stay today?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, loading])

  const handleSend = async (textToSend?: string) => {
    const text = textToSend ?? input
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      await new Promise(r => setTimeout(r, 1500))

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: 'Thank you for your message! Our AI backend is currently offline for maintenance, but please feel free to use the Contact page or call us directly at +91 92173 73532.',
        },
      ])
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)',
            color: '#c9a86a',
            border: '1.5px solid rgba(201, 168, 106, 0.4)',
            borderRadius: '9999px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(201, 168, 106, 0.2)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '0.95rem',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(201, 168, 106, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(201, 168, 106, 0.2)'
          }}
        >
          <span style={{ fontSize: '1.2rem', animation: 'pulse 2s infinite' }}>✨</span>
          <span>Quadis Assist AI</span>
        </button>
      )}

      {/* Glassmorphic AI Drawer / Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '380px',
            maxWidth: 'calc(100vw - 40px)',
            height: '560px',
            maxHeight: 'calc(100vh - 120px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#12100e',
            backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(201, 168, 106, 0.08) 0%, transparent 60%)',
            border: '1px solid rgba(201, 168, 106, 0.3)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(201, 168, 106, 0.15)',
            overflow: 'hidden',
            fontFamily: 'inherit',
          }}
        >
          {/* Header Panel */}
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(201, 168, 106, 0.15)',
                  border: '1px solid rgba(201, 168, 106, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c9a86a',
                  fontSize: '1rem',
                }}
              >
                ✨
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 700, letterSpacing: '0.3px' }}>
                  Quadis Assist
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>
                    Agentic AI Online
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '1.4rem',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages Container */}
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {m.toolsInvoked && m.toolsInvoked.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      fontSize: '0.68rem',
                      color: '#c9a86a',
                      backgroundColor: 'rgba(201, 168, 106, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      alignSelf: 'flex-start',
                      border: '1px solid rgba(201, 168, 106, 0.2)',
                    }}
                  >
                    ⚡ Tool: {m.toolsInvoked.join(', ')}
                  </div>
                )}

                {m.handoffTriggered && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    🚨 Human Manager Alert Dispatched
                  </div>
                )}

                <div
                  style={{
                    padding: '0.75rem 0.95rem',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: m.role === 'user' ? '#c9a86a' : '#1c1917',
                    color: m.role === 'user' ? '#0c0a09' : '#e7e5e4',
                    border: m.role === 'assistant' ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.6rem 1rem',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: '#1c1917',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#c9a86a',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>🤖 Quadis Assist is thinking</span>
                <span className="dot-pulse">...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Pills */}
          <div
            style={{
              padding: '0.5rem 0.8rem',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {QUICK_SUGGESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={loading}
                style={{
                  flexShrink: 0,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(201, 168, 106, 0.1)',
                  border: '1px solid rgba(201, 168, 106, 0.25)',
                  color: '#c9a86a',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#1c1917',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="text"
              placeholder="Ask anything or check availability..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.6rem 0.9rem',
                borderRadius: '9999px',
                backgroundColor: '#0c0a09',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#c9a86a',
                color: '#0c0a09',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
