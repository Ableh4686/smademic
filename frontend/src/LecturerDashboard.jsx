import { useEffect, useState } from "react"
import api from "./api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts"

function LecturerDashboard({ user, token, onLogout }) {
  const [subjects, setSubjects]   = useState([])
  const [rows, setRows]           = useState([])
  const [students, setStudents]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState("attendance")
  const [editingRow, setEditingRow] = useState(null)

  // NEW: selected subject (null = show subject grid)
  const [selectedSubject, setSelectedSubject] = useState(null)

  const headers = { Authorization: `Bearer ${token}` }

  const loadData = async () => {
    setLoading(true)
    try {
      const [subRes, recRes, usrRes] = await Promise.all([
        api.get("/api/subjects", { headers }),
        api.get("/api/records",  { headers }),
        api.get("/api/users",    { headers }).catch(() => ({ data: [] })),
      ])

      const subjectMap = {}
      subRes.data.forEach(s => { subjectMap[s._id] = s })
      setSubjects(subRes.data)

      const nameMap = {}
      usrRes.data.forEach(u => { nameMap[u.email] = u.name })
      setStudents(nameMap)

      // deduplicate
      const seen = {}; const deduped = []
      for (const r of recRes.data) {
        const key = `${r.student_id}__${r.subject_id}`
        if (!seen[key]) { seen[key] = true; deduped.push(r) }
      }

      const enriched = await Promise.all(
        deduped.map(async r => {
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

  useEffect(() => { loadData() }, [])

  const getName = email => students[email] || email.split("@")[0]

  // rows for selected subject
  const subjectRows = selectedSubject
    ? rows.filter(r => r.subject_id === selectedSubject._id)
    : []

  // stats for selected subject
  const subjectAtRisk = subjectRows.filter(r => r.attendance < 75 || (r.grade && !r.grade.passed))
  const subjectPassed = subjectRows.filter(r => r.grade?.passed)

  // overall stats
  const uniqueStudents = new Set(rows.map(r => r.student_id)).size
  const atRiskUnique   = new Set(rows.filter(r => r.attendance < 75 || (r.grade && !r.grade.passed)).map(r => r.student_id)).size
  const gradedCount    = rows.filter(r => r.grade).length
  const passCount      = rows.filter(r => r.grade?.passed).length
  const passRate       = gradedCount > 0 ? Math.round((passCount / gradedCount) * 100) : 0

  // risk chart
  const riskChartData = subjects.map(s => {
    const sr     = rows.filter(r => r.subject_id === s._id)
    const safe   = sr.filter(r => r.grade?.passed && r.attendance >= 75).length
    const atRisk = sr.filter(r => !r.grade?.passed || r.attendance < 75).length
    return { name: s.code || s.name, safe, atRisk }
  }).filter(d => d.safe + d.atRisk > 0)

  const handleSave = async (studentId, subjectId, marks, attendance) => {
    await api.post("/api/records",
      { student_id: studentId, subject_id: subjectId, marks, attendance }, { headers })
    setEditingRow(null)
    loadData()
  }

  if (loading) return <div style={S.loadingPage}><div style={S.loadingText}>Loading your students...</div></div>

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>SMADEMIC</div>
          <h1 style={S.title}>Academic Management</h1>
          <p style={S.subtitle}>Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} style={S.logoutBtn}>Logout</button>
      </header>

      {/* ── Stats ── */}
      <div style={S.statRow}>
        <StatCard label="Subjects"        value={subjects.length} sub="Active courses" />
        <StatCard label="Total Students"  value={uniqueStudents}  sub="Enrolled students" />
        <StatCard label="At-Risk Students" value={atRiskUnique}   sub="Barred or failing" accent="var(--risk)" />
        <StatCard label="Pass Rate"        value={`${passRate}%`} sub="Triple-Lock based"  accent="var(--safe)" />
      </div>

      {/* ── Risk Chart ── */}
      <div style={S.chartPanel}>
        <div style={S.chartHeader}>
          <h2 style={S.chartTitle}>Student Risk Overview by Subject</h2>
          <p style={S.chartSub}>Safe vs At-Risk per subject (attendance &lt; 75% or failing Triple-Lock)</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={riskChartData} barGap={4} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#262E3A" vertical={false} />
            <XAxis dataKey="name" stroke="#8892A0" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#8892A0" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#1A2029", border: "1px solid #262E3A", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#EEF2F6", fontWeight: 600 }} cursor={{ fill: "rgba(108,142,245,0.06)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8892A0", paddingTop: 12 }}
              formatter={v => v === "safe" ? "Safe" : "At-Risk"} />
            <Bar dataKey="safe"   name="safe"   fill="#34D399" radius={[6,6,0,0]} maxBarSize={48} />
            <Bar dataKey="atRisk" name="atRisk" fill="#F87171" radius={[6,6,0,0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Subject Grid or Student Table ── */}
      {!selectedSubject ? (
        /* Subject Grid */
        <div style={S.panel}>
          <div style={S.panelHead}>
            <h2 style={S.panelTitle}>Select a Class</h2>
            <p style={S.panelSub}>Click a subject to view and manage its students</p>
          </div>
          <div style={S.subjectGrid}>
            {subjects.map((s, i) => {
              const sr      = rows.filter(r => r.subject_id === s._id)
              const total   = sr.length
              const atRisk  = sr.filter(r => r.attendance < 75 || (r.grade && !r.grade.passed && r.grade.status !== "ONGOING")).length
              const passed  = sr.filter(r => r.grade?.passed).length
              const ongoing = sr.filter(r => r.grade?.status === "ONGOING").length
              return (
                <button key={i} style={S.subjectCard} onClick={() => { setSelectedSubject(s); setTab("attendance") }}>
                  <div style={S.subjectCode}>{s.code}</div>
                  <div style={S.subjectName}>{s.name}</div>
                  <div style={S.subjectMeta}>{total} student{total !== 1 ? "s" : ""}</div>
                  <div style={S.subjectStats}>
                    <span style={{ color: "var(--safe)" }}>Passed: {passed}</span>
                    <span style={{ color: "var(--accent)" }}>Ongoing: {ongoing}</span>
                    <span style={{ color: "var(--risk)" }}>At-Risk: {atRisk}</span>
                  </div>
                  {!s.has_final && (
                    <span style={S.noFinalBadge}>No final exam</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* Student Table for selected subject */
        <div style={S.panel}>
          {/* Panel header with back button */}
          <div style={{ ...S.panelHead, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button style={S.backBtn} onClick={() => setSelectedSubject(null)}>Back</button>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={S.panelTitle}>{selectedSubject.name}</h2>
                  <span style={S.subjectCode}>{selectedSubject.code}</span>
                </div>
                <p style={S.panelSub}>
                  {subjectRows.length} students | {subjectPassed.length} passed | {subjectAtRisk.length} at-risk
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={S.tabBar}>
            {["attendance", "assessments", "triple-lock", "alerts"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ ...S.tabBtn, ...(tab === t ? S.tabBtnActive : {}) }}>
                {t === "triple-lock" ? "Triple-Lock"
                  : t === "alerts" ? `Alerts (${subjectAtRisk.length})`
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={S.tableWrap}>
            {tab === "attendance"  && <AttendanceTable  rows={subjectRows} onEdit={setEditingRow} getName={getName} />}
            {tab === "assessments" && <AssessmentsTable rows={subjectRows} onEdit={setEditingRow} getName={getName} />}
            {tab === "triple-lock" && <TripleLockTable  rows={subjectRows} getName={getName} />}
            {tab === "alerts"      && <AlertsTable
              rows={subjectRows.filter(r => r.attendance < 75 || (r.grade && !r.grade.passed))}
              onEdit={setEditingRow} getName={getName} />}
          </div>
        </div>
      )}

      {editingRow && (
        <EditPanel row={editingRow} onClose={() => setEditingRow(null)} onSave={handleSave} getName={getName} />
      )}
    </div>
  )
}

// ── Subject card grid ───────────────────────────────────────────────
// ── Stat Card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color: accent || "var(--text)" }}>{value}</div>
      <div style={S.statSub}>{sub}</div>
    </div>
  )
}

// ── Tables ──────────────────────────────────────────────────────────
function AttendanceTable({ rows, onEdit, getName }) {
  return (
    <table style={S.table}>
      <thead><tr><Th>Student</Th><Th>Attendance</Th><Th>Status</Th><Th></Th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <Td><div style={S.nameCell}>{getName(r.student_id)}<span style={S.emailLabel}>{r.student_id}</span></div></Td>
            <Td>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: "#262E3A", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.attendance}%`, background: r.attendance >= 75 ? "var(--safe)" : "var(--risk)", borderRadius: 3 }} />
                </div>
                <span style={{ color: r.attendance >= 75 ? "var(--safe)" : "var(--risk)", fontSize: 13, fontWeight: 700 }}>{r.attendance}%</span>
              </div>
            </Td>
            <Td><Pill good={r.attendance >= 75}>{r.attendance >= 75 ? "Good" : "Warning"}</Pill></Td>
            <Td><button style={S.rowBtn} onClick={() => onEdit(r)}>Update</button></Td>
          </tr>
        ))}
        {rows.length === 0 && <tr><Td colSpan={4}>No students in this class.</Td></tr>}
      </tbody>
    </table>
  )
}

function AssessmentsTable({ rows, onEdit, getName }) {
  return (
    <table style={S.table}>
      <thead><tr><Th>Student</Th><Th>Marks</Th><Th>Score</Th><Th></Th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <Td><div style={S.nameCell}>{getName(r.student_id)}<span style={S.emailLabel}>{r.student_id}</span></div></Td>
            <Td style={{ fontSize: 12, color: "var(--muted)" }}>
              {Object.keys(r.marks || {}).length > 0
                ? Object.entries(r.marks).map(([k, v]) => `${k}: ${v}`).join(" · ")
                : "—"}
            </Td>
            <Td>{r.grade ? <span style={{ fontWeight: 700, color: r.grade.passed ? "var(--safe)" : "var(--risk)" }}>{r.grade.total_marks}%</span> : "—"}</Td>
            <Td><button style={S.rowBtn} onClick={() => onEdit(r)}>Edit</button></Td>
          </tr>
        ))}
        {rows.length === 0 && <tr><Td colSpan={4}>No students in this class.</Td></tr>}
      </tbody>
    </table>
  )
}

function TripleLockTable({ rows, getName }) {
  return (
    <table style={S.table}>
      <thead><tr><Th>Student</Th><Th>Coursework</Th><Th>Final Exam</Th><Th>Aggregate</Th><Th>Status</Th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <Td><div style={S.nameCell}>{getName(r.student_id)}<span style={S.emailLabel}>{r.student_id}</span></div></Td>
            <Td><LockIcon passed={r.grade?.lock1_coursework} /></Td>
            <Td><LockIcon passed={r.grade?.lock2_final_exam} /></Td>
            <Td><LockIcon passed={r.grade?.lock3_aggregate} /></Td>
            <Td><Pill good={!!r.grade?.passed} neutral={r.grade?.status === "ONGOING"}>{r.grade ? r.grade.status : "Not graded"}</Pill></Td>
          </tr>
        ))}
        {rows.length === 0 && <tr><Td colSpan={5}>No students in this class.</Td></tr>}
      </tbody>
    </table>
  )
}

function AlertsTable({ rows, onEdit, getName }) {
  return (
    <table style={S.table}>
      <thead><tr><Th>Student</Th><Th>Issue</Th><Th>Score</Th><Th></Th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: "rgba(248,113,113,0.03)" }}>
            <Td><div style={S.nameCell}>{getName(r.student_id)}<span style={S.emailLabel}>{r.student_id}</span></div></Td>
            <Td>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.attendance < 75 && <Pill good={false}>Low attendance ({r.attendance}%)</Pill>}
                {r.grade && !r.grade.passed && <Pill good={false}>{r.grade.status}</Pill>}
              </div>
            </Td>
            <Td>{r.grade ? `${r.grade.total_marks}%` : "—"}</Td>
            <Td><button style={S.rowBtn} onClick={() => onEdit(r)}>Review</button></Td>
          </tr>
        ))}
        {rows.length === 0 && <tr><Td colSpan={4}><span style={{ color: "var(--safe)" }}>No students at risk in this class.</span></Td></tr>}
      </tbody>
    </table>
  )
}

// ── Edit drawer ────────────────────────────────────────────────────
function EditPanel({ row, onClose, onSave, getName }) {
  const [marks, setMarks]           = useState(row.marks || {})
  const [attendance, setAttendance] = useState(row.attendance ?? 0)
  const components = row.subject?.components || []
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>
        <h3 style={S.drawerTitle}>{getName(row.student_id)}</h3>
        <p style={S.drawerEmail}>{row.student_id}</p>
        <p style={S.drawerSub}>{row.subject?.name}</p>
        {components.map(c => (
          <div key={c.name} style={{ marginBottom: 16 }}>
            <label style={S.fieldLabel}>{c.name} <span style={{ color: "var(--accent)" }}>weight {c.weight}%</span></label>
            <input type="number" min="0" max="100"
              value={marks[c.name] ?? ""} style={S.input}
              onChange={e => setMarks(p => ({ ...p, [c.name]: Number(e.target.value) }))} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={S.fieldLabel}>Attendance <span style={{ color: "var(--accent)" }}>min 75%</span></label>
          <input type="number" min="0" max="100" value={attendance} style={{ ...S.input, borderColor: attendance < 75 ? "var(--risk)" : undefined }}
            onChange={e => setAttendance(Number(e.target.value))} />
          {attendance < 75 && <p style={{ fontSize: 12, color: "var(--risk)", marginTop: 4 }}>Student will be barred if attendance stays below 75%</p>}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button style={S.saveBtn} onClick={() => onSave(row.student_id, row.subject_id, marks, attendance)}>Save Changes</button>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Primitives ─────────────────────────────────────────────────────
const Th = ({ children }) => <th style={S.th}>{children}</th>
const Td = ({ children, colSpan }) => <td style={S.td} colSpan={colSpan}>{children}</td>
const Pill = ({ good, neutral, children }) => (
  <span style={{
    ...S.pill,
    background: neutral ? "rgba(108,142,245,0.12)" : good ? "var(--safe-bg)" : "rgba(248,113,113,0.12)",
    color:      neutral ? "var(--accent)"          : good ? "var(--safe)"    : "var(--risk)"
  }}>{children}</span>
)
const LockIcon = ({ passed }) => (
  <span style={{
    display: "inline-flex", width: 24, height: 24, borderRadius: "50%",
    alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
    background: passed == null ? "#1A2029" : passed ? "var(--safe-bg)" : "rgba(248,113,113,0.12)",
    color:      passed == null ? "var(--muted)" : passed ? "var(--safe)" : "var(--risk)"
  }}>{passed == null ? "·" : passed ? "✓" : "✕"}</span>
)

// ── Styles ─────────────────────────────────────────────────────────
const S = {
  page:        { minHeight: "100vh", background: "var(--bg)", padding: "40px 56px" },
  loadingPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" },
  loadingText: { color: "var(--muted)", fontSize: 14 },
  header:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  eyebrow:   { fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", marginBottom: 4 },
  title:     { fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" },
  subtitle:  { fontSize: 13, color: "var(--muted)", marginTop: 4 },
  logoutBtn: { background: "var(--panel)", border: "1px solid var(--panel-border)", color: "var(--text)", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },

  statRow:   { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 },
  statCard:  { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 12, padding: "18px 20px" },
  statLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" },
  statValue: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  statSub:   { fontSize: 12, color: "var(--muted)" },

  chartPanel:  { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 14, padding: "22px 24px", marginBottom: 24 },
  chartHeader: { marginBottom: 20 },
  chartTitle:  { fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4 },
  chartSub:    { fontSize: 12, color: "var(--muted)" },

  panel:     { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 14, padding: 28 },
  panelHead: { marginBottom: 24 },
  panelTitle:{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 4 },
  panelSub:  { fontSize: 13, color: "var(--muted)" },

  // Subject grid
  subjectGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 },
  subjectCard: {
    background: "#10141B", border: "1px solid var(--panel-border)",
    borderRadius: 14, padding: "20px 18px", textAlign: "left",
    cursor: "pointer", transition: "border-color 0.2s, transform 0.15s, box-shadow 0.2s",
    position: "relative",
    "&:hover": { borderColor: "var(--accent)" }
  },
  subjectCode: { fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 6, display: "inline-block", background: "rgba(108,142,245,0.1)", padding: "2px 8px", borderRadius: 6 },
  subjectName: { fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 },
  subjectMeta: { fontSize: 12, color: "var(--muted)", marginBottom: 12 },
  subjectStats: { display: "flex", gap: 12, fontSize: 13, fontWeight: 700 },
  noFinalBadge: { position: "absolute", top: 10, right: 10, fontSize: 10, background: "rgba(108,142,245,0.1)", color: "var(--accent)", padding: "2px 7px", borderRadius: 10, fontWeight: 600 },

  backBtn: { background: "rgba(108,142,245,0.1)", border: "1px solid rgba(108,142,245,0.2)", color: "var(--accent)", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },

  tabBar:      { display: "flex", gap: 4, background: "#12171F", borderRadius: 10, padding: 4, marginBottom: 20 },
  tabBtn:      { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  tabBtnActive:{ background: "var(--panel-border)", color: "var(--text)" },

  tableWrap: { overflowX: "auto" },
  table:     { width: "100%", borderCollapse: "collapse" },
  th:        { textAlign: "left", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 10px", borderBottom: "1px solid var(--panel-border)", whiteSpace: "nowrap" },
  td:        { padding: "10px 10px", fontSize: 13, color: "var(--text)", borderBottom: "1px solid var(--panel-border)", verticalAlign: "top" },

  nameCell:   { fontWeight: 600, color: "var(--text)", lineHeight: 1.3 },
  emailLabel: { display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 400, marginTop: 2 },

  pill:    { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12, whiteSpace: "nowrap" },
  rowBtn:  { background: "var(--accent)", color: "#0B0E13", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" },

  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "flex-end", zIndex: 50 },
  drawer:     { width: 380, height: "100%", background: "var(--panel)", borderLeft: "1px solid var(--panel-border)", padding: 28, overflowY: "auto" },
  drawerTitle:{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 },
  drawerEmail:{ fontSize: 12, color: "var(--muted)", marginBottom: 4 },
  drawerSub:  { fontSize: 13, color: "var(--accent)", marginBottom: 24, fontWeight: 600 },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" },
  input:      { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--panel-border)", background: "#12171F", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" },
  saveBtn:    { flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#0B0E13", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  cancelBtn:  { flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--panel-border)", background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" },
}

export default LecturerDashboard