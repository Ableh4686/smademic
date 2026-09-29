import { useState } from "react"
import Login from "./Login"
import Dashboard from "./Dashboard"
import LecturerDashboard from "./LecturerDashboard"
import AdminDashboard from "./AdminDashboard"

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  const handleLogin = (data) => {
    setToken(data.token)
    setUser({ name: data.name, role: data.role, email: data.email })
  }

  const handleLogout = () => { setUser(null); setToken(null) }

  if (!user) return <Login onLogin={handleLogin} />

  if (user.role === "admin") return <AdminDashboard user={user} token={token} onLogout={handleLogout} />
  if (user.role === "lecturer") return <LecturerDashboard user={user} token={token} onLogout={handleLogout} />
  return <Dashboard user={user} token={token} onLogout={handleLogout} />
}

export default App