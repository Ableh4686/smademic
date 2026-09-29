import { useEffect, useState } from "react"
import api from "./api"

function AdminDashboard({ user, token, onLogout }) {
    const [users, setUsers]       = useState([])
    const [subjects, setSubjects] = useState([])
    const [rows, setRows]         = useState([])
    const [loading, setLoading]   = useState(true)
    const [tab, setTab]           = useState("overview")

    // overview search & filter
    const [searchQuery, setSearchQuery]   = useState("")
    const [statusFilter, setStatusFilter] = useState("all")

    // subject edit state
    const [editingSubject, setEditingSubject] = useState(null)

    // enroll
    const [enrollSubject, setEnrollSubject] = useState("")
    const [enrollStudent, setEnrollStudent] = useState("")

    // create user
    const [newName, setNewName]         = useState("")
    const [newEmail, setNewEmail]       = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [newRole, setNewRole]         = useState("student")

    // add/edit subject form
    const [subName, setSubName]         = useState("")
    const [subCode, setSubCode]         = useState("")
    const [subHasFinal, setSubHasFinal] = useState(true)
    const [components, setComponents]   = useState([
        { name: "Coursework", weight: 60 },
        { name: "Final Exam", weight: 40 }
    ])

    const [message, setMessage] = useState("")
    const [error, setError]     = useState("")

    const headers = { Authorization: `Bearer ${token}` }

    // name map
    const nameMap = {}
    users.forEach(u => { nameMap[u.email] = u.name })
    const getName = email => nameMap[email] || email.split("@")[0]

    const loadAll = async () => {
        setLoading(true)
        try {
            const [userRes, subRes, recRes] = await Promise.all([
                api.get("/api/users",    { headers }),
                api.get("/api/subjects", { headers }),
                api.get("/api/records",  { headers }),
            ])
            setUsers(userRes.data)
            setSubjects(subRes.data)
            const subjectMap = {}
            subRes.data.forEach(s => { subjectMap[s._id] = s })
            const enriched = await Promise.all(
                recRes.data.map(async r => {
                    let grade = null
                    try {
                        const g = await api.post("/api/grade",
                            { student_id: r.student_id, subject_id: r.subject_id }, { headers })
                        grade = g.data
                    } catch (e) { }
                    return { ...r, subject: subjectMap[r.subject_id], grade }
                })
            )
            setRows(enriched)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    useEffect(() => { loadAll() }, [])

    const students    = users.filter(u => u.role === "student")
    const atRiskCount = rows.filter(r =>
        r.attendance < 75 || (r.grade && !r.grade.passed && r.grade.status !== "ONGOING")
    ).length

    const clearMsgs = () => { setMessage(""); setError("") }

    // filtered overview
    const filteredRows = rows.filter(r => {
        const q    = searchQuery.toLowerCase()
        const name = getName(r.student_id).toLowerCase()
        const matchSearch = !q || name.includes(q) || r.student_id.toLowerCase().includes(q)
            || r.subject?.name?.toLowerCase().includes(q)
            || r.subject?.code?.toLowerCase().includes(q)
        const isAtRisk = r.attendance < 75 || (r.grade && !r.grade.passed && r.grade.status !== "ONGOING")
        const isOngoing = r.grade?.status === "ONGOING"
        const matchStatus =
            statusFilter === "all" ||
            (statusFilter === "at-risk" && isAtRisk) ||
            (statusFilter === "ongoing" && isOngoing) ||
            (statusFilter === "safe"    && !isAtRisk && !isOngoing)
        return matchSearch && matchStatus
    })

    const handleEnroll = async () => {
        clearMsgs()
        if (!enrollSubject || !enrollStudent) { setError("Select both a subject and a student"); return }
        try {
            await api.post("/api/records",
                { student_id: enrollStudent, subject_id: enrollSubject, marks: {}, attendance: 0 }, { headers })
            setMessage("Student enrolled")
            loadAll()
        } catch (err) { setError(err.response?.data?.error || "Error") }
    }

    const handleCreateUser = async () => {
        clearMsgs()
        if (!newName || !newEmail || !newPassword) { setError("Fill all fields"); return }
        try {
            await api.post("/api/auth/register",
                { name: newName, email: newEmail, password: newPassword, role: newRole })
            setMessage("Account created")
            setNewName(""); setNewEmail(""); setNewPassword("")
            loadAll()
        } catch (err) { setError(err.response?.data?.error || "Error") }
    }

    const handleDeleteUser = async email => {
        if (!window.confirm(`Delete ${email}?`)) return
        try {
            await api.delete(`/api/users/${email}`, { headers })
            loadAll()
        } catch (err) { setError(err.response?.data?.error || "Error") }
    }

    const handleDeleteSubject = async (id, name) => {
        if (!window.confirm(`Delete "${name}"? All linked student records will be removed.`)) return
        try {
            await api.delete(`/api/subjects/${id}`, { headers })
            setMessage(`"${name}" deleted`)
            loadAll()
        } catch (err) { setError(err.response?.data?.error || "Error") }
    }

    const openEditSubject = s => {
        setEditingSubject(s)
        setSubName(s.name);  setSubCode(s.code)
        setSubHasFinal(s.has_final ?? true)
        setComponents(s.components.map(c => ({ ...c })))
        setMessage(""); setError("")
    }

    const cancelEdit = () => {
        setEditingSubject(null); setSubName(""); setSubCode("")
        setSubHasFinal(true)
        setComponents([{ name: "Coursework", weight: 60 }, { name: "Final Exam", weight: 40 }])
    }

    const handleSaveSubject = async () => {
        clearMsgs()
        if (!subName || !subCode) { setError("Name and code required"); return }
        try {
            await api.put(`/api/subjects/${editingSubject._id}`,
                { name: subName, code: subCode, components, has_final: subHasFinal }, { headers })
            setMessage("Subject updated")
            cancelEdit(); loadAll()
        } catch (err) { setError(err.response?.data?.error || "Error") }
    }

    const handleAddSubject = async () => {
        clearMsgs()
        if (!subName || !subCode) { setError("Name and code required"); return }
        try {
            await api.post("/api/subjects",
                { name: subName, code: subCode, components, has_final: subHasFinal }, { headers })
            setMessage("Subject added")
            cancelEdit(); loadAll()
        } catch (err) { setError(err.response?.data?.error || "Error") }
    }

    const updateComp = (i, field, val) =>
        setComponents(p => p.map((c, idx) => idx === i ? { ...c, [field]: field === "weight" ? Number(val) : val } : c))

    if (loading) return <div style={S.loadingPage}><div style={S.loadingText}>Loading system data...</div></div>

    return (
        <div style={S.page}>
            <header style={S.header}>
                <div>
                    <h1 style={S.title}>SMADEMIC - Admin Panel</h1>
                    <p style={S.subtitle}>Welcome, {user.name}</p>
                </div>
                <button onClick={onLogout} style={S.logoutBtn}>Logout</button>
            </header>

            {/* Stats */}
            <div style={S.statRow}>
                <StatCard label="Total Users"     value={users.length}    sub="All roles" />
                <StatCard label="Subjects"        value={subjects.length} sub="Active courses" />
                <StatCard label="Students"        value={students.length} sub="Enrolled learners" />
                <StatCard label="At-Risk Records" value={atRiskCount}     sub="Failing or barred"
                    accent={atRiskCount > 0 ? "var(--risk)" : "var(--safe)"} />
            </div>

            <div style={S.panel}>
                {/* Tabs */}
                <div style={S.tabBar}>
                    {["overview", "users", "subjects", "enroll"].map(t => (
                        <button key={t}
                            onClick={() => { setTab(t); clearMsgs() }}
                            style={{ ...S.tabBtn, ...(tab === t ? S.tabActive : {}) }}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                {error   && <div style={S.errBox}>{error}</div>}
                {message && <div style={S.okBox}>{message}</div>}

                {/* ── OVERVIEW ── */}
                {tab === "overview" && (
                    <div>
                        <div style={S.searchBar}>
                            <div style={S.searchWrap}>
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, email or subject..."
                                    style={S.searchInput}
                                />
                                {searchQuery && <button style={S.clearBtn} onClick={() => setSearchQuery("")}>x</button>}
                            </div>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.filterSel}>
                                <option value="all">All Status</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="safe">Safe / Passed</option>
                                <option value="at-risk">At-Risk / Failed</option>
                            </select>
                            <span style={S.resultCount}>{filteredRows.length} / {rows.length} records</span>
                        </div>

                        <div style={S.tableWrap}>
                            <table style={S.table}>
                                <thead><tr>
                                    <Th>Student</Th><Th>Subject</Th><Th>Attendance</Th>
                                    <Th>Score</Th><Th>Status</Th>
                                </tr></thead>
                                <tbody>
                                    {filteredRows.map((r, i) => {
                                        const isAt = r.attendance < 75 || (r.grade && !r.grade.passed && r.grade.status !== "ONGOING")
                                        const isOn = r.grade?.status === "ONGOING"
                                        return (
                                            <tr key={i}>
                                                <Td>
                                                    <div style={S.nameCell}>{getName(r.student_id)}</div>
                                                    <span style={S.emailLabel}>{r.student_id}</span>
                                                </Td>
                                                <Td>
                                                    <div style={S.nameCell}>{r.subject?.name || r.subject_id}</div>
                                                    <span style={S.emailLabel}>{r.subject?.code}</span>
                                                </Td>
                                                <Td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div style={{ flex: 1, height: 5, background: "#262E3A", borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
                                                            <div style={{ height: "100%", width: `${r.attendance}%`, background: r.attendance >= 75 ? "var(--safe)" : "var(--risk)", borderRadius: 3 }} />
                                                        </div>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: r.attendance >= 75 ? "var(--safe)" : "var(--risk)" }}>{r.attendance}%</span>
                                                    </div>
                                                </Td>
                                                <Td>{r.grade ? `${r.grade.total_marks}%` : "—"}</Td>
                                                <Td>
                                                    <Pill good={!isAt && !isOn} neutral={isOn}>
                                                        {r.grade ? r.grade.status : "Not graded"}
                                                    </Pill>
                                                </Td>
                                            </tr>
                                        )
                                    })}
                                    {filteredRows.length === 0 && <tr><Td colSpan={5} center>No records match your search.</Td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── USERS ── */}
                {tab === "users" && (
                    <div style={S.split}>
                        <div style={S.tableWrap}>
                            <table style={S.table}>
                                <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th></Th></tr></thead>
                                <tbody>
                                    {users.map((u, i) => (
                                        <tr key={i}>
                                            <Td><div style={S.nameCell}>{u.name}</div></Td>
                                            <Td><span style={S.emailLabel}>{u.email}</span></Td>
                                            <Td><span style={S.rolePill}>{u.role}</span></Td>
                                            <Td>{u.role !== "admin" &&
                                                <button style={S.delBtn} onClick={() => handleDeleteUser(u.email)}>Delete</button>}
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={S.card}>
                            <p style={S.cardTitle}>Create user</p>
                            <Field label="Name"><input value={newName} onChange={e => setNewName(e.target.value)} style={S.input} placeholder="Full name" /></Field>
                            <Field label="Email"><input value={newEmail} onChange={e => setNewEmail(e.target.value)} style={S.input} placeholder="email@smademic.com" /></Field>
                            <Field label="Password"><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={S.input} /></Field>
                            <Field label="Role">
                                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={S.input}>
                                    <option value="student">Student</option>
                                    <option value="lecturer">Lecturer</option>
                                </select>
                            </Field>
                            <button style={S.btn} onClick={handleCreateUser}>Create account</button>
                        </div>
                    </div>
                )}

                {/* ── SUBJECTS ── */}
                {tab === "subjects" && (
                    <div style={S.split}>
                        <div style={S.tableWrap}>
                            <table style={S.table}>
                                <thead><tr><Th>Name</Th><Th>Code</Th><Th>Components</Th><Th>Actions</Th></tr></thead>
                                <tbody>
                                    {subjects.map((s, i) => (
                                        <tr key={i} style={editingSubject?._id === s._id ? { background: "rgba(108,142,245,0.05)" } : {}}>
                                            <Td>
                                                <div style={S.nameCell}>{s.name}</div>
                                                {!s.has_final && <span style={{ ...S.emailLabel, color: "var(--accent)" }}>No final exam</span>}
                                            </Td>
                                            <Td><span style={S.codeTag}>{s.code}</span></Td>
                                            <Td>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                    {s.components.map((c, ci) => (
                                                        <span key={ci} style={S.compTag}>{c.name} {c.weight}%</span>
                                                    ))}
                                                </div>
                                            </Td>
                                            <Td>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button style={S.editBtn} onClick={() => openEditSubject(s)}>Edit</button>
                                                    <button style={S.delBtn} onClick={() => handleDeleteSubject(s._id, s.name)}>Delete</button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={S.card}>
                            <p style={S.cardTitle}>{editingSubject ? `Editing: ${editingSubject.name}` : "Add subject"}</p>
                            <Field label="Subject name"><input value={subName} onChange={e => setSubName(e.target.value)} style={S.input} placeholder="e.g. Database Systems" /></Field>
                            <Field label="Subject code"><input value={subCode} onChange={e => setSubCode(e.target.value)} style={S.input} placeholder="e.g. CSC301" /></Field>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                <input type="checkbox" id="hasFinal" checked={subHasFinal} onChange={e => setSubHasFinal(e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                                <label htmlFor="hasFinal" style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Has final exam</label>
                            </div>
                            <p style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Components</p>
                            {components.map((c, i) => (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                    <input value={c.name} onChange={e => updateComp(i, "name", e.target.value)} style={{ ...S.input, flex: 2 }} placeholder="Name" />
                                    <input type="number" value={c.weight} onChange={e => updateComp(i, "weight", e.target.value)} style={{ ...S.input, flex: 1 }} placeholder="%" />
                                    <button style={S.removeBtn} onClick={() => setComponents(p => p.filter((_, idx) => idx !== i))}>x</button>
                                </div>
                            ))}
                            <button style={S.addRowBtn} onClick={() => setComponents(p => [...p, { name: "", weight: 0 }])}>+ Add component</button>
                            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                                {editingSubject ? (
                                    <>
                                        <button style={{ ...S.btn, flex: 1 }} onClick={handleSaveSubject}>Save changes</button>
                                        <button style={{ ...S.btn, flex: 1, background: "#262E3A", color: "var(--text)" }} onClick={cancelEdit}>Cancel</button>
                                    </>
                                ) : (
                                    <button style={{ ...S.btn, flex: 1 }} onClick={handleAddSubject}>Add subject</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ENROLL ── */}
                {tab === "enroll" && (
                    <div style={{ maxWidth: 420 }}>
                        <Field label="Subject">
                            <select value={enrollSubject} onChange={e => setEnrollSubject(e.target.value)} style={S.input}>
                                <option value="">Select a subject...</option>
                                {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                            </select>
                        </Field>
                        <Field label="Student">
                            <select value={enrollStudent} onChange={e => setEnrollStudent(e.target.value)} style={S.input}>
                                <option value="">Select a student...</option>
                                {students.map(s => <option key={s.email} value={s.email}>{s.name} ({s.email})</option>)}
                            </select>
                        </Field>
                        <button style={S.btn} onClick={handleEnroll}>Enroll student</button>
                    </div>
                )}
            </div>
        </div>
    )
}

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
        {children}
    </div>
)
const StatCard = ({ label, value, sub, accent }) => (
    <div style={S.statCard}>
        <div style={S.statLabel}>{label}</div>
        <div style={{ ...S.statValue, color: accent || "var(--text)" }}>{value}</div>
        <div style={S.statSub}>{sub}</div>
    </div>
)
const Th = ({ children }) => <th style={S.th}>{children}</th>
const Td = ({ children, colSpan, center }) => <td style={{ ...S.td, ...(center ? { textAlign: "center", color: "var(--muted)" } : {}) }} colSpan={colSpan}>{children}</td>
const Pill = ({ good, neutral, children }) => (
    <span style={{
        ...S.pill,
        background: neutral ? "rgba(108,142,245,0.12)" : good ? "var(--safe-bg)" : "var(--risk-bg)",
        color:      neutral ? "var(--accent)"          : good ? "var(--safe)"    : "var(--risk)"
    }}>{children}</span>
)

const S = {
    page: { minHeight: "100vh", background: "var(--bg)", padding: "40px 56px" },
    loadingPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" },
    loadingText: { color: "var(--muted)", fontSize: 14 },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
    title: { fontSize: 22, fontWeight: 800, color: "var(--text)" },
    subtitle: { fontSize: 13, color: "var(--muted)", marginTop: 4 },
    logoutBtn: { background: "var(--panel)", border: "1px solid var(--panel-border)", color: "var(--text)", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },

    statRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 },
    statCard: { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 12, padding: "18px 20px" },
    statLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" },
    statValue: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
    statSub: { fontSize: 12, color: "var(--muted)" },

    panel: { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 14, padding: 28 },
    tabBar: { display: "flex", gap: 4, background: "#12171F", borderRadius: 10, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    tabActive: { background: "var(--panel-border)", color: "var(--text)" },

    searchBar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
    searchWrap: { position: "relative", flex: 1, minWidth: 220 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" },
    searchInput: { width: "100%", padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid var(--panel-border)", background: "#0D1117", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" },
    clearBtn: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer" },
    filterSel: { background: "#0D1117", border: "1px solid var(--panel-border)", borderRadius: 8, color: "var(--text)", fontSize: 13, padding: "9px 12px", outline: "none" },
    resultCount: { fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" },

    split: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" },
    card: { background: "#12171F", border: "1px solid var(--panel-border)", borderRadius: 12, padding: 20 },
    cardTitle: { fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 },

    tableWrap: { overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 10px", borderBottom: "1px solid var(--panel-border)", whiteSpace: "nowrap" },
    td: { padding: "11px 10px", fontSize: 13, color: "var(--text)", borderBottom: "1px solid var(--panel-border)", verticalAlign: "top" },
    pill: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12, whiteSpace: "nowrap" },
    rolePill: { background: "rgba(108,142,245,0.12)", color: "var(--accent)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, textTransform: "capitalize" },
    codeTag: { background: "rgba(108,142,245,0.1)", color: "var(--accent)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 },
    compTag: { background: "#1A2029", border: "1px solid var(--panel-border)", color: "var(--muted)", fontSize: 10, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" },
    nameCell: { fontWeight: 600, color: "var(--text)", lineHeight: 1.3 },
    emailLabel: { display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 400, marginTop: 2 },

    editBtn: { background: "rgba(108,142,245,0.1)", color: "var(--accent)", border: "1px solid rgba(108,142,245,0.2)", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" },
    delBtn: { background: "var(--risk-bg)", color: "var(--risk)", border: "none", padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" },

    input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--panel-border)", background: "#0D1117", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" },
    btn: { width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#0B0E13", fontWeight: 700, fontSize: 14, cursor: "pointer" },
    errBox: { background: "var(--risk-bg)", color: "var(--risk)", fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 16 },
    okBox: { background: "var(--safe-bg)", color: "var(--safe)", fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 16 },
    removeBtn: { background: "var(--risk-bg)", color: "var(--risk)", border: "none", width: 32, height: 38, borderRadius: 8, fontSize: 13, cursor: "pointer" },
    addRowBtn: { background: "transparent", border: "1px dashed var(--panel-border)", color: "var(--muted)", padding: "8px 12px", borderRadius: 8, fontSize: 13, width: "100%", marginTop: 4, cursor: "pointer" },
}

export default AdminDashboard