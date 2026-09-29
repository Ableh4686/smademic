import { useEffect, useState } from "react"
import api from "./api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts"
import ChatbotWidget from "./ChatbotWidget"

function Dashboard({ user, token, onLogout }) {
    const [subjects, setSubjects] = useState([])
    const [grades, setGrades] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedGrade, setSelectedGrade] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` }
                const subRes = await api.get("/api/subjects", { headers })
                setSubjects(subRes.data)

                const recRes = await api.get(`/api/records/${user.email}`, { headers })

                const gradeResults = await Promise.all(
                    recRes.data.map(async (record) => {
                        const gradeRes = await api.post("/api/grade",
                            { student_id: user.email, subject_id: record.subject_id },
                            { headers }
                        )
                        let risk = null
                        try {
                            const riskRes = await api.post("/api/risk/predict-student",
                                { student_id: user.email, subject_id: record.subject_id },
                                { headers }
                            )
                            risk = riskRes.data
                        } catch (e) { /* risk prediction optional */ }
                        return { subject_id: record.subject_id, ...gradeRes.data, risk }
                    })
                )
                setGrades(gradeResults)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const getSubjectName = (id) => subjects.find(s => s._id === id)?.name || id
    const getSubjectCode = (id) => subjects.find(s => s._id === id)?.code || ""

    const chartData = grades.map(g => ({ name: getSubjectCode(g.subject_id) || getSubjectName(g.subject_id), marks: g.total_marks }))
    const passedCount = grades.filter(g => g.passed).length

    if (loading) {
        return <div style={styles.loadingPage}><div style={styles.loadingText}>Loading your data…</div></div>
    }

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div>
                    <div style={styles.eyebrow}>SMADEMIC</div>
                    <h1 style={styles.title}>Welcome back, {user.name.split(" ")[0]}</h1>
                </div>
                <div style={styles.headerRight}>
                    <span style={styles.roleBadge}>{user.role}</span>
                    <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
                </div>
            </header>

            {grades.length === 0 ? (
                <div style={styles.emptyState}>
                    <p style={styles.emptyText}>No academic records yet. Once a lecturer enters your marks, they'll show up here.</p>
                </div>
            ) : (
                <>
                    <div style={styles.summaryRow}>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryLabel}>Subjects passing</div>
                            <div style={styles.summaryValue}>{passedCount} / {grades.length}</div>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryLabel}>Average score</div>
                            <div style={styles.summaryValue}>
                                {(grades.reduce((a, g) => a + g.total_marks, 0) / grades.length).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h2 style={styles.sectionTitle}>Your subjects</h2>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>💡 Click card for risk assessment & breakdown</span>
                    </div>

                    <div style={styles.grid}>
                        {grades.map((g, i) => (
                            <SubjectCard 
                                key={i} 
                                g={g} 
                                name={getSubjectName(g.subject_id)} 
                                code={getSubjectCode(g.subject_id)}
                                onClick={() => setSelectedGrade(g)}
                            />
                        ))}
                    </div>

                    <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Performance overview</h2>
                    <div style={styles.chartPanel}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262E3A" vertical={false} />
                                <XAxis dataKey="name" stroke="#8892A0" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} stroke="#8892A0" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: "#1A2029", border: "1px solid #262E3A", borderRadius: 8, fontSize: 13 }}
                                    labelStyle={{ color: "#EEF2F6" }}
                                />
                                <ReferenceLine y={50} stroke="#F87171" strokeDasharray="4 4" />
                                <Bar dataKey="marks" fill="#6C8EF5" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {/* Detailed Grade & Risk Projections Modal */}
            {selectedGrade && (
                <GradeBreakdownModal
                    grade={selectedGrade}
                    subjectName={getSubjectName(selectedGrade.subject_id)}
                    subjectCode={getSubjectCode(selectedGrade.subject_id)}
                    onClose={() => setSelectedGrade(null)}
                />
            )}

            {/* Chatbot widget — always visible as floating button */}
            <ChatbotWidget token={token} />
        </div>
    )
}

function SubjectCard({ g, name, code, onClick }) {
    const locks = [
        { label: "Coursework", passed: g.lock1_coursework },
        { label: "Final Exam", passed: g.lock2_final_exam },
        { label: "Aggregate", passed: g.lock3_aggregate },
    ]

    const cardStatus = g.status === "ONGOING" ? "ONGOING" : g.passed ? "PASSED" : "FAILED"

    return (
        <div 
            onClick={onClick}
            style={{
                ...styles.card,
                borderColor: cardStatus === "PASSED" 
                    ? "rgba(52,211,153,0.3)" 
                    : cardStatus === "ONGOING" 
                        ? "rgba(108,142,245,0.3)" 
                        : "rgba(248,113,113,0.3)"
            }}
            className="subject-card-hover"
        >
            <div style={styles.cardTop}>
                <div>
                    <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, display: "block", marginBottom: 2 }}>{code}</span>
                    <h3 style={styles.cardTitle}>{name}</h3>
                </div>
                <span style={{
                    ...styles.statusPill,
                    background: cardStatus === "PASSED" 
                        ? "var(--safe-bg)" 
                        : cardStatus === "ONGOING" 
                            ? "rgba(108,142,245,0.12)" 
                            : "var(--risk-bg)",
                    color: cardStatus === "PASSED" 
                        ? "var(--safe)" 
                        : cardStatus === "ONGOING" 
                            ? "var(--accent)" 
                            : "var(--risk)"
                }}>
                    {cardStatus}
                </span>
            </div>

            <div style={styles.scoreRow}>
                <span style={styles.scoreValue}>
                    {g.total_marks}%
                </span>
                <span style={styles.scoreLabel}>
                    {!g.final_exam_graded ? "coursework contrib." : "final aggregate"}
                </span>
            </div>

            <div style={styles.lockTrack}>
                {locks.map((l, i) => (
                    <div key={i} style={styles.lockItem}>
                        <div style={{
                            ...styles.lockIcon,
                            background: l.passed === null 
                                ? "#262E3A" 
                                : l.passed 
                                    ? "var(--safe-bg)" 
                                    : "var(--risk-bg)",
                            color: l.passed === null 
                                ? "var(--muted)" 
                                : l.passed 
                                    ? "var(--safe)" 
                                    : "var(--risk)"
                        }}>
                            {l.passed === null ? "·" : l.passed ? "✓" : "✕"}
                        </div>
                        <span style={styles.lockLabel}>{l.label}</span>
                    </div>
                ))}
            </div>

            <div style={styles.attendanceRow}>
                <span style={styles.attendanceLabel}>Attendance</span>
                <div style={styles.attendanceBarTrack}>
                    <div style={{
                        ...styles.attendanceBarFill,
                        width: `${g.attendance}%`,
                        background: g.barred ? "var(--risk)" : "var(--accent)"
                    }} />
                </div>
                <span style={{ fontSize: 13, color: g.barred ? "var(--risk)" : "var(--muted)", fontWeight: 600 }}>
                    {g.attendance}% {g.barred ? "· Barred" : ""}
                </span>
            </div>
            
            <style>{`
                .subject-card-hover {
                    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s !important;
                    cursor: pointer;
                }
                .subject-card-hover:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(108, 142, 245, 0.08);
                    border-color: var(--accent) !important;
                }
            `}</style>
        </div>
    )
}

function GradeBreakdownModal({ grade, subjectName, subjectCode, onClose }) {
  const locks = [
    { label: "Coursework Lock (Must be ≥ 40%)", passed: grade.lock1_coursework },
    { label: "Final Exam Lock (Must be ≥ 40%)",  passed: grade.lock2_final_exam },
    { label: "Aggregate Lock (Must be ≥ 50%)",   passed: grade.lock3_aggregate },
  ]

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.container} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={modalStyles.header}>
          <div>
            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, display: "block" }}>{subjectCode}</span>
            <h3 style={modalStyles.title}>{subjectName}</h3>
          </div>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Current status summary */}
        <div style={modalStyles.section}>
          <div style={modalStyles.flexRow}>
            <div>
              <div style={modalStyles.label}>
                {!grade.final_exam_graded ? "COURSEWORK CONTRIBUTION" : "FINAL SEMESTER GRADED SCORE"}
              </div>
              <div style={modalStyles.hugeScore}>{grade.total_marks}%</div>
            </div>
            <div>
              <div style={modalStyles.label}>STATUS</div>
              <div style={{
                ...modalStyles.badge,
                background: grade.passed 
                    ? "var(--safe-bg)" 
                    : grade.status.startsWith("ONGOING") 
                        ? "rgba(108,142,245,0.12)" 
                        : "var(--risk-bg)",
                color: grade.passed 
                    ? "var(--safe)" 
                    : grade.status.startsWith("ONGOING") 
                        ? "var(--accent)" 
                        : "var(--risk)"
              }}>
                {grade.status}
              </div>
            </div>
          </div>
        </div>

        {/* Coursework Component List */}
        <div style={modalStyles.section}>
          <h4 style={modalStyles.sectionHeading}>Graded Components Breakdown</h4>
          <div style={modalStyles.breakdownList}>
            {grade.breakdown && grade.breakdown.map((item, idx) => (
              <div key={idx} style={modalStyles.breakdownItem}>
                <div>
                  <div style={modalStyles.compName}>{item.component}</div>
                  <div style={modalStyles.compWeight}>Component Weight: {item.weight}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={modalStyles.compMark}>{item.mark} / 100</div>
                  <div style={modalStyles.compWeighted}>Contribution: {item.weighted}%</div>
                </div>
              </div>
            ))}
            {(!grade.breakdown || grade.breakdown.length === 0) && (
              <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>No coursework marks entered yet.</div>
            )}
          </div>
        </div>

        {/* Projections Alert Box */}
        <div style={modalStyles.section}>
          <h4 style={modalStyles.sectionHeading}>Semester Target Projection</h4>
          {!grade.final_exam_graded ? (
            grade.can_pass ? (
              <div style={{ ...modalStyles.alertBox, borderColor: "var(--accent)", background: "rgba(108,142,245,0.06)" }}>
                <span style={{ fontSize: 24 }}>🔮</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#EEF2F6", marginBottom: 4, fontSize: 14 }}>Pending Final Exam Target</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                    To pass the semester for this subject, you must score at least <strong style={{ color: "var(--accent)", fontSize: 14 }}>{grade.target_final_exam}%</strong> on your upcoming Final Exam.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...modalStyles.alertBox, borderColor: "var(--risk)", background: "rgba(248,113,113,0.06)" }}>
                <span style={{ fontSize: 24 }}>❌</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--risk)", marginBottom: 4, fontSize: 14 }}>Triple-Lock Fail Warning</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                    {grade.prediction_notes}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div style={{
              ...modalStyles.alertBox,
              borderColor: grade.passed ? "var(--safe)" : "var(--risk)",
              background: grade.passed ? "rgba(52,211,153,0.05)" : "rgba(248,113,113,0.05)"
            }}>
              <span style={{ fontSize: 24 }}>{grade.passed ? "✅" : "⚠️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: grade.passed ? "var(--safe)" : "var(--risk)", marginBottom: 4, fontSize: 14 }}>
                  {grade.passed ? "Course Requirements Satisfied" : "Requirements Incomplete"}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                  {grade.passed 
                    ? "Congratulations! You have satisfied student coursework and exam aggregate locks for this semester."
                    : `Grade deficiency encountered: ${grade.status}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lock Checks */}
        <div style={{ ...modalStyles.section, marginBottom: 0 }}>
          <h4 style={modalStyles.sectionHeading}>Triple-Lock Rule Checklist</h4>
          <div style={modalStyles.lockList}>
            {locks.map((l, idx) => {
              const state = l.passed === null ? "pending" : l.passed ? "pass" : "fail"
              return (
                <div key={idx} style={modalStyles.lockRow}>
                  <span style={{
                    ...modalStyles.lockIndicator,
                    background: state === "pending" ? "#232A35" : state === "pass" ? "var(--safe-bg)" : "var(--risk-bg)",
                    color: state === "pending" ? "var(--muted)" : state === "pass" ? "var(--safe)" : "var(--risk)"
                  }}>
                    {state === "pending" ? "·" : state === "pass" ? "✓" : "✕"}
                  </span>
                  <div>
                    <span style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: state === "fail" ? "var(--risk)" : "var(--text)", 
                      display: "block" 
                    }}>
                      {l.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "block" }}>
                      {idx === 0 ? "Fails if coursework total normalized is below 40%" : ""}
                      {idx === 1 ? "Fails if final exam is taken and score is below 40%" : ""}
                      {idx === 2 ? "Fails if total weighted marks combined is below 50%" : ""}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10, 14, 21, 0.75)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  container: {
    background: "#1A2029",
    border: "1px solid #262E3A",
    borderRadius: 20,
    width: "90%",
    maxWidth: 520,
    padding: 28,
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    maxHeight: "92vh",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottom: "1px solid #262E3A",
    paddingBottom: 16,
  },
  title: { fontSize: 18, fontWeight: 800, color: "#EEF2F6", marginTop: 4 },
  subtitle: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  closeBtn: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #262E3A",
    color: "#8892A0",
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 12,
    transition: "background 0.2s, color 0.2s",
  },
  section: {
    marginBottom: 24,
  },
  flexRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#10141B",
    border: "1px solid #262E3A",
    borderRadius: 12,
    padding: "16px 20px",
  },
  label: { fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.08em" },
  hugeScore: { fontSize: 32, fontWeight: 800, color: "#EEF2F6", marginTop: 4, fontFamily: "'Sora', sans-serif" },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 12,
    letterSpacing: "0.04em",
    marginTop: 4,
    textAlign: "center",
  },
  sectionHeading: { fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 },
  breakdownList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#10141B",
    borderRadius: 12,
    border: "1px solid #262E3A",
    padding: "14px 18px",
  },
  breakdownItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottom: "1px solid #262E3A",
    ":last-child": {
      borderBottom: "none",
      paddingBottom: 0,
    }
  },
  compName: { fontSize: 13, fontWeight: 700, color: "#EEF2F6" },
  compWeight: { fontSize: 11, color: "var(--muted)", marginTop: 2 },
  compMark: { fontSize: 13, fontWeight: 700, color: "#EEF2F6" },
  compWeighted: { fontSize: 11, color: "var(--accent)", marginTop: 2, fontWeight: 600 },
  alertBox: {
    border: "1px solid",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },
  lockList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#10141B",
    borderRadius: 12,
    border: "1px solid #262E3A",
    padding: "16px 18px",
  },
  lockRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  lockIndicator: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
    flexShrink: 0,
    marginTop: 2,
  },
}

const styles = {
    page: { minHeight: "100vh", background: "var(--bg)", padding: "40px 56px" },
    loadingPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" },
    loadingText: { color: "var(--muted)", fontSize: 14 },

    header: {
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36,
    },
    eyebrow: { fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", marginBottom: 6 },
    title: { fontSize: 30, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" },
    headerRight: { display: "flex", alignItems: "center", gap: 12 },
    roleBadge: {
        background: "var(--panel)", border: "1px solid var(--panel-border)",
        color: "var(--muted)", fontSize: 12, fontWeight: 600,
        padding: "6px 12px", borderRadius: 20, textTransform: "capitalize",
    },
    logoutBtn: { background: "transparent", border: "1px solid var(--panel-border)", color: "var(--muted)", padding: "8px 16px", borderRadius: 8, fontSize: 13 },

    emptyState: { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 12, padding: 40, textAlign: "center" },
    emptyText: { color: "var(--muted)", fontSize: 14 },

    summaryRow: { display: "flex", gap: 16, marginBottom: 36 },
    summaryCard: {
        flex: 1, background: "var(--panel)", border: "1px solid var(--panel-border)",
        borderRadius: 12, padding: "20px 24px",
    },
    summaryLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
    summaryValue: { fontSize: 28, fontWeight: 800, color: "var(--text)" },

    sectionTitle: { fontSize: 16, fontWeight: 700, color: "var(--text)" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },

    card: {
        background: "var(--panel)", border: "1px solid var(--panel-border)",
        borderRadius: 14, padding: 22,
    },
    cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: 700, color: "var(--text)", maxWidth: 180, marginTop: 2 },
    statusPill: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.03em" },

    scoreRow: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18 },
    scoreValue: { fontSize: 36, fontWeight: 800, color: "var(--text)", fontFamily: "'Sora', sans-serif" },
    scoreLabel: { fontSize: 13, color: "var(--muted)" },

    lockTrack: { display: "flex", justifyContent: "space-between", marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--panel-border)" },
    lockItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
    lockIcon: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
    lockLabel: { fontSize: 10, color: "var(--muted)", textAlign: "center" },

    attendanceRow: { display: "flex", alignItems: "center", gap: 10 },
    attendanceLabel: { fontSize: 12, color: "var(--muted)", width: 70 },
    attendanceBarTrack: { flex: 1, height: 6, background: "#262E3A", borderRadius: 4, overflow: "hidden" },
    attendanceBarFill: { height: "100%", borderRadius: 4 },

    chartPanel: { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 14, padding: "20px 20px 0" },
}

export default Dashboard