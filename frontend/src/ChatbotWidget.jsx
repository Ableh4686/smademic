import { useState, useRef, useEffect } from "react"
import api from "./api"

const SUGGESTED_QUESTIONS = [
    "What is my overall risk level?",
    "Which subject am I at risk of failing?",
    "How can I improve my attendance?",
    "What should I focus on to pass all subjects?",
    "Am I at risk of being barred from any exam?",
    "How do I improve my coursework score?",
]

const BOT_AVATAR = "🎓"

function TypingIndicator() {
    return (
        <div style={styles.typingRow}>
            <div style={styles.botAvatar}>{BOT_AVATAR}</div>
            <div style={styles.typingBubble}>
                <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                <span style={{ ...styles.dot, animationDelay: "200ms" }} />
                <span style={{ ...styles.dot, animationDelay: "400ms" }} />
            </div>
        </div>
    )
}

export default function ChatbotWidget({ token }) {
    const [open, setOpen]         = useState(false)
    const [messages, setMessages] = useState([
        {
            role: "bot",
            text: "Hi! I'm **SMADEMIC AI**, your personal academic advisor 🎓\n\nI can see your grades, risk scores, and attendance. Ask me anything about your academic performance or pick a question below!",
        }
    ])
    const [input, setInput]       = useState("")
    const [loading, setLoading]   = useState(false)
    const [showSuggested, setShowSuggested] = useState(true)
    const bottomRef               = useRef(null)
    const inputRef                = useRef(null)

    useEffect(() => {
        if (open) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
        }
    }, [messages, open, loading])

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

    const sendMessage = async (text) => {
        const q = (text || input).trim()
        if (!q || loading) return

        setShowSuggested(false)
        setInput("")
        setMessages(prev => [...prev, { role: "user", text: q }])
        setLoading(true)

        try {
            const res = await api.post(
                "/api/chatbot",
                { question: q },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setMessages(prev => [...prev, { role: "bot", text: res.data.response }])
        } catch (err) {
            const serverMsg = err.response?.data?.error
            setMessages(prev => [...prev, {
                role: "bot",
                text: serverMsg
                    ? `⚠️ Error: ${serverMsg}`
                    : "Sorry, I couldn't connect to the server. Please try again in a moment.",
                error: true
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const renderText = (text) => {
        // Simple bold markdown support
        return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i}>{part.slice(2, -2)}</strong>
            }
            return part.split("\n").map((line, j) => (
                <span key={`${i}-${j}`}>{line}{j < part.split("\n").length - 1 && <br />}</span>
            ))
        })
    }

    return (
        <>
            {/* ── Floating Button ── */}
            <button
                id="chatbot-toggle"
                onClick={() => setOpen(o => !o)}
                style={{
                    ...styles.fab,
                    background: open
                        ? "linear-gradient(135deg, #4A6CF7, #6C8EF5)"
                        : "linear-gradient(135deg, #6C8EF5, #9B7FE8)",
                    boxShadow: open
                        ? "0 8px 32px rgba(108,142,245,0.5)"
                        : "0 8px 32px rgba(108,142,245,0.4)",
                }}
                title="Ask SMADEMIC AI"
            >
                <span style={{ fontSize: 22, transition: "transform 0.3s", transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
                    {open ? "✕" : "💬"}
                </span>
                {!open && (
                    <span style={styles.fabPulse} />
                )}
            </button>

            {/* ── Chat Panel ── */}
            <div style={{ ...styles.panel, ...(open ? styles.panelOpen : styles.panelClosed) }}>

                {/* Header */}
                <div style={styles.panelHeader}>
                    <div style={styles.headerLeft}>
                        <div style={styles.headerAvatar}>{BOT_AVATAR}</div>
                        <div>
                            <div style={styles.headerName}>SMADEMIC AI</div>
                            <div style={styles.headerStatus}>
                                <span style={styles.onlineDot} /> Online · Academic Advisor
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        style={styles.closeBtn}
                        title="Close"
                    >✕</button>
                </div>

                {/* Messages */}
                <div style={styles.messagesArea} id="chat-messages">
                    {messages.map((msg, i) => (
                        <div key={i} style={msg.role === "user" ? styles.userRow : styles.botRow}>
                            {msg.role === "bot" && <div style={styles.botAvatar}>{BOT_AVATAR}</div>}
                            <div style={{
                                ...styles.bubble,
                                ...(msg.role === "user" ? styles.userBubble : styles.botBubble),
                                ...(msg.error ? styles.errorBubble : {})
                            }}>
                                {renderText(msg.text)}
                            </div>
                        </div>
                    ))}

                    {loading && <TypingIndicator />}

                    {/* Suggested Questions */}
                    {showSuggested && !loading && (
                        <div style={styles.suggestedSection}>
                            <div style={styles.suggestedLabel}>✨ Suggested questions</div>
                            <div style={styles.suggestedGrid}>
                                {SUGGESTED_QUESTIONS.map((q, i) => (
                                    <button
                                        key={i}
                                        id={`suggested-q-${i}`}
                                        style={styles.suggestedBtn}
                                        onClick={() => sendMessage(q)}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = "rgba(108,142,245,0.18)"
                                            e.currentTarget.style.borderColor = "rgba(108,142,245,0.6)"
                                            e.currentTarget.style.color = "#EEF2F6"
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = "rgba(108,142,245,0.07)"
                                            e.currentTarget.style.borderColor = "rgba(108,142,245,0.22)"
                                            e.currentTarget.style.color = "#8892A0"
                                        }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input bar */}
                <div style={styles.inputArea}>
                    <input
                        ref={inputRef}
                        id="chatbot-input"
                        style={styles.input}
                        placeholder="Ask about your grades, risk, or attendance…"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        disabled={loading}
                    />
                    <button
                        id="chatbot-send"
                        style={{
                            ...styles.sendBtn,
                            opacity: (!input.trim() || loading) ? 0.4 : 1,
                            cursor: (!input.trim() || loading) ? "not-allowed" : "pointer"
                        }}
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        title="Send"
                    >
                        ➤
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes dot-pulse {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40%            { transform: scale(1.0); opacity: 1; }
                }
                @keyframes fab-pulse {
                    0%   { transform: scale(1); opacity: 0.6; }
                    70%  { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                @keyframes chat-open {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)  scale(1); }
                }
                #chatbot-input:focus { outline: none; border-color: rgba(108,142,245,0.6) !important; }
                #chatbot-input:disabled { opacity: 0.5; }
                #chatbot-toggle:hover { transform: scale(1.08) !important; }
            `}</style>
        </>
    )
}

const styles = {
    // FAB
    fab: {
        position: "fixed",
        bottom: 28,
        right: 28,
        width: 58,
        height: 58,
        borderRadius: "50%",
        border: "none",
        color: "#fff",
        fontSize: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 9999,
        transition: "transform 0.2s, box-shadow 0.2s",
    },
    fabPulse: {
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: "rgba(108,142,245,0.4)",
        animation: "fab-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
    },

    // Panel
    panel: {
        position: "fixed",
        bottom: 100,
        right: 28,
        width: 380,
        height: 560,
        background: "#1A2029",
        border: "1px solid #262E3A",
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        zIndex: 9998,
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 4px 16px rgba(108,142,245,0.1)",
        transition: "opacity 0.2s, transform 0.2s",
    },
    panelOpen: {
        opacity: 1,
        transform: "translateY(0) scale(1)",
        pointerEvents: "all",
        animation: "chat-open 0.22s ease",
    },
    panelClosed: {
        opacity: 0,
        transform: "translateY(12px) scale(0.97)",
        pointerEvents: "none",
    },

    // Header
    panelHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        background: "linear-gradient(135deg, rgba(108,142,245,0.15), rgba(155,127,232,0.1))",
        borderBottom: "1px solid #262E3A",
        flexShrink: 0,
    },
    headerLeft: { display: "flex", alignItems: "center", gap: 12 },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #6C8EF5, #9B7FE8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
    },
    headerName: { fontSize: 14, fontWeight: 700, color: "#EEF2F6" },
    headerStatus: { fontSize: 11, color: "#8892A0", display: "flex", alignItems: "center", gap: 5, marginTop: 2 },
    onlineDot: {
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#34D399",
        boxShadow: "0 0 6px rgba(52,211,153,0.6)",
    },
    closeBtn: {
        background: "transparent",
        border: "none",
        color: "#8892A0",
        fontSize: 16,
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: 6,
        lineHeight: 1,
    },

    // Messages
    messagesArea: {
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        scrollbarWidth: "thin",
        scrollbarColor: "#262E3A transparent",
    },
    botRow: { display: "flex", alignItems: "flex-end", gap: 8 },
    userRow: { display: "flex", justifyContent: "flex-end" },
    botAvatar: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #6C8EF5, #9B7FE8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        flexShrink: 0,
    },
    bubble: {
        maxWidth: "78%",
        padding: "10px 14px",
        borderRadius: 14,
        fontSize: 13,
        lineHeight: 1.55,
        wordBreak: "break-word",
    },
    botBubble: {
        background: "#10141B",
        border: "1px solid #262E3A",
        color: "#EEF2F6",
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        background: "linear-gradient(135deg, #6C8EF5, #9B7FE8)",
        color: "#fff",
        borderBottomRightRadius: 4,
    },
    errorBubble: {
        background: "rgba(248,113,113,0.1)",
        border: "1px solid rgba(248,113,113,0.3)",
        color: "#F87171",
    },

    // Typing
    typingRow: { display: "flex", alignItems: "flex-end", gap: 8 },
    typingBubble: {
        background: "#10141B",
        border: "1px solid #262E3A",
        borderRadius: 14,
        borderBottomLeftRadius: 4,
        padding: "12px 16px",
        display: "flex",
        gap: 5,
        alignItems: "center",
    },
    dot: {
        display: "inline-block",
        width: 7,
        height: 7,
        background: "#6C8EF5",
        borderRadius: "50%",
        animation: "dot-pulse 1.2s ease-in-out infinite",
    },

    // Suggested
    suggestedSection: { marginTop: 4 },
    suggestedLabel: { fontSize: 11, color: "#8892A0", marginBottom: 8, fontWeight: 600, letterSpacing: "0.04em" },
    suggestedGrid: { display: "flex", flexDirection: "column", gap: 6 },
    suggestedBtn: {
        background: "rgba(108,142,245,0.07)",
        border: "1px solid rgba(108,142,245,0.22)",
        borderRadius: 10,
        color: "#8892A0",
        fontSize: 12,
        padding: "9px 12px",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.4,
    },

    // Input
    inputArea: {
        display: "flex",
        gap: 8,
        padding: "12px 14px",
        borderTop: "1px solid #262E3A",
        background: "#1A2029",
        flexShrink: 0,
    },
    input: {
        flex: 1,
        background: "#10141B",
        border: "1px solid #262E3A",
        borderRadius: 10,
        color: "#EEF2F6",
        fontSize: 13,
        padding: "10px 14px",
        outline: "none",
        transition: "border-color 0.2s",
    },
    sendBtn: {
        background: "linear-gradient(135deg, #6C8EF5, #9B7FE8)",
        border: "none",
        borderRadius: 10,
        color: "#fff",
        fontSize: 16,
        width: 42,
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "opacity 0.2s",
    },
}
