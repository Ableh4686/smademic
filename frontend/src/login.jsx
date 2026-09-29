import { useState } from "react"
import api from "./api"

function Login({ onLogin }) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setError("")
        setLoading(true)
        try {
            const res = await api.post("/api/auth/login", { email, password })
            onLogin({
                token: res.data.token,
                name: res.data.name,
                role: res.data.role,
                email: res.data.email
            })
        } catch (err) {
            setError("Email or password doesn't match our records")
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin() }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.lockRow}>
                    <span style={styles.lockDot} />
                    <span style={{ ...styles.lockDot, animationDelay: "0.15s" }} />
                    <span style={{ ...styles.lockDot, animationDelay: "0.3s" }} />
                </div>
                <h1 style={styles.title}>SMADEMIC</h1>
                <p style={styles.subtitle}>Academic performance, tracked and explained.</p>

                {error && <div style={styles.errorBox}>{error}</div>}

                <div style={styles.field}>
                    <label style={styles.label}>Email</label>
                    <input
                        type="email"
                        placeholder="you@university.edu"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={styles.input}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Password</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={styles.input}
                    />
                </div>

                <button onClick={handleLogin} disabled={loading} style={styles.button}>
                    {loading ? "Signing in…" : "Sign in"}
                </button>
            </div>

            <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </div>
    )
}

const styles = {
    page: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 30% 20%, #1a2130 0%, #10141B 60%)",
    },
    card: {
        width: 380,
        background: "var(--panel)",
        border: "1px solid var(--panel-border)",
        borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    },
    lockRow: { display: "flex", gap: 8, marginBottom: 20 },
    lockDot: {
        width: 8, height: 8, borderRadius: "50%",
        background: "var(--accent)",
        animation: "pulseDot 1.6s ease-in-out infinite",
    },
    title: {
        fontSize: 28, fontWeight: 800, color: "var(--text)",
        letterSpacing: "-0.02em", marginBottom: 6,
    },
    subtitle: { color: "var(--muted)", fontSize: 14, marginBottom: 28 },
    errorBox: {
        background: "var(--risk-bg)", color: "var(--risk)",
        fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 20,
    },
    field: { marginBottom: 18 },
    label: {
        display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)",
        marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
    },
    input: {
        width: "100%", padding: "11px 14px", borderRadius: 8,
        border: "1px solid var(--panel-border)", background: "#12171F",
        color: "var(--text)", fontSize: 14, outline: "none",
    },
    button: {
        width: "100%", padding: "12px", borderRadius: 8, border: "none",
        background: "var(--accent)", color: "#0B0E13", fontWeight: 700,
        fontSize: 14, marginTop: 8,
    },
}

export default Login