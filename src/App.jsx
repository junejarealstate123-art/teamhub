import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase'

const today = () => new Date().toISOString().split("T")[0]
const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` }
const timeToMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60+m }
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0] }
const isPastDate = (d) => new Date(d) < new Date(today())
const dayName = (date) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(date).getDay()]

const C = {
  bg:"#f7f8fa", surface:"#ffffff", border:"#e5e7eb",
  text:"#111827", textMuted:"#6b7280", textLight:"#9ca3af",
  primary:"#4f46e5", primaryLight:"#eef2ff",
  success:"#10b981", successLight:"#d1fae5",
  warning:"#f59e0b", warningLight:"#fef3c7",
  danger:"#ef4444", dangerLight:"#fee2e2",
  purple:"#8b5cf6", purpleLight:"#ede9fe",
  orange:"#f97316", orangeLight:"#ffedd5",
}

const avatarColors = ["#6366f1","#10b981","#f59e0b","#ec4899","#8b5cf6","#ef4444","#14b8a6","#f97316"]
const getColor = (id) => avatarColors[Math.abs(String(id).split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % avatarColors.length]
const TASK_CATEGORIES = ["Development","Design","Testing","Marketing","Research","Meeting","Other"]

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [loginError, setLoginError] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem("teamhub-user")
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const handleLogin = async () => {
    setLoginError("")
    const email = loginForm.email.trim().toLowerCase()
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .eq('password', loginForm.password)
      .maybeSingle()
    if (error) { setLoginError("Connection error: " + error.message); return }
    if (!data) { setLoginError("Email ya password galat hai!"); return }
    const userData = { id: data.id, name: data.name, email: data.email, role: data.role, checkinTime: data.checkin_time, avatar: data.avatar || data.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(), isAdmin: data.is_admin }
    localStorage.setItem("teamhub-user", JSON.stringify(userData))
    setUser(userData)
  }

  const onLogout = () => { localStorage.removeItem("teamhub-user"); setUser(null) }

  if (loading) return <Loader />
  if (!user) return <LoginScreen form={loginForm} setForm={setLoginForm} onLogin={handleLogin} error={loginError} />
  if (user.isAdmin) return <AdminDashboard user={user} onLogout={onLogout} />
  return <MemberDashboard user={user} setUser={setUser} onLogout={onLogout} />
}

function Loader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12, background:C.bg }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.primary}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:C.textMuted, fontSize:13 }}>Loading TeamHub...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function LoginScreen({ form, setForm, onLogin, error }) {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:44, height:44, background:C.primary, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:"#fff" }}>⚡</div>
            <span style={{ fontSize:28, fontWeight:700, color:C.text }}>TeamHub</span>
          </div>
          <p style={{ color:C.textMuted, fontSize:14 }}>Team management platform</p>
        </div>
      
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", color:C.text, fontSize:13, marginBottom:6, fontWeight:500 }}>Email</label>
            <input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}
              onKeyDown={e => e.key==="Enter" && onLogin()}
              style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              placeholder="email@team.com" />
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", color:C.text, fontSize:13, marginBottom:6, fontWeight:500 }}>Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}
              onKeyDown={e => e.key==="Enter" && onLogin()}
              style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              placeholder="••••••" />
          </div>
          {error && <p style={{ color:C.danger, fontSize:13, marginBottom:12, background:C.dangerLight, padding:"8px 12px", borderRadius:6 }}>{error}</p>}
          <button onClick={onLogin} style={{ width:"100%", background:C.primary, border:"none", borderRadius:10, padding:"12px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Login →
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ ADMIN DASHBOARD ============
function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview")
  const [data, setData] = useState({ members:[], tasks:[], attendance:{}, reports:{}, stats:{}, comments:{} })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [{ data:members }, { data:tasks }, { data:att }, { data:reps }, { data:stats }, { data:comments }] = await Promise.all([
      supabase.from('members').select('*').eq('is_admin', false).order('created_at'),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('attendance').select('*'),
      supabase.from('reports').select('*'),
      supabase.from('member_stats').select('*'),
      supabase.from('task_comments').select('*').order('created_at'),
    ])
    const attMap = {}; (att||[]).forEach(a=>{ if(!attMap[a.date]) attMap[a.date]={}; attMap[a.date][a.member_id]={checkIn:a.check_in,checkOut:a.check_out,status:a.status,reason:a.reason,lateBy:a.late_by} })
    const repMap = {}; (reps||[]).forEach(r=>{ if(!repMap[r.date]) repMap[r.date]={}; repMap[r.date][r.member_id]={tasksCompleted:r.tasks_completed,hoursWorked:r.hours_worked,blockers:r.blockers,notes:r.notes,submittedAt:r.submitted_at} })
    const statsMap = {}; (stats||[]).forEach(s=>{ statsMap[s.member_id]={lateCount:s.late_count,strikes:s.strikes} })
    const cmtMap = {}; (comments||[]).forEach(c=>{ if(!cmtMap[c.task_id]) cmtMap[c.task_id]=[]; cmtMap[c.task_id].push({author:c.author,text:c.text,time:c.time}) })
    setData({ members:members||[], tasks:tasks||[], attendance:attMap, reports:repMap, stats:statsMap, comments:cmtMap })
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const tabs = [
    { id:"overview", label:"Overview", icon:"📊" },
    { id:"members", label:"Members", icon:"👥" },
    { id:"tasks", label:"Tasks", icon:"✅" },
    { id:"attendance", label:"Attendance", icon:"🕐" },
    { id:"reports", label:"Reports", icon:"📋" },
  ]

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:C.primary, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff" }}>⚡</div>
          <span style={{ color:C.text, fontWeight:700, fontSize:17 }}>TeamHub</span>
          <span style={{ background:C.primaryLight, color:C.primary, fontSize:11, padding:"3px 10px", borderRadius:20, marginLeft:4, fontWeight:600 }}>Admin</span>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, padding:"7px 16px", borderRadius:8, cursor:"pointer" }}>Logout</button>
      </div>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px", display:"flex", gap:4, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:"transparent", border:"none", borderBottom: tab===t.id ? `2px solid ${C.primary}` : "2px solid transparent", color: tab===t.id ? C.primary : C.textMuted, padding:"14px 16px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontWeight: tab===t.id?600:500 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, padding:24, overflowY:"auto" }}>
        {tab==="overview" && <AdminOverview data={data} />}
        {tab==="members" && <AdminMembers data={data} refresh={refresh} />}
        {tab==="tasks" && <AdminTasks data={data} refresh={refresh} />}
        {tab==="attendance" && <AdminAttendance data={data} refresh={refresh} />}
        {tab==="reports" && <AdminReports data={data} />}
      </div>
    </div>
  )
}

function AdminOverview({ data }) {
  const td = today()
  const att = data.attendance[td] || {}
  const ontime = Object.values(att).filter(a=>a.status==="ontime").length
  const late = Object.values(att).filter(a=>a.status==="late").length
  const absent = data.members.filter(m=>!att[m.id]).length
  const doneTasks = data.tasks.filter(t=>t.status==="done").length
  const overdueTasks = data.tasks.filter(t=>t.status!=="done" && isPastDate(t.deadline)).length

  const cards = [
    { label:"Total Members", value: data.members.length, color:C.primary },
    { label:"On Time Today", value: ontime, color:C.success },
    { label:"Late Today", value: late, color:C.warning },
    { label:"Absent Today", value: absent, color:C.danger },
    { label:"Tasks Done", value: doneTasks, color:C.purple },
    { label:"Overdue", value: overdueTasks, color:C.orange },
  ]

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:6 }}>Today's Overview</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:24 }}>{td}</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
            <p style={{ color:C.textMuted, fontSize:12, marginBottom:8, fontWeight:500 }}>{c.label}</p>
            <p style={{ color:c.color, fontSize:30, fontWeight:700 }}>{c.value}</p>
          </div>
        ))}
      </div>
      <h3 style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:14, textTransform:"uppercase", letterSpacing:"0.05em" }}>Members Status</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.members.map(m => {
          const a = att[m.id]
          const lc = data.stats[m.id]?.lateCount || 0
          const strikes = data.stats[m.id]?.strikes || 0
          return (
            <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, color:"#fff", flexShrink:0 }}>{m.avatar}</div>
              <div style={{ flex:1 }}>
                <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>{m.name}</p>
                <p style={{ color:C.textMuted, fontSize:12 }}>{m.role}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                {a ? (
                  <span style={{ background: a.status==="ontime"?C.successLight:C.warningLight, color:a.status==="ontime"?C.success:C.warning, fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>
                    {a.status==="ontime"?"✓ On Time":"⚠ Late "+a.checkIn}
                  </span>
                ) : (
                  <span style={{ background:C.dangerLight, color:C.danger, fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>✗ Absent</span>
                )}
                {(lc>0 || strikes>0) && <p style={{ color:C.textMuted, fontSize:11, marginTop:4 }}>Late: {lc} · Strikes: {strikes}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminMembers({ data, refresh }) {
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"", checkin_time:"09:00" })
  const [adding, setAdding] = useState(false)
  const [credShow, setCredShow] = useState(null)

  const genPassword = () => Math.random().toString(36).slice(-6)

  const addMember = async () => {
    if (!form.name||!form.email||!form.role) { alert("Name, email aur role zaroori hai!"); return }
    const password = form.password || genPassword()
    const id = "m"+Date.now()
    const avatar = form.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    const { error } = await supabase.from('members').insert({ id, name:form.name, email:form.email.toLowerCase(), password, role:form.role, checkin_time:form.checkin_time, avatar, is_admin:false })
    if (error) { alert("Error: " + error.message); return }
    await supabase.from('member_stats').insert({ member_id:id, late_count:0, strikes:0 })
    setCredShow({ email:form.email, password, name:form.name })
    setForm({ name:"", email:"", password:"", role:"", checkin_time:"09:00" })
    setAdding(false)
    refresh()
  }

  const deleteMember = async (id) => {
    if (!confirm("Delete this member?")) return
    await supabase.from('members').delete().eq('id', id)
    refresh()
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Team Members ({data.members.length})</h2>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
          {adding ? "Cancel" : "+ Add Member"}
        </button>
      </div>
      {credShow && (
        <div style={{ background:C.successLight, border:`1px solid ${C.success}`, borderRadius:12, padding:16, marginBottom:16 }}>
          <p style={{ color:C.success, fontWeight:600, fontSize:14, marginBottom:8 }}>✓ Member added! Credentials for {credShow.name}:</p>
          <div style={{ background:"#fff", borderRadius:8, padding:"10px 14px", fontFamily:"ui-monospace, monospace", fontSize:13, color:C.text }}>
            <div>Email: <strong>{credShow.email}</strong></div>
            <div>Password: <strong>{credShow.password}</strong></div>
          </div>
          <button onClick={()=>setCredShow(null)} style={{ marginTop:10, background:"transparent", border:"none", color:C.success, fontSize:12, cursor:"pointer", fontWeight:600 }}>Close</button>
        </div>
      )}
      {adding && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            {[["name","Full Name"],["email","Email"],["password","Password (optional)"],["role","Role / Designation"]].map(([k,ph])=>(
              <div key={k}>
                <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:4, fontWeight:500 }}>{ph}</label>
                <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }} placeholder={ph} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:4, fontWeight:500 }}>Check-in Time</label>
            <input type="time" value={form.checkin_time} onChange={e=>setForm(f=>({...f,checkin_time:e.target.value}))}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13 }} />
          </div>
          <button onClick={addMember} style={{ background:C.primary, border:"none", color:"#fff", padding:"10px 24px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Save Member</button>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.members.map(m => (
          <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, color:"#fff" }}>{m.avatar}</div>
            <div style={{ flex:1 }}>
              <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name}</p>
              <p style={{ color:C.textMuted, fontSize:12 }}>{m.email} · {m.role} · 🕐 {m.checkin_time}</p>
            </div>
            <button onClick={()=>deleteMember(m.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:12, padding:"6px 12px", borderRadius:6, cursor:"pointer" }}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminTasks({ data, refresh }) {
  const [form, setForm] = useState({ title:"", assigned_to:"", deadline:"", priority:"medium", category:"Development" })
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState("all")

  const addTask = async () => {
    if (!form.title.trim() || !form.assigned_to || !form.deadline) { alert("Sab fields bharein!"); return }
    const id = "t"+Date.now()
    const { error } = await supabase.from('tasks').insert({ id, ...form, status:"pending", progress:0 })
    if (error) { alert("Error: " + error.message); return }
    setForm({ title:"", assigned_to:"", deadline:"", priority:"medium", category:"Development" })
    setAdding(false)
    refresh()
  }

  const deleteTask = async (id) => { await supabase.from('tasks').delete().eq('id', id); refresh() }
  const updateStatus = async (id, status) => {
    await supabase.from('tasks').update({ status, progress: status==="done"?100:undefined }).eq('id', id)
    refresh()
  }

  const pColor = { high:C.danger, medium:C.warning, low:C.success }
  const pBg = { high:C.dangerLight, medium:C.warningLight, low:C.successLight }

  const filteredTasks = useMemo(()=>{
    if (filter==="all") return data.tasks
    if (filter==="overdue") return data.tasks.filter(t=>t.status!=="done" && isPastDate(t.deadline))
    return data.tasks.filter(t=>t.status===filter)
  }, [data.tasks, filter])

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Tasks ({filteredTasks.length})</h2>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
          {adding ? "Cancel" : "+ Add Task"}
        </button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {[["all","All"],["pending","Pending"],["in-progress","In Progress"],["done","Done"],["overdue","Overdue"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{ background:filter===k?C.primary:C.surface, color:filter===k?"#fff":C.textMuted, border:`1px solid ${filter===k?C.primary:C.border}`, padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {l}
          </button>
        ))}
      </div>
      {adding && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ marginBottom:12 }}>
            <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:4, fontWeight:500 }}>Task Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }} placeholder="Task ka naam likhein..." />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:14 }}>
            <div>
              <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:4, fontWeight:500 }}>Assign To *</label>
              <select value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }}>
                <option value="">-- Select --</option>
                {data.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:4, fontWeight:500 }}>Deadline *</label>
              <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:4, fontWeight:500 }}>Priority</label>
              <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div>
              <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:4, fontWeight:500 }}>Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }}>
                {TASK_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={addTask} style={{ background:C.primary, border:"none", color:"#fff", padding:"10px 24px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Add Task</button>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filteredTasks.map(t => {
          const member = data.members.find(m=>m.id===t.assigned_to)
          const overdue = t.status!=="done" && isPastDate(t.deadline)
          return (
            <div key={t.id} style={{ background:overdue?C.dangerLight:C.surface, border:`1px solid ${overdue?C.danger:C.border}`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:4, height:40, background:pColor[t.priority], borderRadius:2 }} />
              <div style={{ flex:1 }}>
                <p style={{ color: t.status==="done"?C.textMuted:C.text, fontWeight:600, fontSize:14, textDecoration:t.status==="done"?"line-through":"none" }}>
                  {t.title} {overdue && <span style={{ background:C.danger, color:"#fff", fontSize:10, padding:"2px 6px", borderRadius:4, marginLeft:6 }}>OVERDUE</span>}
                </p>
                <p style={{ color:C.textMuted, fontSize:12, marginTop:2 }}>
                  👤 {member?.name||"?"} · 📅 {t.deadline} · 
                  <span style={{ color:pColor[t.priority], background:pBg[t.priority], padding:"2px 8px", borderRadius:10, marginLeft:6, fontWeight:600, fontSize:11 }}>{t.priority}</span>
                </p>
              </div>
              <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", color:C.text, fontSize:12 }}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <button onClick={()=>deleteTask(t.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:12, padding:"5px 10px", borderRadius:6, cursor:"pointer" }}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminAttendance({ data, refresh }) {
  const [viewDate, setViewDate] = useState(today())
  const att = data.attendance[viewDate] || {}

  const resetStats = async (memberId) => {
    if (!confirm("Reset late count aur strikes?")) return
    await supabase.from('member_stats').update({ late_count:0, strikes:0 }).eq('member_id', memberId)
    refresh()
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20, flexWrap:"wrap" }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Attendance</h2>
        <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", color:C.text, fontSize:13 }} />
      </div>
      <div style={{ background:C.primaryLight, border:`1px solid ${C.primary}`, borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:C.primary }}>
        <strong>Late Policy:</strong> 3 lates = 3% penalty · 9 lates = 1 strike
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.members.map(m => {
          const a = att[m.id]
          const lc = data.stats[m.id]?.lateCount || 0
          const strikes = data.stats[m.id]?.strikes || 0
          const penalty = Math.floor(lc/3) * 3
          return (
            <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, color:"#fff" }}>{m.avatar}</div>
              <div style={{ flex:1 }}>
                <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name}</p>
                <p style={{ color:C.textMuted, fontSize:12 }}>Fixed: {m.checkin_time} · Lates: <strong>{lc}</strong> · Strikes: <strong style={{color:strikes>0?C.danger:C.textMuted}}>{strikes}</strong>{penalty>0 && <span style={{color:C.warning}}> · Penalty: {penalty}%</span>}</p>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {a ? (
                  <span style={{ background:a.status==="ontime"?C.successLight:C.warningLight, color:a.status==="ontime"?C.success:C.warning, fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>
                    {a.status==="ontime"?"✓ "+a.checkIn:"⚠ "+a.checkIn}
                  </span>
                ) : (
                  <span style={{ background:C.dangerLight, color:C.danger, fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>✗ Absent</span>
                )}
                {(lc>0||strikes>0) && <button onClick={()=>resetStats(m.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.warning, fontSize:11, padding:"5px 10px", borderRadius:6, cursor:"pointer" }}>Reset</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminReports({ data }) {
  const [viewDate, setViewDate] = useState(today())
  const reports = data.reports[viewDate] || {}

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, flexWrap:"wrap" }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Daily Reports</h2>
        <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", color:C.text, fontSize:13 }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {data.members.map(m => {
          const r = reports[m.id]
          return (
            <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:"#fff" }}>{m.avatar}</div>
                <div>
                  <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name}</p>
                  <p style={{ color:C.textMuted, fontSize:12 }}>{m.role}</p>
                </div>
                {r ? <span style={{ marginLeft:"auto", background:C.successLight, color:C.success, fontSize:11, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>✓ Submitted</span>
                  : <span style={{ marginLeft:"auto", background:C.dangerLight, color:C.danger, fontSize:11, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>Not submitted</span>}
              </div>
              {r && (
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div><p style={{ color:C.textMuted, fontSize:11, marginBottom:3 }}>Tasks completed</p><p style={{ color:C.text, fontSize:13 }}>{r.tasksCompleted||"-"}</p></div>
                  <div><p style={{ color:C.textMuted, fontSize:11, marginBottom:3 }}>Hours worked</p><p style={{ color:C.text, fontSize:13 }}>{r.hoursWorked||"-"}h</p></div>
                  {r.blockers && <div style={{ gridColumn:"1/-1" }}><p style={{ color:C.textMuted, fontSize:11, marginBottom:3 }}>Blockers</p><p style={{ color:C.warning, fontSize:13 }}>{r.blockers}</p></div>}
                  {r.notes && <div style={{ gridColumn:"1/-1" }}><p style={{ color:C.textMuted, fontSize:11, marginBottom:3 }}>Notes</p><p style={{ color:C.text, fontSize:13 }}>{r.notes}</p></div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============ MEMBER DASHBOARD ============
function MemberDashboard({ user, setUser, onLogout }) {
  const [tab, setTab] = useState("home")
  const [data, setData] = useState({ tasks:[], attendance:{}, reports:{}, stats:{} })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [{ data:tasks }, { data:att }, { data:reps }, { data:stats }] = await Promise.all([
      supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at'),
      supabase.from('attendance').select('*').eq('member_id', user.id),
      supabase.from('reports').select('*').eq('member_id', user.id),
      supabase.from('member_stats').select('*').eq('member_id', user.id).maybeSingle(),
    ])
    const attMap = {}; (att||[]).forEach(a=>{ attMap[a.date]={checkIn:a.check_in,checkOut:a.check_out,status:a.status,reason:a.reason,lateBy:a.late_by} })
    const repMap = {}; (reps||[]).forEach(r=>{ repMap[r.date]={tasksCompleted:r.tasks_completed,hoursWorked:r.hours_worked,blockers:r.blockers,notes:r.notes} })
    setData({ tasks:tasks||[], attendance:attMap, reports:repMap, stats:stats?{lateCount:stats.late_count, strikes:stats.strikes}:{lateCount:0,strikes:0} })
    setLoading(false)
  }, [user.id])

  useEffect(() => { refresh() }, [refresh])

  if (loading) return <Loader />

  const tabs = [
    { id:"home", label:"Home", icon:"🏠" },
    { id:"checkin", label:"Attendance", icon:"🕐" },
    { id:"tasks", label:"My Tasks", icon:"✅" },
    { id:"report", label:"Daily Report", icon:"📋" },
  ]

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:getColor(user.id), borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:"#fff" }}>{user.avatar}</div>
          <div>
            <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>{user.name}</p>
            <p style={{ color:C.textMuted, fontSize:11 }}>{user.role}</p>
          </div>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, padding:"7px 16px", borderRadius:8, cursor:"pointer" }}>Logout</button>
      </div>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", gap:4, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ background:"transparent", border:"none", borderBottom:tab===t.id?`2px solid ${C.primary}`:"2px solid transparent", color:tab===t.id?C.primary:C.textMuted, padding:"14px 14px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontWeight:tab===t.id?600:500 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, padding:20, overflowY:"auto" }}>
        {tab==="home" && <MemberHome data={data} user={user} />}
        {tab==="checkin" && <MemberCheckin data={data} user={user} refresh={refresh} />}
        {tab==="tasks" && <MemberTasks data={data} user={user} refresh={refresh} />}
        {tab==="report" && <MemberReport data={data} user={user} refresh={refresh} />}
      </div>
    </div>
  )
}

function MemberHome({ data, user }) {
  const td = today()
  const att = data.attendance[td]
  const pending = data.tasks.filter(t=>t.status==="pending").length
  const done = data.tasks.filter(t=>t.status==="done").length
  const overdue = data.tasks.filter(t=>t.status!=="done" && isPastDate(t.deadline)).length
  const reportDone = !!data.reports[td]
  const lc = data.stats.lateCount
  const strikes = data.stats.strikes
  const penalty = Math.floor(lc/3)*3

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:22, fontWeight:700, marginBottom:4 }}>Assalam u Alaikum, {user.name.split(" ")[0]}! 👋</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:24 }}>{td}</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12, marginBottom:6 }}>Attendance Today</p>
          {att ? <p style={{ color:att.status==="ontime"?C.success:C.warning, fontSize:20, fontWeight:700 }}>{att.status==="ontime"?"✓ On Time":"⚠ Late"}</p>
            : <p style={{ color:C.danger, fontSize:18, fontWeight:700 }}>✗ Not checked in</p>}
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12, marginBottom:6 }}>Lates · Strikes</p>
          <p style={{ color:strikes>0?C.danger:lc>0?C.warning:C.success, fontSize:20, fontWeight:700 }}>{lc} · {strikes}</p>
          {penalty>0 && <p style={{ color:C.warning, fontSize:11, marginTop:2 }}>{penalty}% penalty</p>}
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12, marginBottom:6 }}>Tasks</p>
          <p style={{ color:C.warning, fontSize:20, fontWeight:700 }}>{pending} pending</p>
          <p style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>{done} done{overdue>0 && ` · ${overdue} overdue`}</p>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12, marginBottom:6 }}>Daily Report</p>
          <p style={{ color:reportDone?C.success:C.danger, fontSize:18, fontWeight:700 }}>{reportDone?"✓ Submitted":"Pending"}</p>
        </div>
      </div>
    </div>
  )
}

function MemberCheckin({ data, user, refresh }) {
  const [now, setNow] = useState(nowHHMM())
  const [lateReason, setLateReason] = useState("")
  const td = today()
  const att = data.attendance[td]

  useEffect(() => {
    const t = setInterval(()=>setNow(nowHHMM()), 30000)
    return ()=>clearInterval(t)
  }, [])

  const fixedMin = timeToMin(user.checkinTime||"09:00")
  const nowMin = timeToMin(now)
  const windowOpen = nowMin >= fixedMin && nowMin <= fixedMin+15
  const windowPast = nowMin > fixedMin+15

  const doCheckin = async () => {
    if (att?.checkIn) return
    const isLate = nowMin > fixedMin
    if (isLate && !lateReason.trim()) { alert("Late reason zaroori hai!"); return }
    const status = isLate ? "late" : "ontime"
    const lateBy = isLate ? nowMin - fixedMin : 0
    const { error } = await supabase.from('attendance').upsert({ member_id:user.id, date:td, check_in:now, status, reason:lateReason||null, late_by:lateBy }, { onConflict:'member_id,date' })
    if (error) { alert("Error: " + error.message); return }
    if (isLate) {
      const newLc = data.stats.lateCount + 1
      const addStrike = newLc % 9 === 0
      await supabase.from('member_stats').upsert({ member_id:user.id, late_count:newLc, strikes:data.stats.strikes + (addStrike?1:0) }, { onConflict:'member_id' })
    }
    setLateReason("")
    refresh()
  }

  const doCheckout = async () => {
    if (!att?.checkIn || att?.checkOut) return
    await supabase.from('attendance').update({ check_out:now }).eq('member_id', user.id).eq('date', td)
    refresh()
  }

  const lc = data.stats.lateCount

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:6 }}>Attendance</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>3 lates = 3% penalty · 9 lates = 1 strike</p>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, textAlign:"center", marginBottom:20 }}>
        <p style={{ color:C.textMuted, fontSize:13, marginBottom:8 }}>Current time</p>
        <p style={{ color:C.text, fontSize:44, fontWeight:700, marginBottom:6 }}>{now}</p>
        <p style={{ color:C.textMuted, fontSize:13 }}>Your check-in: <strong style={{ color:C.primary }}>{user.checkinTime}</strong></p>
      </div>
      {!att?.checkIn ? (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24, textAlign:"center" }}>
          {windowOpen && (
            <div>
              <p style={{ color:nowMin>fixedMin?C.warning:C.success, fontSize:14, marginBottom:8, fontWeight:600 }}>{nowMin>fixedMin?"Window open (late side)":"Window open!"}</p>
              {nowMin>fixedMin && (
                <input value={lateReason} onChange={e=>setLateReason(e.target.value)} placeholder="Late reason..."
                  style={{ marginBottom:10, width:"100%", maxWidth:300, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:13, boxSizing:"border-box" }} />
              )}
              <br/>
              <button onClick={doCheckin} style={{ background:nowMin>fixedMin?C.warning:C.success, border:"none", color:"#fff", padding:"14px 40px", borderRadius:10, fontSize:16, fontWeight:600, cursor:"pointer" }}>
                {nowMin>fixedMin?"⚠ Check In (Late)":"✓ Check In"}
              </button>
            </div>
          )}
          {!windowOpen && !windowPast && (
            <p style={{ color:C.textMuted, fontSize:14 }}>Window opens in {fixedMin - nowMin} min</p>
          )}
          {windowPast && (
            <div>
              <p style={{ color:C.danger, fontSize:14, marginBottom:12, fontWeight:600 }}>Window closed. Late check-in?</p>
              <input value={lateReason} onChange={e=>setLateReason(e.target.value)} placeholder="Reason..."
                style={{ width:"100%", maxWidth:300, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:10, boxSizing:"border-box" }} />
              <br/>
              <button onClick={doCheckin} style={{ background:C.warning, border:"none", color:"#fff", padding:"12px 32px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>⚠ Late Check-in</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
          <div style={{ display:"flex", gap:16 }}>
            <div style={{ flex:1, background:C.bg, borderRadius:10, padding:14 }}>
              <p style={{ color:C.textMuted, fontSize:12 }}>Checked in</p>
              <p style={{ color:att.status==="ontime"?C.success:C.warning, fontSize:22, fontWeight:700 }}>{att.checkIn}</p>
            </div>
            {att.checkOut ? (
              <div style={{ flex:1, background:C.bg, borderRadius:10, padding:14 }}>
                <p style={{ color:C.textMuted, fontSize:12 }}>Checked out</p>
                <p style={{ color:C.primary, fontSize:22, fontWeight:700 }}>{att.checkOut}</p>
              </div>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <button onClick={doCheckout} style={{ background:C.primary, border:"none", color:"#fff", padding:"12px 24px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Check Out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MemberTasks({ data, user, refresh }) {
  const pColor = { high:C.danger, medium:C.warning, low:C.success }
  const pBg = { high:C.dangerLight, medium:C.warningLight, low:C.successLight }

  const updateStatus = async (id, status) => {
    await supabase.from('tasks').update({ status, progress: status==="done"?100:undefined }).eq('id', id)
    refresh()
  }

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:20 }}>My Tasks ({data.tasks.length})</h2>
      {data.tasks.length===0 && (
        <div style={{ textAlign:"center", padding:40, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:12 }}>
          <p style={{ color:C.textMuted, fontSize:14 }}>🎉 Koi task assign nahi hua!</p>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.tasks.map(t => {
          const overdue = t.status!=="done" && isPastDate(t.deadline)
          return (
            <div key={t.id} style={{ background:overdue?C.dangerLight:C.surface, border:`1px solid ${overdue?C.danger:C.border}`, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:4, height:40, background:pColor[t.priority], borderRadius:2 }} />
                <div style={{ flex:1 }}>
                  <p style={{ color:t.status==="done"?C.textMuted:C.text, fontWeight:600, fontSize:14, textDecoration:t.status==="done"?"line-through":"none" }}>
                    {t.title} {overdue && <span style={{ background:C.danger, color:"#fff", fontSize:10, padding:"2px 6px", borderRadius:4, marginLeft:6 }}>OVERDUE</span>}
                  </p>
                  <p style={{ color:C.textMuted, fontSize:12, marginTop:2 }}>
                    📅 {t.deadline} · <span style={{ color:pColor[t.priority], background:pBg[t.priority], padding:"2px 8px", borderRadius:10, marginLeft:4, fontWeight:600, fontSize:11 }}>{t.priority}</span>
                  </p>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {t.status!=="done" && (
                    <>
                      {t.status!=="in-progress" && <button onClick={()=>updateStatus(t.id,"in-progress")} style={{ background:C.primaryLight, border:"none", color:C.primary, fontSize:12, padding:"6px 12px", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Start</button>}
                      <button onClick={()=>updateStatus(t.id,"done")} style={{ background:C.successLight, border:"none", color:C.success, fontSize:12, padding:"6px 12px", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Done ✓</button>
                    </>
                  )}
                  {t.status==="done" && <span style={{ color:C.success, fontSize:12, fontWeight:600 }}>✓ Completed</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MemberReport({ data, user, refresh }) {
  const td = today()
  const existing = data.reports[td]
  const [form, setForm] = useState(existing || { tasksCompleted:"", hoursWorked:"", blockers:"", notes:"" })
  const [submitted, setSubmitted] = useState(!!existing)

  const submitReport = async () => {
    if (!form.tasksCompleted||!form.hoursWorked) { alert("Tasks aur hours zaroori hain!"); return }
    const { error } = await supabase.from('reports').upsert({
      member_id:user.id, date:td, tasks_completed:form.tasksCompleted, hours_worked:form.hoursWorked,
      blockers:form.blockers||null, notes:form.notes||null, submitted_at:nowHHMM()
    }, { onConflict:'member_id,date' })
    if (error) { alert("Error: " + error.message); return }
    setSubmitted(true)
    refresh()
  }

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:4 }}>Daily Report</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>{td}</p>
      {submitted ? (
        <div style={{ background:C.successLight, border:`1px solid ${C.success}`, borderRadius:16, padding:24 }}>
          <p style={{ color:C.success, fontSize:18, fontWeight:700, marginBottom:6 }}>✓ Report submitted!</p>
          <div style={{ background:"#fff", borderRadius:10, padding:16, marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><p style={{ color:C.textMuted, fontSize:11 }}>Tasks completed</p><p style={{ color:C.text, fontSize:14 }}>{form.tasksCompleted}</p></div>
            <div><p style={{ color:C.textMuted, fontSize:11 }}>Hours worked</p><p style={{ color:C.text, fontSize:14 }}>{form.hoursWorked}h</p></div>
            {form.blockers && <div style={{ gridColumn:"1/-1" }}><p style={{ color:C.textMuted, fontSize:11 }}>Blockers</p><p style={{ color:C.warning, fontSize:13 }}>{form.blockers}</p></div>}
            {form.notes && <div style={{ gridColumn:"1/-1" }}><p style={{ color:C.textMuted, fontSize:11 }}>Notes</p><p style={{ color:C.text, fontSize:13 }}>{form.notes}</p></div>}
          </div>
          <button onClick={()=>setSubmitted(false)} style={{ marginTop:14, background:"transparent", border:`1px solid ${C.success}`, color:C.success, padding:"8px 18px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Edit</button>
        </div>
      ) : (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:6, fontWeight:500 }}>Tasks completed *</label>
              <input value={form.tasksCompleted} onChange={e=>setForm(f=>({...f,tasksCompleted:e.target.value}))}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }} placeholder="e.g. Login fix" />
            </div>
            <div>
              <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:6, fontWeight:500 }}>Hours worked *</label>
              <input type="number" min="0" max="24" step="0.5" value={form.hoursWorked} onChange={e=>setForm(f=>({...f,hoursWorked:e.target.value}))}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }} placeholder="e.g. 7.5" />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:6, fontWeight:500 }}>Blockers (optional)</label>
            <input value={form.blockers} onChange={e=>setForm(f=>({...f,blockers:e.target.value}))}
              style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, boxSizing:"border-box" }} placeholder="Koi rukawat..." />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ color:C.text, fontSize:12, display:"block", marginBottom:6, fontWeight:500 }}>Notes</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3}
              style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, boxSizing:"border-box", resize:"vertical", fontFamily:"inherit" }} placeholder="Additional notes..." />
          </div>
          <button onClick={submitReport} style={{ background:C.primary, border:"none", color:"#fff", padding:"12px 28px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Submit Report →</button>
        </div>
      )}
    </div>
  )
}
