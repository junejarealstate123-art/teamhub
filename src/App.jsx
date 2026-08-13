import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ============ TIMEZONE: PAKISTAN (Asia/Karachi) LOCKED ============
const TZ = 'Asia/Karachi'

const today = () => {
  // Get date in Pakistan timezone as YYYY-MM-DD
  const d = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(d)
  return parts // en-CA gives YYYY-MM-DD
}

const nowHHMM = () => {
  // Get HH:MM in Pakistan timezone (24hr for calculations)
  const d = new Date()
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour:'2-digit', minute:'2-digit', hour12:false }).format(d)
}

// Convert HH:MM (24hr) to "9:00 AM" style
const to12 = (hhmm) => {
  if (!hhmm) return "—"
  const [h, m] = hhmm.split(":").map(Number)
  if (isNaN(h) || isNaN(m)) return hhmm
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${String(m).padStart(2,"0")} ${period}`
}

const timeToMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60+m }
const isPastDate = (d) => new Date(d) < new Date(today())

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
const genPassword = () => Math.random().toString(36).slice(-6)

const CATEGORY_COLORS = { "Gold":"#f59e0b", "Silver":"#9ca3af", "Experimental":"#8b5cf6" }
const catColor = (name) => CATEGORY_COLORS[name] || "#4f46e5"

const LINK_TYPES = [
  { value:"sheet", label:"📊 Google Sheet" },
  { value:"drive", label:"📁 Google Drive" },
  { value:"doc", label:"📄 Google Doc" },
  { value:"website", label:"🌐 Website" },
  { value:"other", label:"🔗 Other" },
]

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
    const { data, error } = await supabase.from('members').select('*').eq('email', email).eq('password', loginForm.password).maybeSingle()
    if (error) { setLoginError("Connection error: " + error.message); return }
    if (!data) { setLoginError("Email ya password galat hai!"); return }
    // Check if user is lead of ANY group (team OR cgp)
    const { data: leadOf } = await supabase.from('teams').select('id').eq('team_lead_id', data.id)
    const isAnyLead = (leadOf || []).length > 0
    const userData = {
      id: data.id, name: data.name, email: data.email, role: data.role,
      checkinTime: data.checkin_time,
      endTime: data.end_time || "18:00",
      graceMinutes: data.grace_minutes ?? 15,
      jobDescription: data.job_description || "",
      avatar: data.avatar || data.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      isAdmin: data.is_admin,
      isManager: !data.is_admin && !!data.is_manager,
      isTeamLead: !data.is_admin && !data.is_manager && (data.is_team_lead || isAnyLead),
      teamId: data.team_id,
      cgpId: data.cgp_id,
      cgpIds: [data.cgp_id, data.cgp_id_2, data.cgp_id_3].filter(Boolean),
      leadOfIds: (leadOf || []).map(x => x.id)
    }
    localStorage.setItem("teamhub-user", JSON.stringify(userData))
    setUser(userData)
  }

  const onLogout = () => { localStorage.removeItem("teamhub-user"); setUser(null) }

  if (loading) return <Loader />
  if (!user) return <LoginScreen form={loginForm} setForm={setLoginForm} onLogin={handleLogin} error={loginError} />
  if (user.isAdmin) return <AdminDashboard user={user} onLogout={onLogout} />
  if (user.isManager) return <ManagerDashboard user={user} onLogout={onLogout} />
  if (user.isTeamLead) return <TeamLeadDashboard user={user} onLogout={onLogout} />
  return <MemberDashboard user={user} onLogout={onLogout} />
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
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28 }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", color:C.text, fontSize:13, marginBottom:6, fontWeight:500 }}>Email</label>
            <input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} onKeyDown={e => e.key==="Enter" && onLogin()}
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", fontSize:14, boxSizing:"border-box" }} placeholder="Enter your email" />
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", color:C.text, fontSize:13, marginBottom:6, fontWeight:500 }}>Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} onKeyDown={e => e.key==="Enter" && onLogin()}
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", fontSize:14, boxSizing:"border-box" }} placeholder="Enter your password" />
          </div>
          {error && <p style={{ color:C.danger, fontSize:13, marginBottom:12, background:C.dangerLight, padding:"8px 12px", borderRadius:6 }}>{error}</p>}
          <button onClick={onLogin} style={{ width:"100%", background:C.primary, border:"none", borderRadius:10, padding:"12px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>Login →</button>
        </div>
      </div>
    </div>
  )
}

// ============ SHARED: TikTok Sheet ============
function TikTokSheet({ teamId, canEdit, filterByUserId, userName, showAccountType }) {
  // Show partnership only when admin toggles it on (from Overview)
  const [showTypeCol, setShowTypeCol] = useState(() => showAccountType && localStorage.getItem('teamhub-show-partnership') === 'true')
  useEffect(() => {
    const handler = () => setShowTypeCol(showAccountType && localStorage.getItem('teamhub-show-partnership') === 'true')
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [showAccountType])
  const toggleTypeCol = () => {
    const v = !showTypeCol
    setShowTypeCol(v)
    localStorage.setItem('teamhub-show-partnership', String(v))
  }
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [groupMembers, setGroupMembers] = useState([])
  const [comments, setComments] = useState({}) // account_id -> array of comments
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ account_name:"", niche:"", tiktok_link:"", video_source:"", competitor_link:"", category:"", assigned_to:"", account_type:"own" })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [commentText, setCommentText] = useState({})
  const [dragId, setDragId] = useState(null)
  const td = today()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data:accs }, { data:cats }, { data:allMembers }, { data:teams }, { data:coms }] = await Promise.all([
      supabase.from('tiktok_accounts').select('*').eq('team_id', teamId).order('sort_order', { nullsFirst:false }).order('created_at'),
      supabase.from('account_categories').select('*').order('created_at'),
      supabase.from('members').select('*').eq('is_admin', false),
      supabase.from('teams').select('id, name, group_type'),
      supabase.from('account_comments').select('*').order('created_at'),
    ])
    setAccounts(accs || [])
    setCategories(cats || [])
    const teamsMap = Object.fromEntries((teams||[]).map(t => [t.id, t]))
    const currentGroup = teamsMap[teamId]
    const isCurrentCGP = currentGroup?.group_type === 'cgp'
    // Only members who belong to this specific group (team or CGP)
    const memberList = (allMembers||[]).filter(m => isCurrentCGP
      ? (m.cgp_id === teamId || m.cgp_id_2 === teamId || m.cgp_id_3 === teamId)
      : (m.team_id === teamId)
    )
    const annotated = memberList.map(m => ({ ...m, label: m.name, inThisGroup: true }))
    setGroupMembers(annotated)
    const cMap = {}
    ;(coms || []).forEach(c => { if (!cMap[c.account_id]) cMap[c.account_id] = []; cMap[c.account_id].push(c) })
    setComments(cMap)
    setLoading(false)
  }, [teamId])

  useEffect(() => { load() }, [load])

  const isDone = (acc) => acc.status === 'done' && acc.status_date === td

  const handleCategoryChange = async (value, setFn) => {
    if (value === "__new__") {
      const name = prompt("Nayi category ka naam likhein:")
      if (!name || !name.trim()) return
      const id = "cat"+Date.now()
      await supabase.from('account_categories').insert({ id, name:name.trim() })
      setCategories(c => [...c, { id, name:name.trim() }])
      setFn(name.trim())
    } else {
      setFn(value)
    }
  }

  const addAccount = async () => {
    if (!form.account_name.trim()) { alert("Account name zaroori hai!"); return }
    await supabase.from('tiktok_accounts').insert({ id:"acc"+Date.now(), team_id:teamId, ...form, status:'not_yet', status_date:null })
    setForm({ account_name:"", niche:"", tiktok_link:"", video_source:"", competitor_link:"", category:"", assigned_to:"", account_type:"own" })
    setAdding(false)
    load()
  }

  const saveEdit = async () => {
    if (!editForm.account_name.trim()) return alert("Name zaroori hai!")
    const { error } = await supabase.from('tiktok_accounts').update(editForm).eq('id', editId)
    if (error) { alert("❌ Save failed: " + error.message + "\n\nDetails: " + (error.details||error.hint||"—")); return }
    setEditId(null); setEditForm(null)
    load()
  }

  const deleteAccount = async (id) => {
    if (!confirm("Delete this account?")) return
    await supabase.from('tiktok_accounts').delete().eq('id', id)
    load()
  }

  const toggleStatus = async (acc) => {
    const nowDone = isDone(acc)
    const newStatus = nowDone ? 'not_yet' : 'done'
    await supabase.from('tiktok_accounts').update({ status:newStatus, status_date:td }).eq('id', acc.id)
    setAccounts(a => a.map(x => x.id===acc.id ? {...x, status:newStatus, status_date:td} : x))
  }

  const addComment = async (accId) => {
    const text = (commentText[accId]||"").trim()
    if (!text) return
    const author = userName || "User"
    await supabase.from('account_comments').insert({ id:"c"+Date.now(), account_id:accId, author, text })
    setCommentText(t => ({...t, [accId]:""}))
    load()
  }

  const deleteComment = async (id) => {
    if (!confirm("Delete comment?")) return
    await supabase.from('account_comments').delete().eq('id', id)
    load()
  }

  const handleDragStart = (id) => setDragId(id)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = async (targetId, displayList) => {
    if (!dragId || dragId === targetId) { setDragId(null); return }
    const dragIdx = displayList.findIndex(a => a.id === dragId)
    const targetIdx = displayList.findIndex(a => a.id === targetId)
    if (dragIdx < 0 || targetIdx < 0) { setDragId(null); return }
    const newList = [...displayList]
    const [moved] = newList.splice(dragIdx, 1)
    newList.splice(targetIdx, 0, moved)
    // Assign new sort_order values (100 apart)
    const updates = newList.map((a, i) => ({ id: a.id, sort_order: (i+1)*100 }))
    // Optimistic UI
    setAccounts(prev => {
      const map = Object.fromEntries(updates.map(u => [u.id, u.sort_order]))
      return [...prev].sort((a,b) => (map[a.id] ?? a.sort_order ?? 0) - (map[b.id] ?? b.sort_order ?? 0)).map(a => ({...a, sort_order: map[a.id] ?? a.sort_order}))
    })
    setDragId(null)
    // Persist
    await Promise.all(updates.map(u => supabase.from('tiktok_accounts').update({ sort_order:u.sort_order }).eq('id', u.id)))
  }

  if (loading) return <p style={{ color:C.textMuted, fontSize:13 }}>Loading...</p>

  const catSelect = (value, onChange) => (
    <select value={value||""} onChange={e=>handleCategoryChange(e.target.value, onChange)}
      style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", width:"100%" }}>
      <option value="">-- Category --</option>
      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
      {canEdit && <option value="__new__">➕ New category...</option>}
    </select>
  )

  return (
    <div>
      <div style={{ background:C.primaryLight, border:`1px solid ${C.primary}`, borderRadius:8, padding:"8px 14px", marginBottom:14, fontSize:12, color:C.primary }}>
        ⏰ Status har naye din automatically "Not Yet" ho jata hai
      </div>
      {canEdit && (
        <div style={{ marginBottom:14, display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"8px 18px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
            {adding ? "Cancel" : "+ Add Account"}
          </button>
          {showAccountType && (
            <button onClick={toggleTypeCol} style={{ background: showTypeCol ? C.orange : "transparent", border:`1px solid ${showTypeCol ? C.orange : C.border}`, color: showTypeCol ? "#fff" : C.textMuted, padding:"8px 14px", borderRadius:8, fontSize:12, cursor:"pointer", fontWeight:600 }}>
              {showTypeCol ? "🙈 Hide" : "👁️ Show"} Own/Partnership
            </button>
          )}
        </div>
      )}
      {adding && canEdit && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <input value={form.account_name} onChange={e=>setForm(f=>({...f,account_name:e.target.value}))} placeholder="Account Name *" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <input value={form.niche} onChange={e=>setForm(f=>({...f,niche:e.target.value}))} placeholder="Niche" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <input value={form.tiktok_link} onChange={e=>setForm(f=>({...f,tiktok_link:e.target.value}))} placeholder="TikTok Link" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <input value={form.video_source} onChange={e=>setForm(f=>({...f,video_source:e.target.value}))} placeholder="Video Source" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <input value={form.competitor_link} onChange={e=>setForm(f=>({...f,competitor_link:e.target.value}))} placeholder="Competitor Link" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            {catSelect(form.category, (v)=>setForm(f=>({...f,category:v})))}
            <select value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">👤 Unassigned</option>
              {groupMembers.map(m => <option key={m.id} value={m.id}>👤 {m.label}</option>)}
            </select>
            {showTypeCol && (
              <select value={form.account_type} onChange={e=>setForm(f=>({...f,account_type:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
                <option value="own">🏢 Own</option>
                <option value="partnership">🤝 Partnership</option>
              </select>
            )}
          </div>
          <button onClick={addAccount} style={{ background:C.success, border:"none", color:"#fff", padding:"8px 20px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:600 }}>Save Account</button>
        </div>
      )}

      {(() => {
        const displayAccounts = filterByUserId
          ? accounts.filter(a => a.assigned_to === filterByUserId)
          : accounts
        return displayAccounts.length === 0 ? (
        <div style={{ textAlign:"center", padding:30, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:10 }}>
          <p style={{ color:C.textMuted, fontSize:14 }}>{filterByUserId ? "🎯 Aapko koi account assign nahi hai abhi. Team Lead se poochein." : "Koi TikTok account nahi hai abhi."}</p>
        </div>
      ) : (
        <div style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderRadius:10 }}>
          <table style={{ borderCollapse:"collapse", width:"100%", fontSize:13, minWidth:1100 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {canEdit && <th style={{ padding:"10px 6px", textAlign:"center", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}`, width:32 }} title="Drag to reorder"></th>}
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>#</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Account</th>
                {!filterByUserId && <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Assigned To</th>}
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Category</th>
                {showTypeCol && <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Type</th>}
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Niche</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>TikTok</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Source</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Competitor</th>
                <th style={{ padding:"10px 12px", textAlign:"center", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Status</th>
                <th style={{ padding:"10px 12px", textAlign:"center", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Notes</th>
                {canEdit && <th style={{ padding:"10px 12px", textAlign:"center", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayAccounts.map((acc, idx) => {
                const accComments = comments[acc.id] || []
                const rows = []
                if (editId === acc.id) {
                  rows.push(
                <tr key={acc.id} style={{ borderBottom:`1px solid ${C.border}`, background:C.primaryLight }}>
                  {canEdit && <td style={{ padding:"8px", textAlign:"center", color:C.textLight }}>≡</td>}
                  <td style={{ padding:"8px 12px" }}>{idx+1}</td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.account_name} onChange={e=>setEditForm(f=>({...f,account_name:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  {!filterByUserId && <td style={{ padding:"6px 8px" }}>
                    <select value={editForm.assigned_to||""} onChange={e=>setEditForm(f=>({...f,assigned_to:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }}>
                      <option value="">👤 Unassigned</option>
                      {groupMembers.map(m => <option key={m.id} value={m.id}>👤 {m.label}</option>)}
                    </select>
                  </td>}
                  <td style={{ padding:"6px 8px" }}>{catSelect(editForm.category, (v)=>setEditForm(f=>({...f,category:v})))}</td>
                  {showTypeCol && (
                    <td style={{ padding:"6px 8px" }}>
                      <select value={editForm.account_type||"own"} onChange={e=>setEditForm(f=>({...f,account_type:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }}>
                        <option value="own">🏢 Own</option>
                        <option value="partnership">🤝 Partnership</option>
                      </select>
                    </td>
                  )}
                  <td style={{ padding:"6px 8px" }}><input value={editForm.niche} onChange={e=>setEditForm(f=>({...f,niche:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.tiktok_link} onChange={e=>setEditForm(f=>({...f,tiktok_link:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.video_source} onChange={e=>setEditForm(f=>({...f,video_source:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.competitor_link||""} onChange={e=>setEditForm(f=>({...f,competitor_link:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"8px", textAlign:"center", color:C.textMuted }}>—</td>
                  <td style={{ padding:"8px", textAlign:"center", color:C.textMuted }}>—</td>
                  <td style={{ padding:"8px", textAlign:"center" }}>
                    <button onClick={saveEdit} style={{ background:C.success, border:"none", color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer", marginRight:4 }}>Save</button>
                    <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>✕</button>
                  </td>
                </tr>
                  )
                } else {
                  rows.push(
                <tr key={acc.id} draggable={canEdit} onDragStart={()=>handleDragStart(acc.id)} onDragOver={handleDragOver} onDrop={()=>handleDrop(acc.id, displayAccounts)} style={{ borderBottom:`1px solid ${C.border}`, opacity: dragId===acc.id ? 0.4 : 1 }}>
                  {canEdit && <td style={{ padding:"10px 6px", textAlign:"center", color:C.textLight, cursor:"grab", userSelect:"none", fontSize:16 }} title="Drag to reorder">≡</td>}
                  <td style={{ padding:"10px 12px", color:C.textMuted }}>{idx+1}</td>
                  <td style={{ padding:"10px 12px", color:C.text, fontWeight:500 }}>{acc.account_name}</td>
                  {!filterByUserId && <td style={{ padding:"10px 12px" }}>
                    {acc.assigned_to ? (() => {
                      const m = groupMembers.find(x => x.id === acc.assigned_to)
                      return m ? <span style={{ background:C.primaryLight, color:C.primary, fontSize:11, padding:"3px 10px", borderRadius:12, fontWeight:600 }}>👤 {m.name}</span> : <span style={{ color:C.textMuted, fontSize:11 }}>?</span>
                    })() : <span style={{ color:C.textLight, fontSize:11 }}>Unassigned</span>}
                  </td>}
                  <td style={{ padding:"10px 12px" }}>
                    {acc.category ? <span style={{ background:catColor(acc.category)+"22", color:catColor(acc.category), fontSize:11, padding:"3px 10px", borderRadius:12, fontWeight:600 }}>{acc.category}</span> : "—"}
                  </td>
                  {showTypeCol && (
                    <td style={{ padding:"10px 12px" }}>
                      {(acc.account_type||"own") === "partnership" 
                        ? <span style={{ background:C.orangeLight, color:C.orange, fontSize:11, padding:"3px 10px", borderRadius:12, fontWeight:600 }}>🤝 Partnership</span>
                        : <span style={{ background:C.successLight, color:C.success, fontSize:11, padding:"3px 10px", borderRadius:12, fontWeight:600 }}>🏢 Own</span>}
                    </td>
                  )}
                  <td style={{ padding:"10px 12px" }}>{acc.niche || "—"}</td>
                  <td style={{ padding:"10px 12px" }}>{acc.tiktok_link ? <a href={acc.tiktok_link} target="_blank" rel="noopener noreferrer" style={{ color:C.primary, fontSize:12 }}>Open →</a> : "—"}</td>
                  <td style={{ padding:"10px 12px" }}>{acc.video_source || "—"}</td>
                  <td style={{ padding:"10px 12px" }}>{acc.competitor_link ? <a href={acc.competitor_link} target="_blank" rel="noopener noreferrer" style={{ color:C.warning, fontSize:12 }}>🎯 Open</a> : "—"}</td>
                  <td style={{ padding:"8px", textAlign:"center" }}>
                    <button onClick={()=>toggleStatus(acc)} style={{ background:isDone(acc)?C.successLight:C.dangerLight, color:isDone(acc)?C.success:C.danger, border:"none", borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      {isDone(acc) ? "✓ Done" : "Not Yet"}
                    </button>
                  </td>
                  <td style={{ padding:"8px", textAlign:"center" }}>
                    <button onClick={()=>setExpandedId(expandedId===acc.id?null:acc.id)} style={{ background:accComments.length>0?C.warningLight:"transparent", color:accComments.length>0?C.warning:C.textMuted, border:`1px solid ${accComments.length>0?C.warning:C.border}`, fontSize:11, padding:"5px 10px", borderRadius:6, cursor:"pointer", fontWeight:600 }}>💬 {accComments.length}</button>
                  </td>
                  {canEdit && (
                    <td style={{ padding:"8px", textAlign:"center" }}>
                      <button onClick={()=>{setEditId(acc.id); setEditForm({account_name:acc.account_name, niche:acc.niche||"", tiktok_link:acc.tiktok_link||"", video_source:acc.video_source||"", competitor_link:acc.competitor_link||"", category:acc.category||"", assigned_to:acc.assigned_to||"", account_type:acc.account_type||"own"})}} style={{ background:C.primaryLight, border:"none", color:C.primary, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer", marginRight:4, fontWeight:600 }}>Edit</button>
                      <button onClick={()=>deleteAccount(acc.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>✕</button>
                    </td>
                  )}
                </tr>
                  )
                }
                if (expandedId === acc.id) {
                  const totalCols = 9 + (canEdit?2:0) + (!filterByUserId?1:0) + (showTypeCol?1:0)
                  rows.push(
                    <tr key={acc.id+"_c"} style={{ background:C.bg }}>
                      <td colSpan={totalCols} style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}` }}>
                        <p style={{ color:C.text, fontWeight:600, fontSize:13, marginBottom:10 }}>💬 Notes / Changes for "{acc.account_name}"</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10, maxHeight:200, overflowY:"auto" }}>
                          {accComments.length === 0 ? (
                            <p style={{ color:C.textMuted, fontSize:12, fontStyle:"italic" }}>Koi note nahi hai abhi. Pehla note likho.</p>
                          ) : accComments.map(c => (
                            <div key={c.id} style={{ background:C.surface, borderRadius:6, padding:"8px 10px", border:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"start", gap:8 }}>
                              <div style={{ flex:1 }}>
                                <p style={{ color:C.primary, fontSize:11, fontWeight:600 }}>{c.author} <span style={{ color:C.textLight, fontWeight:400 }}>· {new Date(c.created_at).toLocaleString('en-GB',{ timeZone:TZ, day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span></p>
                                <p style={{ color:C.text, fontSize:13, marginTop:2, whiteSpace:"pre-wrap" }}>{c.text}</p>
                              </div>
                              <button onClick={()=>deleteComment(c.id)} style={{ background:"transparent", border:"none", color:C.danger, fontSize:12, cursor:"pointer", padding:"2px 6px" }} title="Delete">✕</button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <input value={commentText[acc.id]||""} onChange={e=>setCommentText(t=>({...t,[acc.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addComment(acc.id)} placeholder="Note / change likho..." style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 10px", fontSize:13, boxSizing:"border-box" }} />
                          <button onClick={()=>addComment(acc.id)} style={{ background:C.primary, border:"none", color:"#fff", padding:"7px 16px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>Add</button>
                        </div>
                      </td>
                    </tr>
                  )
                }
                return rows
              })}
            </tbody>
          </table>
        </div>
      )
      })()}
    </div>
  )
}

// ============ SHARED: Team Links ============
function TeamLinks({ teamId, canEdit }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name:"", url:"", link_type:"sheet", notes:"" })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('team_links').select('*').eq('team_id', teamId).order('created_at')
    setLinks(data || [])
    setLoading(false)
  }, [teamId])

  useEffect(() => { load() }, [load])

  const addLink = async () => {
    if (!form.name.trim() || !form.url.trim()) return alert("Name aur URL zaroori hai!")
    await supabase.from('team_links').insert({ id:"link"+Date.now(), team_id:teamId, ...form })
    setForm({ name:"", url:"", link_type:"sheet", notes:"" })
    setAdding(false)
    load()
  }

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.url.trim()) return alert("Name aur URL zaroori!")
    await supabase.from('team_links').update(editForm).eq('id', editId)
    setEditId(null); setEditForm(null)
    load()
  }

  const deleteLink = async (id) => {
    if (!confirm("Delete link?")) return
    await supabase.from('team_links').delete().eq('id', id)
    load()
  }

  if (loading) return <p style={{ color:C.textMuted, fontSize:13 }}>Loading...</p>

  return (
    <div>
      {canEdit && (
        <div style={{ marginBottom:14 }}>
          <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"8px 18px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
            {adding ? "Cancel" : "+ Add Link"}
          </button>
        </div>
      )}
      {adding && canEdit && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Link Name" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <select value={form.link_type} onChange={e=>setForm(f=>({...f,link_type:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
              {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="URL" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes (optional)" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <button onClick={addLink} style={{ background:C.success, border:"none", color:"#fff", padding:"8px 20px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:600 }}>Save Link</button>
        </div>
      )}

      {links.length === 0 ? (
        <div style={{ textAlign:"center", padding:30, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:10 }}>
          <p style={{ color:C.textMuted, fontSize:14 }}>Koi link nahi hai abhi.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {links.map(link => {
            const typeLabel = LINK_TYPES.find(t=>t.value===link.link_type)?.label || "🔗 Other"
            return editId === link.id ? (
              <div key={link.id} style={{ background:C.surface, border:`2px solid ${C.primary}`, borderRadius:10, padding:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, boxSizing:"border-box" }} />
                  <select value={editForm.link_type} onChange={e=>setEditForm(f=>({...f,link_type:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, boxSizing:"border-box" }}>
                    {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <input value={editForm.url} onChange={e=>setEditForm(f=>({...f,url:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, boxSizing:"border-box", marginBottom:8 }} />
                <input value={editForm.notes||""} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} placeholder="Notes" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
                <button onClick={saveEdit} style={{ background:C.success, border:"none", color:"#fff", padding:"6px 14px", borderRadius:6, fontSize:12, cursor:"pointer", marginRight:6, fontWeight:600 }}>Save</button>
                <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"6px 14px", borderRadius:6, fontSize:12, cursor:"pointer" }}>Cancel</button>
              </div>
            ) : (
              <div key={link.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:22 }}>{typeLabel.split(' ')[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>{link.name}</p>
                  <p style={{ color:C.textMuted, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{link.url}</p>
                  {link.notes && <p style={{ color:C.textLight, fontSize:11 }}>{link.notes}</p>}
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ background:C.primaryLight, color:C.primary, padding:"7px 14px", borderRadius:6, fontSize:12, fontWeight:600, textDecoration:"none" }}>Open →</a>
                {canEdit && (
                  <>
                    <button onClick={()=>{setEditId(link.id); setEditForm({name:link.name, url:link.url, link_type:link.link_type, notes:link.notes||""})}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:12, padding:"6px 12px", borderRadius:6, cursor:"pointer" }}>Edit</button>
                    <button onClick={()=>deleteLink(link.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:12, padding:"6px 12px", borderRadius:6, cursor:"pointer" }}>✕</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============ SHARED: Ideas Board ============
function IdeasBoard({ user, table, title, emoji }) {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name:"", description:"", link:"" })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order('created_at', { ascending:false })
    setIdeas(data || [])
    setLoading(false)
  }, [table])

  useEffect(() => { load() }, [load])

  const addIdea = async () => {
    if (!form.name.trim()) return alert("Name zaroori hai!")
    await supabase.from(table).insert({ id:"i"+Date.now(), ...form, added_by:user.name })
    setForm({ name:"", description:"", link:"" })
    setAdding(false)
    load()
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return alert("Name zaroori!")
    await supabase.from(table).update({ name:editForm.name, description:editForm.description, link:editForm.link }).eq('id', editId)
    setEditId(null); setEditForm(null)
    load()
  }

  const deleteIdea = async (id) => {
    if (!confirm("Delete this idea?")) return
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  if (loading) return <p style={{ color:C.textMuted, fontSize:13 }}>Loading...</p>

  return (
    <div>
      <div style={{ background:C.warningLight, border:`1px solid ${C.warning}`, borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:C.warning }}>
        {emoji} <strong>{title}</strong> — Sab log yahan ideas share kar sakte hain.
      </div>
      
      <div style={{ marginBottom:14 }}>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"8px 18px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
          {adding ? "Cancel" : "+ Add Idea"}
        </button>
      </div>

      {adding && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:14 }}>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Idea Name *" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Description (optional)" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10, resize:"vertical", fontFamily:"inherit" }} />
          <input value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="Reference Link (optional)" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <button onClick={addIdea} style={{ background:C.success, border:"none", color:"#fff", padding:"8px 20px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:600 }}>Share Idea</button>
        </div>
      )}

      {ideas.length === 0 ? (
        <div style={{ textAlign:"center", padding:30, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:10 }}>
          <p style={{ color:C.textMuted, fontSize:14 }}>{emoji} Abhi tak koi idea nahi. Pehla idea share karo!</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {ideas.map(idea => editId === idea.id ? (
            <div key={idea.id} style={{ background:C.surface, border:`2px solid ${C.primary}`, borderRadius:10, padding:14 }}>
              <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, boxSizing:"border-box", marginBottom:8 }} />
              <textarea value={editForm.description||""} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={2} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, boxSizing:"border-box", marginBottom:8, resize:"vertical", fontFamily:"inherit" }} />
              <input value={editForm.link||""} onChange={e=>setEditForm(f=>({...f,link:e.target.value}))} placeholder="Link" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
              <button onClick={saveEdit} style={{ background:C.success, border:"none", color:"#fff", padding:"6px 14px", borderRadius:6, fontSize:12, cursor:"pointer", marginRight:6, fontWeight:600 }}>Save</button>
              <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"6px 14px", borderRadius:6, fontSize:12, cursor:"pointer" }}>Cancel</button>
            </div>
          ) : (
            <div key={idea.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:16, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", alignItems:"start", gap:8, marginBottom:8 }}>
                <div style={{ fontSize:20 }}>{emoji}</div>
                <p style={{ color:C.text, fontSize:15, fontWeight:600, flex:1 }}>{idea.name}</p>
              </div>
              {idea.description && <p style={{ color:C.textMuted, fontSize:13, marginBottom:8, lineHeight:1.5 }}>{idea.description}</p>}
              {idea.link && <a href={idea.link} target="_blank" rel="noopener noreferrer" style={{ color:C.primary, fontSize:12, marginBottom:8, textDecoration:"none" }}>🔗 Open Link →</a>}
              <div style={{ marginTop:"auto", paddingTop:10, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ color:C.textLight, fontSize:11 }}>👤 {idea.added_by || "Unknown"}</p>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={()=>{setEditId(idea.id); setEditForm({name:idea.name, description:idea.description||"", link:idea.link||""})}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>Edit</button>
                  <button onClick={()=>deleteIdea(idea.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ SHARED: Member Form Fields (for both admin + team lead create/edit) ============
function MemberFormFields({ form, setForm, showTeam=false, showCgp=false, teamGroups=[], cgpGroups=[] }) {
  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full Name *" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
        <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email *" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
        <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Password (optional)" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
        <input value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Role *" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
      </div>
      <div style={{ background:C.primaryLight, borderRadius:8, padding:12, marginBottom:10 }}>
        <p style={{ color:C.primary, fontSize:12, fontWeight:600, marginBottom:8 }}>⏰ Timing & Job</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:8 }}>
          <div>
            <label style={{ color:C.textMuted, fontSize:11, display:"block", marginBottom:3 }}>Start Time</label>
            <input type="time" value={form.checkin_time} onChange={e=>setForm(f=>({...f,checkin_time:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ color:C.textMuted, fontSize:11, display:"block", marginBottom:3 }}>End Time</label>
            <input type="time" value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ color:C.textMuted, fontSize:11, display:"block", marginBottom:3 }}>Grace Period</label>
            <select value={form.grace_minutes} onChange={e=>setForm(f=>({...f,grace_minutes:parseInt(e.target.value)}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
            </select>
          </div>
        </div>
        <label style={{ color:C.textMuted, fontSize:11, display:"block", marginBottom:3 }}>Job Description (e.g. "10 TikTok videos daily edit")</label>
        <textarea value={form.job_description||""} onChange={e=>setForm(f=>({...f,job_description:e.target.value}))} rows={2} placeholder="What is this member's job?" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", resize:"vertical", fontFamily:"inherit" }} />
      </div>
      {(showTeam || showCgp) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          {showTeam && (
            <select value={form.team_id} onChange={e=>setForm(f=>({...f,team_id:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">-- No Team --</option>
              {teamGroups.map(t => <option key={t.id} value={t.id}>👥 {t.name}</option>)}
            </select>
          )}
          {showCgp && (
            <select value={form.cgp_id||""} onChange={e=>setForm(f=>({...f,cgp_id:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">-- No CGP #1 --</option>
              {cgpGroups.map(t => <option key={t.id} value={t.id}>🚀 {t.name}</option>)}
            </select>
          )}
          {showCgp && (
            <select value={form.cgp_id_2||""} onChange={e=>setForm(f=>({...f,cgp_id_2:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">-- No CGP #2 --</option>
              {cgpGroups.map(t => <option key={t.id} value={t.id}>🚀 {t.name}</option>)}
            </select>
          )}
          {showCgp && (
            <select value={form.cgp_id_3||""} onChange={e=>setForm(f=>({...f,cgp_id_3:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">-- No CGP #3 --</option>
              {cgpGroups.map(t => <option key={t.id} value={t.id}>🚀 {t.name}</option>)}
            </select>
          )}
        </div>
      )}
      {showTeam && (
        <div style={{ background:C.purpleLight, border:`1px solid ${C.purple}`, borderRadius:8, padding:"10px 14px", marginTop:10 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:C.purple, fontSize:13, fontWeight:600 }}>
            <input type="checkbox" checked={!!form.is_manager} onChange={e=>setForm(f=>({...f, is_manager:e.target.checked}))} style={{ width:16, height:16, cursor:"pointer" }} />
            👔 Make this member a Manager
          </label>
          <p style={{ color:C.purple, fontSize:11, marginTop:4, marginLeft:24, opacity:0.8 }}>Manager sab members ki timing set kar sake, tasks assign kare, aur attendance dekhe.</p>
        </div>
      )}
    </>
  )
}

const emptyMemberForm = () => ({
  name:"", email:"", password:"", role:"",
  checkin_time:"09:00", end_time:"18:00", grace_minutes:15,
  job_description:"", team_id:"", cgp_id:"", cgp_id_2:"", cgp_id_3:"", is_manager:false
})

// ============ SHARED: Gmail Credentials Vault ============
function GmailAccounts({ teamId, canEdit }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPw, setShowPw] = useState({})
  const [form, setForm] = useState({ label:"", email:"", password:"", notes:"" })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('gmail_credentials').select('*').eq('team_id', teamId).order('created_at')
    setItems(data || [])
    setLoading(false)
  }, [teamId])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!form.email.trim() || !form.password.trim()) return alert("Email aur password zaroori!")
    await supabase.from('gmail_credentials').insert({ id:"g"+Date.now(), team_id:teamId, ...form })
    setForm({ label:"", email:"", password:"", notes:"" })
    setAdding(false)
    load()
  }

  const saveEdit = async () => {
    if (!editForm.email.trim() || !editForm.password.trim()) return alert("Email + password zaroori!")
    await supabase.from('gmail_credentials').update(editForm).eq('id', editId)
    setEditId(null); setEditForm(null)
    load()
  }

  const del = async (id) => {
    if (!confirm("Delete karein?")) return
    await supabase.from('gmail_credentials').delete().eq('id', id)
    load()
  }

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // silent success
    }).catch(() => alert("Copy nahi ho saka"))
  }

  if (loading) return <p style={{ color:C.textMuted, fontSize:13 }}>Loading...</p>

  return (
    <div>
      <div style={{ background:C.dangerLight, border:`1px solid ${C.danger}`, borderRadius:8, padding:"8px 14px", marginBottom:14, fontSize:12, color:C.danger }}>
        🔐 <strong>Sensitive credentials</strong> — sirf trusted members ke saath share karein.
      </div>
      {canEdit && (
        <div style={{ marginBottom:14 }}>
          <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"8px 18px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
            {adding ? "Cancel" : "+ Add Gmail"}
          </button>
        </div>
      )}
      {adding && canEdit && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:14 }}>
          <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="Label (e.g. 'Fashion account Gmail')" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Gmail address *" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Login Password *" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes (optional)" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <button onClick={add} style={{ background:C.success, border:"none", color:"#fff", padding:"8px 20px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:600 }}>Save</button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign:"center", padding:30, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:10 }}>
          <p style={{ color:C.textMuted, fontSize:14 }}>📧 Koi Gmail credentials nahi hain abhi.</p>
        </div>
      ) : (
        <div style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderRadius:10 }}>
          <table style={{ borderCollapse:"collapse", width:"100%", fontSize:13, minWidth:700 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>#</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Label</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Gmail</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Password</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Notes</th>
                {canEdit && <th style={{ padding:"10px 12px", textAlign:"center", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => editId === it.id ? (
                <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}`, background:C.primaryLight }}>
                  <td style={{ padding:"8px 12px" }}>{idx+1}</td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.label||""} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.password} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.notes||""} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"8px", textAlign:"center" }}>
                    <button onClick={saveEdit} style={{ background:C.success, border:"none", color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer", marginRight:4 }}>Save</button>
                    <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 12px", color:C.textMuted }}>{idx+1}</td>
                  <td style={{ padding:"10px 12px", color:C.text, fontWeight:500 }}>{it.label || "—"}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ color:C.text, fontFamily:"monospace", fontSize:12 }}>{it.email}</span>
                    <button onClick={()=>copy(it.email)} style={{ marginLeft:6, background:"transparent", border:"none", color:C.primary, fontSize:13, cursor:"pointer" }} title="Copy email">📋</button>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ color:C.text, fontFamily:"monospace", fontSize:12 }}>{showPw[it.id] ? it.password : "••••••••"}</span>
                    <button onClick={()=>setShowPw(s=>({...s,[it.id]:!s[it.id]}))} style={{ marginLeft:6, background:"transparent", border:"none", color:C.primary, fontSize:13, cursor:"pointer" }} title="Show/Hide">{showPw[it.id] ? "🙈" : "👁️"}</button>
                    <button onClick={()=>copy(it.password)} style={{ marginLeft:4, background:"transparent", border:"none", color:C.primary, fontSize:13, cursor:"pointer" }} title="Copy password">📋</button>
                  </td>
                  <td style={{ padding:"10px 12px", color:C.textMuted, fontSize:12 }}>{it.notes || "—"}</td>
                  {canEdit && (
                    <td style={{ padding:"8px", textAlign:"center" }}>
                      <button onClick={()=>{setEditId(it.id); setEditForm({label:it.label||"", email:it.email, password:it.password, notes:it.notes||""})}} style={{ background:C.primaryLight, border:"none", color:C.primary, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer", marginRight:4, fontWeight:600 }}>Edit</button>
                      <button onClick={()=>del(it.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============ SHARED: Group Members Management ============
function GroupMembersManage({ groupId, groupMode, allMembers, refresh, canManage }) {
  const isCGP = groupMode === 'cgp'
  const [addMode, setAddMode] = useState(null)
  const [existingSelect, setExistingSelect] = useState("")
  const [newForm, setNewForm] = useState(emptyMemberForm())
  const [credShow, setCredShow] = useState(null)

  // Helper: check if member belongs to this group
  const memberInGroup = (m) => isCGP
    ? (m.cgp_id === groupId || m.cgp_id_2 === groupId || m.cgp_id_3 === groupId)
    : (m.team_id === groupId)

  // Find first empty CGP slot on a member
  const findEmptyCgpSlot = (m) => {
    if (!m.cgp_id) return 'cgp_id'
    if (!m.cgp_id_2) return 'cgp_id_2'
    if (!m.cgp_id_3) return 'cgp_id_3'
    return null
  }

  const groupMembers = allMembers.filter(memberInGroup)
  const availableMembers = allMembers.filter(m => !memberInGroup(m) && !m.is_admin)

  const addExisting = async () => {
    if (!existingSelect) return alert("Member select karein!")
    if (isCGP) {
      const member = allMembers.find(m => m.id === existingSelect)
      const slot = findEmptyCgpSlot(member)
      if (!slot) return alert("Yeh member already 3 CGPs mein hai (max limit)!")
      await supabase.from('members').update({ [slot]: groupId }).eq('id', existingSelect)
    } else {
      await supabase.from('members').update({ team_id: groupId }).eq('id', existingSelect)
    }
    setExistingSelect(""); setAddMode(null)
    refresh()
  }

  const createNew = async () => {
    if (!newForm.name || !newForm.email || !newForm.role) return alert("Name, email, role zaroori!")
    const password = newForm.password || genPassword()
    const id = "m"+Date.now()
    const avatar = newForm.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    const groupField = isCGP ? 'cgp_id' : 'team_id'
    const insertData = {
      id, name:newForm.name, email:newForm.email.toLowerCase(), password,
      role:newForm.role, checkin_time:newForm.checkin_time,
      end_time:newForm.end_time, grace_minutes:newForm.grace_minutes,
      job_description:newForm.job_description||null,
      avatar, is_admin:false, is_team_lead:false,
      [groupField]: groupId
    }
    const { error } = await supabase.from('members').insert(insertData)
    if (error) return alert("Error: " + error.message)
    await supabase.from('member_stats').insert({ member_id:id, late_count:0, strikes:0 })
    setCredShow({ email:newForm.email, password, name:newForm.name })
    setNewForm(emptyMemberForm())
    setAddMode(null)
    refresh()
  }

  const removeFromGroup = async (memberId) => {
    if (!confirm(`${isCGP ? 'CGP' : 'Team'} se remove karein?`)) return
    const member = allMembers.find(m => m.id === memberId)
    let updateData = {}
    if (isCGP) {
      // Find which slot matches this groupId and clear it
      if (member.cgp_id === groupId) updateData.cgp_id = null
      else if (member.cgp_id_2 === groupId) updateData.cgp_id_2 = null
      else if (member.cgp_id_3 === groupId) updateData.cgp_id_3 = null
    } else {
      updateData = { team_id: null, is_team_lead: false }
    }
    await supabase.from('members').update(updateData).eq('id', memberId)
    refresh()
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h3 style={{ color:C.text, fontSize:15, fontWeight:600 }}>Members ({groupMembers.length})</h3>
        {canManage && !addMode && (
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>setAddMode('existing')} style={{ background:C.primaryLight, border:"none", color:C.primary, padding:"7px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>+ Add Existing</button>
            <button onClick={()=>setAddMode('new')} style={{ background:C.success, border:"none", color:"#fff", padding:"7px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>+ Create New</button>
          </div>
        )}
        {addMode && <button onClick={()=>setAddMode(null)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"7px 14px", borderRadius:6, fontSize:12, cursor:"pointer" }}>Cancel</button>}
      </div>

      {credShow && (
        <div style={{ background:C.successLight, border:`1px solid ${C.success}`, borderRadius:10, padding:14, marginBottom:12 }}>
          <p style={{ color:C.success, fontWeight:600, fontSize:13, marginBottom:6 }}>✓ Credentials for {credShow.name}:</p>
          <div style={{ background:"#fff", borderRadius:6, padding:"8px 12px", fontFamily:"monospace", fontSize:12 }}>
            <div>Email: <strong>{credShow.email}</strong></div>
            <div>Password: <strong>{credShow.password}</strong></div>
          </div>
          <button onClick={()=>setCredShow(null)} style={{ marginTop:8, background:"transparent", border:"none", color:C.success, fontSize:11, cursor:"pointer", fontWeight:600 }}>Close</button>
        </div>
      )}

      {addMode === 'existing' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 }}>
          {availableMembers.length === 0 ? (
            <p style={{ color:C.textMuted, fontSize:12 }}>Koi available member nahi hai.</p>
          ) : (
            <>
              <select value={existingSelect} onChange={e=>setExistingSelect(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }}>
                <option value="">-- Select Member --</option>
                {availableMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
              <button onClick={addExisting} style={{ background:C.primary, border:"none", color:"#fff", padding:"7px 16px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>Add to {groupMode==='cgp'?'CGP':'Team'}</button>
            </>
          )}
        </div>
      )}

      {addMode === 'new' && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 }}>
          <MemberFormFields form={newForm} setForm={setNewForm} />
          <button onClick={createNew} style={{ background:C.success, border:"none", color:"#fff", padding:"7px 16px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>Create Member</button>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {groupMembers.length === 0 ? (
          <p style={{ color:C.textMuted, fontSize:13 }}>Koi member nahi hai.</p>
        ) : groupMembers.map(m => (
          <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:600 }}>{m.avatar}</div>
            <div style={{ flex:1 }}>
              <p style={{ color:C.text, fontSize:13, fontWeight:600 }}>{m.name} {m.is_team_lead && groupMode==='team' && "👑"}</p>
              <p style={{ color:C.textMuted, fontSize:11 }}>{m.role} · 🕐 {to12(m.checkin_time)} → {to12(m.end_time||"18:00")}</p>
            </div>
            {canManage && (
              <button onClick={()=>removeFromGroup(m.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:11, padding:"5px 10px", borderRadius:6, cursor:"pointer" }}>Remove</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ SHARED: Groups Section ============
function GroupsSection({ data, refresh, groupType, sectionLabel }) {
  const [form, setForm] = useState({ name:"", description:"", team_lead_id:"" })
  const [adding, setAdding] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const groups = data.teams.filter(t => (t.group_type || 'team') === groupType)
  const isCGP = groupType === 'cgp'

  // Assign a member to this group (finds empty CGP slot if needed)
  const assignLeadToGroup = async (leadId, teamId) => {
    if (isCGP) {
      const m = data.members.find(x => x.id === leadId)
      if (!m) return
      // Already in this CGP?
      if (m.cgp_id === teamId || m.cgp_id_2 === teamId || m.cgp_id_3 === teamId) {
        await supabase.from('members').update({ is_team_lead:true }).eq('id', leadId)
        return
      }
      // Find empty slot
      const slot = !m.cgp_id ? 'cgp_id' : !m.cgp_id_2 ? 'cgp_id_2' : !m.cgp_id_3 ? 'cgp_id_3' : null
      if (!slot) { alert("Lead already 3 CGPs mein hai, pehle kisi se remove karo"); return }
      await supabase.from('members').update({ [slot]:teamId, is_team_lead:true }).eq('id', leadId)
    } else {
      await supabase.from('members').update({ team_id:teamId, is_team_lead:true }).eq('id', leadId)
    }
  }

  const addTeam = async () => {
    if (!form.name.trim()) return alert("Name zaroori hai!")
    const id = "team"+Date.now()
    await supabase.from('teams').insert({ id, name:form.name, description:form.description, team_lead_id:form.team_lead_id||null, group_type:groupType })
    if (form.team_lead_id) await assignLeadToGroup(form.team_lead_id, id)
    setForm({ name:"", description:"", team_lead_id:"" })
    setAdding(false)
    refresh()
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return alert("Name zaroori!")
    const oldTeam = data.teams.find(t=>t.id===editId)
    if (oldTeam?.team_lead_id && oldTeam.team_lead_id !== editForm.team_lead_id && !isCGP) {
      await supabase.from('members').update({ is_team_lead:false }).eq('id', oldTeam.team_lead_id)
    }
    await supabase.from('teams').update({ name:editForm.name, description:editForm.description, team_lead_id:editForm.team_lead_id||null }).eq('id', editId)
    if (editForm.team_lead_id) await assignLeadToGroup(editForm.team_lead_id, editId)
    setEditId(null); setEditForm(null)
    refresh()
  }

  const deleteTeam = async (id) => {
    if (!confirm(`${sectionLabel} delete karein?`)) return
    if (isCGP) {
      // Clear this cgp from any slot on any member
      const affectedMembers = data.members.filter(m => m.cgp_id === id || m.cgp_id_2 === id || m.cgp_id_3 === id)
      for (const m of affectedMembers) {
        const upd = {}
        if (m.cgp_id === id) upd.cgp_id = null
        if (m.cgp_id_2 === id) upd.cgp_id_2 = null
        if (m.cgp_id_3 === id) upd.cgp_id_3 = null
        await supabase.from('members').update(upd).eq('id', m.id)
      }
    } else {
      await supabase.from('members').update({ team_id:null, is_team_lead:false }).eq('team_id', id)
    }
    await supabase.from('teams').delete().eq('id', id)
    refresh()
  }

  if (selectedTeam) {
    const team = data.teams.find(t=>t.id===selectedTeam)
    const lead = data.members.find(m => m.id === team?.team_lead_id)
    return (
      <div>
        <button onClick={()=>setSelectedTeam(null)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"6px 14px", borderRadius:8, fontSize:12, cursor:"pointer", marginBottom:16 }}>← Back to {sectionLabel}</button>
        <h2 style={{ color:C.text, fontSize:22, fontWeight:700, marginBottom:4 }}>{team?.name}</h2>
        <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>{team?.description || "—"} · 👑 {lead?.name || "No Lead"}</p>

        <GroupMembersManage groupId={selectedTeam} groupMode={groupType} allMembers={data.members} refresh={refresh} canManage={true} />

        <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginTop:28, marginBottom:12 }}>📊 TikTok Accounts</h3>
        <TikTokSheet teamId={selectedTeam} canEdit={true} userName="Super Admin" showAccountType={true} />

        <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginTop:28, marginBottom:12 }}>🔗 Links</h3>
        <TeamLinks teamId={selectedTeam} canEdit={true} />

        <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginTop:28, marginBottom:12 }}>📧 Gmail + Login Password</h3>
        <GmailAccounts teamId={selectedTeam} canEdit={true} />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>{sectionLabel} ({groups.length})</h2>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
          {adding ? "Cancel" : `+ Add ${sectionLabel === "Teams" ? "Team" : "CGP"}`}
        </button>
      </div>

      {adding && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Name *" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <select value={form.team_lead_id} onChange={e=>setForm(f=>({...f,team_lead_id:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box", marginBottom:12 }}>
            <option value="">-- No Lead --</option>
            {data.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={addTeam} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Create</button>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {groups.map(t => editId === t.id ? (
          <div key={t.id} style={{ background:C.surface, border:`2px solid ${C.primary}`, borderRadius:12, padding:16 }}>
            <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:8 }} />
            <input value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} placeholder="Description" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:8 }} />
            <select value={editForm.team_lead_id} onChange={e=>setEditForm(f=>({...f,team_lead_id:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:10 }}>
              <option value="">-- No Lead --</option>
              {data.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={saveEdit} style={{ background:C.success, border:"none", color:"#fff", padding:"7px 16px", borderRadius:6, fontSize:12, cursor:"pointer", marginRight:6, fontWeight:600 }}>Save</button>
            <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"7px 16px", borderRadius:6, fontSize:12, cursor:"pointer" }}>Cancel</button>
          </div>
        ) : (
          <div key={t.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:getColor(t.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff" }}>{groupType === 'cgp' ? "🚀" : "👥"}</div>
            <div style={{ flex:1, cursor:"pointer" }} onClick={()=>setSelectedTeam(t.id)}>
              <p style={{ color:C.text, fontSize:15, fontWeight:600 }}>{t.name}</p>
              <p style={{ color:C.textMuted, fontSize:12 }}>{t.description || "No description"} · 👤 {data.members.filter(m => isCGP ? (m.cgp_id===t.id || m.cgp_id_2===t.id || m.cgp_id_3===t.id) : m.team_id===t.id).length} · 📊 {data.accounts.filter(a=>a.team_id===t.id).length}</p>
            </div>
            <button onClick={()=>setSelectedTeam(t.id)} style={{ background:C.primaryLight, border:"none", color:C.primary, padding:"7px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>Open →</button>
            <button onClick={()=>{setEditId(t.id); setEditForm({name:t.name, description:t.description||"", team_lead_id:t.team_lead_id||""})}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"7px 12px", borderRadius:6, fontSize:12, cursor:"pointer" }}>Edit</button>
            <button onClick={()=>deleteTeam(t.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, padding:"7px 12px", borderRadius:6, fontSize:12, cursor:"pointer" }}>✕</button>
          </div>
        ))}
        {groups.length === 0 && !adding && (
          <div style={{ background:C.surface, border:`1px dashed ${C.border}`, borderRadius:12, padding:30, textAlign:"center" }}>
            <p style={{ color:C.textMuted, fontSize:14 }}>Koi {sectionLabel === "Teams" ? "team" : "CGP"} nahi hai. Add karo.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ ADMIN DASHBOARD ============
function ManagerDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("members")
  const [data, setData] = useState({ members:[], tasks:[], attendance:{}, reports:{}, stats:{}, reportComments:{}, teams:[], accounts:[] })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [{ data:members }, { data:tasks }, { data:att }, { data:reps }, { data:stats }, { data:reportComments }, { data:teams }, { data:accounts }] = await Promise.all([
      supabase.from('members').select('*').eq('is_admin', false).order('created_at'),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('attendance').select('*'),
      supabase.from('reports').select('*'),
      supabase.from('member_stats').select('*'),
      supabase.from('report_comments').select('*').order('created_at'),
      supabase.from('teams').select('*').order('created_at'),
      supabase.from('tiktok_accounts').select('*'),
    ])
    const attMap = {}; (att||[]).forEach(a=>{ if(!attMap[a.date]) attMap[a.date]={}; attMap[a.date][a.member_id]={checkIn:a.check_in,checkOut:a.check_out,status:a.status} })
    const repMap = {}; (reps||[]).forEach(r=>{ if(!repMap[r.date]) repMap[r.date]={}; repMap[r.date][r.member_id]={tasksCompleted:r.tasks_completed,hoursWorked:r.hours_worked,blockers:r.blockers,notes:r.notes} })
    const statsMap = {}; (stats||[]).forEach(s=>{ statsMap[s.member_id]={lateCount:s.late_count,strikes:s.strikes} })
    const rcMap = {}; (reportComments||[]).forEach(rc=>{ const k = `${rc.report_member_id}|${rc.report_date}`; if(!rcMap[k]) rcMap[k]=[]; rcMap[k].push({id:rc.id, author:rc.author, text:rc.text}) })
    setData({ members:members||[], tasks:tasks||[], attendance:attMap, reports:repMap, stats:statsMap, reportComments:rcMap, teams:teams||[], accounts:accounts||[] })
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const tabs = [
    { id:"members", label:"Members", icon:"👤" },
    { id:"tasks", label:"Tasks", icon:"✅" },
    { id:"attendance", label:"Attendance", icon:"🕐" },
    { id:"reports", label:"Reports", icon:"📋" },
  ]

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:C.purple, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff" }}>👔</div>
          <span style={{ color:C.text, fontWeight:700, fontSize:17 }}>TeamHub</span>
          <span style={{ background:C.purpleLight, color:C.purple, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600 }}>Manager</span>
          <span style={{ color:C.textMuted, fontSize:13, marginLeft:8 }}>{user.name}</span>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, padding:"7px 16px", borderRadius:8, cursor:"pointer" }}>Logout</button>
      </div>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px", display:"flex", gap:4, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:"transparent", border:"none", borderBottom: tab===t.id ? `2px solid ${C.purple}` : "2px solid transparent", color: tab===t.id ? C.purple : C.textMuted, padding:"14px 14px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontWeight: tab===t.id?600:500 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, padding:24, overflowY:"auto" }}>
        {tab==="members" && <ManagerMembers data={data} refresh={refresh} />}
        {tab==="tasks" && <AdminTasks data={data} refresh={refresh} />}
        {tab==="attendance" && <AdminAttendance data={data} refresh={refresh} />}
        {tab==="reports" && <AdminReports data={data} user={user} refresh={refresh} />}
      </div>
    </div>
  )
}

function ManagerMembers({ data, refresh }) {
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const saveEdit = async () => {
    if (!editForm.checkin_time || !editForm.end_time) return alert("Timing zaroori!")
    const { error } = await supabase.from('members').update({
      checkin_time: editForm.checkin_time,
      end_time: editForm.end_time,
      grace_minutes: editForm.grace_minutes,
      job_description: editForm.job_description || null,
    }).eq('id', editId)
    if (error) return alert("Error: " + error.message)
    setEditId(null); setEditForm(null)
    refresh()
  }

  return (
    <div>
      <div style={{ background:C.purpleLight, border:`1px solid ${C.purple}`, borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:C.purple }}>
        👔 <strong>Manager View</strong> — Aap sirf timing, grace period, aur job description edit kar sakte hain.
      </div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>Members ({data.members.length})</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.members.map(m => editId === m.id ? (
          <div key={m.id} style={{ background:C.surface, border:`2px solid ${C.purple}`, borderRadius:12, padding:18 }}>
            <p style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:12 }}>👤 {m.name} <span style={{ color:C.textMuted, fontWeight:400 }}>· {m.role}</span></p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
              <div>
                <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:4 }}>Start Time</label>
                <input type="time" value={editForm.checkin_time} onChange={e=>setEditForm(f=>({...f,checkin_time:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:4 }}>End Time</label>
                <input type="time" value={editForm.end_time} onChange={e=>setEditForm(f=>({...f,end_time:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:4 }}>Grace Period</label>
                <select value={editForm.grace_minutes} onChange={e=>setEditForm(f=>({...f,grace_minutes:parseInt(e.target.value)}))} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
                  {[5,10,15,20,30].map(g => <option key={g} value={g}>{g} min</option>)}
                </select>
              </div>
            </div>
            <label style={{ display:"block", fontSize:11, color:C.textMuted, marginBottom:4 }}>Job Description</label>
            <textarea value={editForm.job_description} onChange={e=>setEditForm(f=>({...f,job_description:e.target.value}))} rows={2} placeholder="e.g. 10 TikTok videos daily edit karna" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box", marginBottom:12, resize:"vertical", fontFamily:"inherit" }} />
            <button onClick={saveEdit} style={{ background:C.purple, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600, marginRight:8 }}>Save</button>
            <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        ) : (
          <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", fontWeight:600 }}>{m.avatar}</div>
            <div style={{ flex:1 }}>
              <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name} {m.is_manager && <span style={{background:C.purpleLight, color:C.purple, fontSize:10, padding:"2px 6px", borderRadius:4, marginLeft:4}}>👔 MANAGER</span>}</p>
              <p style={{ color:C.textMuted, fontSize:12 }}>{m.role} · 🕐 {to12(m.checkin_time)} → {to12(m.end_time||"18:00")} · Grace: {m.grace_minutes ?? 15}m</p>
              {m.job_description && <p style={{ color:C.textLight, fontSize:11, marginTop:2 }}>💼 {m.job_description}</p>}
            </div>
            <button onClick={()=>{setEditId(m.id); setEditForm({checkin_time:m.checkin_time, end_time:m.end_time||"18:00", grace_minutes:m.grace_minutes??15, job_description:m.job_description||""})}} style={{ background:C.purpleLight, border:"none", color:C.purple, fontSize:12, padding:"7px 14px", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Edit Timing</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview")
  const [data, setData] = useState({ members:[], tasks:[], attendance:{}, reports:{}, stats:{}, reportComments:{}, teams:[], accounts:[] })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [{ data:members }, { data:tasks }, { data:att }, { data:reps }, { data:stats }, { data:reportComments }, { data:teams }, { data:accounts }] = await Promise.all([
      supabase.from('members').select('*').eq('is_admin', false).order('created_at'),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('attendance').select('*'),
      supabase.from('reports').select('*'),
      supabase.from('member_stats').select('*'),
      supabase.from('report_comments').select('*').order('created_at'),
      supabase.from('teams').select('*').order('created_at'),
      supabase.from('tiktok_accounts').select('*'),
    ])
    const attMap = {}; (att||[]).forEach(a=>{ if(!attMap[a.date]) attMap[a.date]={}; attMap[a.date][a.member_id]={checkIn:a.check_in,checkOut:a.check_out,status:a.status} })
    const repMap = {}; (reps||[]).forEach(r=>{ if(!repMap[r.date]) repMap[r.date]={}; repMap[r.date][r.member_id]={tasksCompleted:r.tasks_completed,hoursWorked:r.hours_worked,blockers:r.blockers,notes:r.notes} })
    const statsMap = {}; (stats||[]).forEach(s=>{ statsMap[s.member_id]={lateCount:s.late_count,strikes:s.strikes} })
    const rcMap = {}; (reportComments||[]).forEach(rc=>{ const k = `${rc.report_member_id}|${rc.report_date}`; if(!rcMap[k]) rcMap[k]=[]; rcMap[k].push({id:rc.id, author:rc.author, text:rc.text}) })
    setData({ members:members||[], tasks:tasks||[], attendance:attMap, reports:repMap, stats:statsMap, reportComments:rcMap, teams:teams||[], accounts:accounts||[] })
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const tabs = [
    { id:"overview", label:"Overview", icon:"📊" },
    { id:"teams", label:"Teams", icon:"👥" },
    { id:"cgp", label:"CGP", icon:"🚀" },
    { id:"members", label:"Members", icon:"👤" },
    { id:"tasks", label:"Tasks", icon:"✅" },
    { id:"attendance", label:"Attendance", icon:"🕐" },
    { id:"reports", label:"Reports", icon:"📋" },
    { id:"niche", label:"Niche Ideas", icon:"💡" },
    { id:"voiceover", label:"Voiceover Ideas", icon:"🎙️" },
  ]

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:C.primary, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff" }}>⚡</div>
          <span style={{ color:C.text, fontWeight:700, fontSize:17 }}>TeamHub</span>
          <span style={{ background:C.primaryLight, color:C.primary, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600 }}>Super Admin</span>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, padding:"7px 16px", borderRadius:8, cursor:"pointer" }}>Logout</button>
      </div>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px", display:"flex", gap:4, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:"transparent", border:"none", borderBottom: tab===t.id ? `2px solid ${C.primary}` : "2px solid transparent", color: tab===t.id ? C.primary : C.textMuted, padding:"14px 14px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontWeight: tab===t.id?600:500 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, padding:24, overflowY:"auto" }}>
        {tab==="overview" && <AdminOverview data={data} />}
        {tab==="teams" && <GroupsSection data={data} refresh={refresh} groupType="team" sectionLabel="Teams" />}
        {tab==="cgp" && <GroupsSection data={data} refresh={refresh} groupType="cgp" sectionLabel="CGP" />}
        {tab==="members" && <AdminMembers data={data} refresh={refresh} />}
        {tab==="tasks" && <AdminTasks data={data} refresh={refresh} />}
        {tab==="attendance" && <AdminAttendance data={data} refresh={refresh} />}
        {tab==="reports" && <AdminReports data={data} user={user} refresh={refresh} />}
        {tab==="niche" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>💡 Niche Ideas Board</h2><IdeasBoard user={user} table="niche_ideas" title="Niche Ideas Board" emoji="💡" /></div>}
        {tab==="voiceover" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🎙️ Voiceover Ideas Board</h2><IdeasBoard user={user} table="voiceover_ideas" title="Voiceover Ideas Board" emoji="🎙️" /></div>}
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

  const teamGroups = data.teams.filter(t=>(t.group_type||'team')==='team')
  const cgpGroups = data.teams.filter(t=>t.group_type==='cgp')

  const ownAccounts = data.accounts.filter(a => (a.account_type||'own') === 'own').length
  const partnershipAccounts = data.accounts.filter(a => a.account_type === 'partnership').length

  const [showPartnership, setShowPartnership] = useState(() => localStorage.getItem('teamhub-show-partnership') === 'true')
  const togglePartnership = () => {
    const v = !showPartnership
    setShowPartnership(v)
    localStorage.setItem('teamhub-show-partnership', String(v))
  }

  const cards = [
    { label:"Total Teams", value: teamGroups.length, color:C.primary },
    { label:"Total CGP", value: cgpGroups.length, color:C.purple },
    { label:"Total Members", value: data.members.length, color:C.success },
    { label:"Total TikTok Accounts", value: data.accounts.length, color:C.orange },
    { label:"On Time Today", value: ontime, color:C.success },
    { label:"Late Today", value: late, color:C.warning },
    { label:"Absent Today", value: absent, color:C.danger },
  ]

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:6 }}>Super Admin Overview</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:24 }}>{td}</p>

      <div style={{ marginBottom:20 }}>
        <button onClick={togglePartnership} style={{ background: showPartnership ? C.orange : "transparent", border:`1px solid ${showPartnership ? C.orange : C.border}`, color: showPartnership ? "#fff" : C.textMuted, fontSize:12, padding:"7px 14px", borderRadius:8, cursor:"pointer", fontWeight:600 }}>
          {showPartnership ? "🙈 Hide" : "👁️ Show"} Own / Partnership Info
        </button>
      </div>

      {showPartnership && (
        <>
          <h3 style={{ color:C.textMuted, fontSize:12, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:0.5 }}>Account Breakdown</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:28 }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.success}`, borderRadius:12, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>🏢</span>
                <p style={{ color:C.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase" }}>Total Own Accounts</p>
              </div>
              <p style={{ color:C.success, fontSize:32, fontWeight:700 }}>{ownAccounts}</p>
              <p style={{ color:C.textLight, fontSize:11, marginTop:4 }}>Your own running accounts</p>
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.orange}`, borderRadius:12, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>🤝</span>
                <p style={{ color:C.textMuted, fontSize:12, fontWeight:600, textTransform:"uppercase" }}>Total Partnership</p>
              </div>
              <p style={{ color:C.orange, fontSize:32, fontWeight:700 }}>{partnershipAccounts}</p>
              <p style={{ color:C.textLight, fontSize:11, marginTop:4 }}>Partnership accounts</p>
            </div>
          </div>
        </>
      )}

      <h3 style={{ color:C.textMuted, fontSize:12, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:0.5 }}>Overall Stats</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
            <p style={{ color:C.textMuted, fontSize:12, marginBottom:8, fontWeight:500 }}>{c.label}</p>
            <p style={{ color:c.color, fontSize:30, fontWeight:700 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {[["Teams Breakdown", teamGroups, 'team'], ["CGP Breakdown", cgpGroups, 'cgp']].map(([label, groups, kind]) => groups.length > 0 && (
        <div key={label}>
          <h3 style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:14, textTransform:"uppercase" }}>{label}</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
            {groups.map(t => {
              const tm = data.members.filter(m => kind === 'cgp' 
                ? (m.cgp_id === t.id || m.cgp_id_2 === t.id || m.cgp_id_3 === t.id)
                : m.team_id === t.id)
              const ta = data.accounts.filter(a => a.team_id === t.id)
              const done = ta.filter(a => a.status === 'done' && a.status_date === td).length
              const own = ta.filter(a => (a.account_type||'own') === 'own').length
              const partnership = ta.filter(a => a.account_type === 'partnership').length
              const lead = data.members.find(m => m.id === t.team_lead_id)
              return (
                <div key={t.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:getColor(t.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff" }}>{t.group_type==='cgp'?"🚀":"👥"}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>{t.name}</p>
                    <p style={{ color:C.textMuted, fontSize:12 }}>👑 {lead?.name || "No Lead"} · 👤 {tm.length} · 📊 {ta.length}{showPartnership && <> <span style={{ color:C.success }}>({own} own</span> · <span style={{ color:C.orange }}>{partnership} partnership)</span></>} · {done} done today</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function AdminMembers({ data, refresh }) {
  const [form, setForm] = useState(emptyMemberForm())
  const [adding, setAdding] = useState(false)
  const [credShow, setCredShow] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const teamGroups = data.teams.filter(t=>(t.group_type||'team')==='team')
  const cgpGroups = data.teams.filter(t=>t.group_type==='cgp')

  const addMember = async () => {
    if (!form.name||!form.email||!form.role) return alert("Name, email, role zaroori!")
    const password = form.password || genPassword()
    const id = "m"+Date.now()
    const avatar = form.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    const { error } = await supabase.from('members').insert({
      id, name:form.name, email:form.email.toLowerCase(), password,
      role:form.role, checkin_time:form.checkin_time,
      end_time:form.end_time, grace_minutes:form.grace_minutes,
      job_description:form.job_description||null,
      avatar, is_admin:false, is_team_lead:false, is_manager: !!form.is_manager,
      team_id:form.team_id||null, cgp_id:form.cgp_id||null, cgp_id_2:form.cgp_id_2||null, cgp_id_3:form.cgp_id_3||null
    })
    if (error) return alert("Error: " + error.message)
    await supabase.from('member_stats').insert({ member_id:id, late_count:0, strikes:0 })
    setCredShow({ email:form.email, password, name:form.name })
    setForm(emptyMemberForm())
    setAdding(false)
    refresh()
  }

  const saveEdit = async () => {
    if (!editForm.name||!editForm.email||!editForm.role) return alert("Sab zaroori!")
    const avatar = editForm.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    await supabase.from('members').update({
      name:editForm.name, email:editForm.email.toLowerCase(), password:editForm.password,
      role:editForm.role, checkin_time:editForm.checkin_time,
      end_time:editForm.end_time, grace_minutes:editForm.grace_minutes,
      job_description:editForm.job_description||null,
      avatar, team_id:editForm.team_id||null, cgp_id:editForm.cgp_id||null, cgp_id_2:editForm.cgp_id_2||null, cgp_id_3:editForm.cgp_id_3||null,
      is_manager: !!editForm.is_manager
    }).eq('id', editId)
    setEditId(null); setEditForm(null)
    refresh()
  }

  const deleteMember = async (id) => {
    if (!confirm("Delete this member?")) return
    await supabase.from('members').delete().eq('id', id)
    refresh()
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Members ({data.members.length})</h2>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
          {adding ? "Cancel" : "+ Add Member"}
        </button>
      </div>
      {credShow && (
        <div style={{ background:C.successLight, border:`1px solid ${C.success}`, borderRadius:12, padding:16, marginBottom:16 }}>
          <p style={{ color:C.success, fontWeight:600, fontSize:14, marginBottom:8 }}>✓ Credentials for {credShow.name}:</p>
          <div style={{ background:"#fff", borderRadius:8, padding:"10px 14px", fontFamily:"monospace", fontSize:13 }}>
            <div>Email: <strong>{credShow.email}</strong></div>
            <div>Password: <strong>{credShow.password}</strong></div>
          </div>
          <button onClick={()=>setCredShow(null)} style={{ marginTop:10, background:"transparent", border:"none", color:C.success, fontSize:12, cursor:"pointer", fontWeight:600 }}>Close</button>
        </div>
      )}
      {adding && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
          <MemberFormFields form={form} setForm={setForm} showTeam={true} showCgp={true} teamGroups={teamGroups} cgpGroups={cgpGroups} />
          <button onClick={addMember} style={{ background:C.primary, border:"none", color:"#fff", padding:"10px 24px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Save Member</button>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.members.map(m => editId === m.id ? (
          <div key={m.id} style={{ background:C.surface, border:`2px solid ${C.primary}`, borderRadius:12, padding:18 }}>
            <MemberFormFields form={editForm} setForm={setEditForm} showTeam={true} showCgp={true} teamGroups={teamGroups} cgpGroups={cgpGroups} />
            <button onClick={saveEdit} style={{ background:C.primary, border:"none", color:"#fff", padding:"8px 18px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:600, marginRight:8 }}>Save</button>
            <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 18px", borderRadius:6, fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        ) : (
          <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", fontWeight:600 }}>{m.avatar}</div>
            <div style={{ flex:1 }}>
              <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name} {m.is_team_lead && <span style={{background:C.warningLight, color:C.warning, fontSize:10, padding:"2px 6px", borderRadius:4, marginLeft:4}}>👑 LEAD</span>} {m.is_manager && <span style={{background:C.purpleLight, color:C.purple, fontSize:10, padding:"2px 6px", borderRadius:4, marginLeft:4}}>👔 MANAGER</span>}</p>
              <p style={{ color:C.textMuted, fontSize:12 }}>
                {m.email} · {m.role} · 🕐 {to12(m.checkin_time)} → {to12(m.end_time||"18:00")} (grace {m.grace_minutes ?? 15}m)
                {m.team_id && ` · 👥 ${data.teams.find(t=>t.id===m.team_id)?.name || "Team"}`}
                {m.cgp_id && ` · 🚀 ${data.teams.find(t=>t.id===m.cgp_id)?.name || "CGP"}`}
                {m.cgp_id_2 && ` · 🚀 ${data.teams.find(t=>t.id===m.cgp_id_2)?.name || "CGP"}`}
                {m.cgp_id_3 && ` · 🚀 ${data.teams.find(t=>t.id===m.cgp_id_3)?.name || "CGP"}`}
              </p>
              {m.job_description && <p style={{ color:C.primary, fontSize:11, marginTop:2 }}>💼 {m.job_description}</p>}
            </div>
            <button onClick={()=>{setEditId(m.id); setEditForm({name:m.name, email:m.email, password:m.password, role:m.role, checkin_time:m.checkin_time, end_time:m.end_time||"18:00", grace_minutes:m.grace_minutes??15, job_description:m.job_description||"", team_id:m.team_id||"", cgp_id:m.cgp_id||"", cgp_id_2:m.cgp_id_2||"", cgp_id_3:m.cgp_id_3||"", is_manager:!!m.is_manager})}} style={{ background:C.primaryLight, border:"none", color:C.primary, fontSize:12, padding:"7px 14px", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Edit</button>
            <button onClick={()=>deleteMember(m.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:12, padding:"7px 14px", borderRadius:6, cursor:"pointer" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminTasks({ data, refresh }) {
  const [form, setForm] = useState({ title:"", assigned_to:"", deadline:"", priority:"medium", category:"Development" })
  const [adding, setAdding] = useState(false)
  const addTask = async () => {
    if (!form.title.trim()||!form.assigned_to||!form.deadline) return alert("Sab bharo!")
    await supabase.from('tasks').insert({ id:"t"+Date.now(), ...form, status:"pending", progress:0 })
    setForm({ title:"", assigned_to:"", deadline:"", priority:"medium", category:"Development" })
    setAdding(false)
    refresh()
  }
  const del = async (id) => { await supabase.from('tasks').delete().eq('id', id); refresh() }
  const upd = async (id, status) => { await supabase.from('tasks').update({ status, progress:status==="done"?100:undefined }).eq('id', id); refresh() }
  const pColor = { high:C.danger, medium:C.warning, low:C.success }
  const pBg = { high:C.dangerLight, medium:C.warningLight, low:C.successLight }
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Tasks ({data.tasks.length})</h2>
        <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>{adding?"Cancel":"+ Add Task"}</button>
      </div>
      {adding && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
          <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Task title" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box", marginBottom:10 }} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            <select value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">-- Assign --</option>
              {data.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }} />
            <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <button onClick={addTask} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Add Task</button>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.tasks.map(t => {
          const mem = data.members.find(m=>m.id===t.assigned_to)
          const overdue = t.status!=="done" && isPastDate(t.deadline)
          return (
            <div key={t.id} style={{ background:overdue?C.dangerLight:C.surface, border:`1px solid ${overdue?C.danger:C.border}`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:4, height:40, background:pColor[t.priority], borderRadius:2 }} />
              <div style={{ flex:1 }}>
                <p style={{ color:t.status==="done"?C.textMuted:C.text, fontWeight:600, fontSize:14, textDecoration:t.status==="done"?"line-through":"none" }}>{t.title}</p>
                <p style={{ color:C.textMuted, fontSize:12 }}>👤 {mem?.name||"?"} · 📅 {t.deadline} · <span style={{ color:pColor[t.priority], background:pBg[t.priority], padding:"2px 8px", borderRadius:10, fontWeight:600 }}>{t.priority}</span></p>
              </div>
              <select value={t.status} onChange={e=>upd(t.id,e.target.value)} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", fontSize:12 }}>
                <option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="done">Done</option>
              </select>
              <button onClick={()=>del(t.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:12, padding:"5px 10px", borderRadius:6, cursor:"pointer" }}>✕</button>
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
  const reset = async (id) => {
    if (!confirm("Reset?")) return
    await supabase.from('member_stats').update({ late_count:0, strikes:0 }).eq('member_id', id)
    refresh()
  }
  return (
    <div>
      <div style={{ display:"flex", gap:16, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Attendance</h2>
        <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", fontSize:13 }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.members.map(m => {
          const a = att[m.id]
          const lc = data.stats[m.id]?.lateCount || 0
          const s = data.stats[m.id]?.strikes || 0
          return (
            <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", fontWeight:600 }}>{m.avatar}</div>
              <div style={{ flex:1 }}>
                <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name}</p>
                <p style={{ color:C.textMuted, fontSize:12 }}>🕐 {to12(m.checkin_time)} → {to12(m.end_time||"18:00")} · Grace: {m.grace_minutes ?? 15}m · Lates: {lc} · Strikes: {s}</p>
              </div>
              {a ? <span style={{ background:a.status==="ontime"?C.successLight:C.warningLight, color:a.status==="ontime"?C.success:C.warning, fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>{a.status==="ontime"?"✓ "+to12(a.checkIn):"⚠ "+to12(a.checkIn)}</span>
               : <span style={{ background:C.dangerLight, color:C.danger, fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>✗ Absent</span>}
              {(lc>0||s>0) && <button onClick={()=>reset(m.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.warning, fontSize:11, padding:"5px 10px", borderRadius:6, cursor:"pointer" }}>Reset</button>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminReports({ data, user, refresh }) {
  const [viewDate, setViewDate] = useState(today())
  const reports = data.reports[viewDate] || {}
  const [commentText, setCommentText] = useState({})
  const addComment = async (mid) => {
    const t = commentText[mid]?.trim()
    if (!t) return alert("Comment likhein!")
    await supabase.from('report_comments').insert({ report_member_id:mid, report_date:viewDate, author:user.name, text:t })
    setCommentText({...commentText, [mid]:""})
    refresh()
  }
  return (
    <div>
      <div style={{ display:"flex", gap:14, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Daily Reports</h2>
        <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", fontSize:13 }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {data.members.map(m => {
          const r = reports[m.id]
          const comments = data.reportComments[`${m.id}|${viewDate}`] || []
          return (
            <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:600 }}>{m.avatar}</div>
                <div>
                  <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name}</p>
                  <p style={{ color:C.textMuted, fontSize:12 }}>{m.role}</p>
                </div>
                {r ? <span style={{ marginLeft:"auto", background:C.successLight, color:C.success, fontSize:11, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>✓ Submitted</span>
                   : <span style={{ marginLeft:"auto", background:C.dangerLight, color:C.danger, fontSize:11, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>Not submitted</span>}
              </div>
              {r && (
                <>
                  <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div><p style={{ color:C.textMuted, fontSize:11 }}>Tasks</p><p style={{ color:C.text, fontSize:13 }}>{r.tasksCompleted}</p></div>
                    <div><p style={{ color:C.textMuted, fontSize:11 }}>Hours</p><p style={{ color:C.text, fontSize:13 }}>{r.hoursWorked}h</p></div>
                    {r.blockers && <div style={{ gridColumn:"1/-1" }}><p style={{ color:C.textMuted, fontSize:11 }}>Blockers</p><p style={{ color:C.warning, fontSize:13 }}>{r.blockers}</p></div>}
                    {r.notes && <div style={{ gridColumn:"1/-1" }}><p style={{ color:C.textMuted, fontSize:11 }}>Notes</p><p style={{ color:C.text, fontSize:13 }}>{r.notes}</p></div>}
                  </div>
                  <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                    <p style={{ color:C.textMuted, fontSize:11, fontWeight:600, marginBottom:6 }}>💬 Comments ({comments.length})</p>
                    {comments.map((c,i)=>(
                      <div key={i} style={{ background:C.primaryLight, borderRadius:6, padding:"6px 10px", marginBottom:4, fontSize:12 }}>
                        <strong style={{color:C.primary}}>{c.author}:</strong> {c.text}
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:6, marginTop:6 }}>
                      <input value={commentText[m.id]||""} onChange={e=>setCommentText({...commentText,[m.id]:e.target.value})} placeholder="Add comment..." style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", fontSize:12, boxSizing:"border-box" }} />
                      <button onClick={()=>addComment(m.id)} style={{ background:C.primary, border:"none", color:"#fff", padding:"6px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>Send</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============ SHIFT + JOB CARD (shown on member/team-lead home) ============
function ShiftJobCard({ user }) {
  return (
    <div style={{ background:`linear-gradient(135deg, ${C.primary}, ${C.purple})`, borderRadius:14, padding:20, marginBottom:20, color:"#fff" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <p style={{ fontSize:11, opacity:0.85, marginBottom:4, fontWeight:500 }}>🕐 YOUR SHIFT</p>
          <p style={{ fontSize:22, fontWeight:700 }}>{to12(user.checkinTime)} → {to12(user.endTime)}</p>
          <p style={{ fontSize:11, opacity:0.85, marginTop:2 }}>Grace: {user.graceMinutes} min · 🇵🇰 PKT</p>
        </div>
        <div>
          <p style={{ fontSize:11, opacity:0.85, marginBottom:4, fontWeight:500 }}>💼 YOUR JOB</p>
          <p style={{ fontSize:14, fontWeight:600, lineHeight:1.4 }}>{user.jobDescription || "Job description set nahi hai — admin se contact karein."}</p>
        </div>
      </div>
    </div>
  )
}

// ============ TEAM LEAD DASHBOARD ============
function TeamLeadDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("home")
  const [team, setTeam] = useState(null)
  const [cgp, setCgp] = useState(null)
  const [members, setMembers] = useState([])
  const [myData, setMyData] = useState({ tasks:[], attendance:{}, reports:{}, stats:{lateCount:0,strikes:0}, reportComments:{} })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [teamRes, cgpRes, { data:allMems }, { data:tasks }, { data:att }, { data:reps }, { data:stats }, { data:rc }] = await Promise.all([
      user.teamId ? supabase.from('teams').select('*').eq('id', user.teamId).maybeSingle() : Promise.resolve({data:null}),
      user.cgpId ? supabase.from('teams').select('*').eq('id', user.cgpId).maybeSingle() : Promise.resolve({data:null}),
      supabase.from('members').select('*').eq('is_admin', false).order('created_at'),
      supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at'),
      supabase.from('attendance').select('*').eq('member_id', user.id),
      supabase.from('reports').select('*').eq('member_id', user.id),
      supabase.from('member_stats').select('*').eq('member_id', user.id).maybeSingle(),
      supabase.from('report_comments').select('*').eq('report_member_id', user.id).order('created_at'),
    ])
    setTeam(teamRes.data)
    setCgp(cgpRes.data)
    setMembers(allMems || [])
    const attMap = {}; (att||[]).forEach(a=>{ attMap[a.date]={checkIn:a.check_in,checkOut:a.check_out,status:a.status} })
    const repMap = {}; (reps||[]).forEach(r=>{ repMap[r.date]={tasksCompleted:r.tasks_completed,hoursWorked:r.hours_worked,blockers:r.blockers,notes:r.notes} })
    const rcMap = {}; (rc||[]).forEach(c=>{ if(!rcMap[c.report_date]) rcMap[c.report_date]=[]; rcMap[c.report_date].push({author:c.author, text:c.text}) })
    setMyData({ tasks:tasks||[], attendance:attMap, reports:repMap, stats:stats?{lateCount:stats.late_count, strikes:stats.strikes}:{lateCount:0,strikes:0}, reportComments:rcMap })
    setLoading(false)
  }, [user.id, user.teamId, user.cgpId])

  useEffect(() => { refresh() }, [refresh])

  if (loading) return <Loader />

  if (!team && !cgp) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ color:C.textMuted, fontSize:14, marginBottom:14 }}>Aap kisi group ke Lead nahi hain abhi.</p>
        <button onClick={onLogout} style={{ background:C.primary, border:"none", color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Logout</button>
      </div>
    </div>
  )

  const primary = team || cgp

  const tabs = [{ id:"home", label:"Home", icon:"🏠" }]
  if (team) {
    tabs.push({ id:"team", label:"My Team", icon:"👥" })
    tabs.push({ id:"team_accounts", label:"Team Accounts", icon:"📊" })
    tabs.push({ id:"team_links", label:"Team Links", icon:"🔗" })
    tabs.push({ id:"team_gmail", label:"Team Gmail", icon:"📧" })
  }
  if (cgp) {
    tabs.push({ id:"cgp", label:"My CGP", icon:"🚀" })
    tabs.push({ id:"cgp_accounts", label:"CGP Accounts", icon:"📊" })
    tabs.push({ id:"cgp_links", label:"CGP Links", icon:"🔗" })
    tabs.push({ id:"cgp_gmail", label:"CGP Gmail", icon:"📧" })
  }
  tabs.push({ id:"niche", label:"Niche Ideas", icon:"💡" })
  tabs.push({ id:"voiceover", label:"Voiceover Ideas", icon:"🎙️" })
  tabs.push({ id:"tasks", label:"My Tasks", icon:"✅" })
  tabs.push({ id:"report", label:"Report", icon:"📋" })

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:getColor(user.id), borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:600 }}>{user.avatar}</div>
          <div>
            <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>{user.name} 👑</p>
            <p style={{ color:C.textMuted, fontSize:11 }}>Lead · {primary?.name}</p>
          </div>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, padding:"7px 16px", borderRadius:8, cursor:"pointer" }}>Logout</button>
      </div>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", gap:4, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ background:"transparent", border:"none", borderBottom:tab===t.id?`2px solid ${C.primary}`:"2px solid transparent", color:tab===t.id?C.primary:C.textMuted, padding:"14px 12px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontWeight:tab===t.id?600:500 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, padding:20, overflowY:"auto" }}>
        {tab==="home" && (
          <TeamLeadHome user={user} team={team} cgp={cgp} members={members} myData={myData} refresh={refresh} />
        )}
        {tab==="team" && team && <GroupMembersManage groupId={team.id} groupMode="team" allMembers={members} refresh={refresh} canManage={true} />}
        {tab==="team_accounts" && team && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>📊 Team TikTok Accounts</h2><TikTokSheet teamId={team.id} canEdit={true} userName={user.name} /></div>}
        {tab==="team_links" && team && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🔗 Team Links</h2><TeamLinks teamId={team.id} canEdit={true} /></div>}
        {tab==="team_gmail" && team && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>📧 Team Gmail + Login Password</h2><GmailAccounts teamId={team.id} canEdit={true} /></div>}
        {tab==="cgp" && cgp && <GroupMembersManage groupId={cgp.id} groupMode="cgp" allMembers={members} refresh={refresh} canManage={true} />}
        {tab==="cgp_accounts" && cgp && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>📊 CGP TikTok Accounts</h2><TikTokSheet teamId={cgp.id} canEdit={true} userName={user.name} /></div>}
        {tab==="cgp_links" && cgp && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🔗 CGP Links</h2><TeamLinks teamId={cgp.id} canEdit={true} /></div>}
        {tab==="cgp_gmail" && cgp && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>📧 CGP Gmail + Login Password</h2><GmailAccounts teamId={cgp.id} canEdit={true} /></div>}
        {tab==="niche" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>💡 Niche Ideas</h2><IdeasBoard user={user} table="niche_ideas" title="Niche Ideas Board" emoji="💡" /></div>}
        {tab==="voiceover" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🎙️ Voiceover Ideas</h2><IdeasBoard user={user} table="voiceover_ideas" title="Voiceover Ideas Board" emoji="🎙️" /></div>}
        {tab==="tasks" && <MemberTasks data={myData} refresh={refresh} />}
        {tab==="report" && <MemberReport data={myData} user={user} refresh={refresh} />}
      </div>
    </div>
  )
}

// ============ MEMBER DASHBOARD ============
function MemberDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("home")
  const [data, setData] = useState({ tasks:[], attendance:{}, reports:{}, stats:{lateCount:0,strikes:0}, reportComments:{}, team:null, teamMembers:[], cgp:null, cgpMembers:[] })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const cgpIds = user.cgpIds || (user.cgpId ? [user.cgpId] : [])
    const [{ data:tasks }, { data:att }, { data:reps }, { data:stats }, { data:rc }, teamRes, tmRes, cgpsRes, cgpMembersRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at'),
      supabase.from('attendance').select('*').eq('member_id', user.id),
      supabase.from('reports').select('*').eq('member_id', user.id),
      supabase.from('member_stats').select('*').eq('member_id', user.id).maybeSingle(),
      supabase.from('report_comments').select('*').eq('report_member_id', user.id).order('created_at'),
      user.teamId ? supabase.from('teams').select('*').eq('id', user.teamId).maybeSingle() : Promise.resolve({data:null}),
      user.teamId ? supabase.from('members').select('*').eq('team_id', user.teamId) : Promise.resolve({data:[]}),
      cgpIds.length ? supabase.from('teams').select('*').in('id', cgpIds) : Promise.resolve({data:[]}),
      cgpIds.length ? supabase.from('members').select('*').or(cgpIds.map(id=>`cgp_id.eq.${id},cgp_id_2.eq.${id},cgp_id_3.eq.${id}`).join(',')) : Promise.resolve({data:[]}),
    ])
    const attMap = {}; (att||[]).forEach(a=>{ attMap[a.date]={checkIn:a.check_in,checkOut:a.check_out,status:a.status} })
    const repMap = {}; (reps||[]).forEach(r=>{ repMap[r.date]={tasksCompleted:r.tasks_completed,hoursWorked:r.hours_worked,blockers:r.blockers,notes:r.notes} })
    const rcMap = {}; (rc||[]).forEach(c=>{ if(!rcMap[c.report_date]) rcMap[c.report_date]=[]; rcMap[c.report_date].push({author:c.author, text:c.text}) })
    // Map cgpId -> list of members in that CGP
    const cgpMembersMap = {}
    ;(cgpMembersRes.data||[]).forEach(m => {
      cgpIds.forEach(id => {
        if (m.cgp_id === id || m.cgp_id_2 === id || m.cgp_id_3 === id) {
          if (!cgpMembersMap[id]) cgpMembersMap[id] = []
          cgpMembersMap[id].push(m)
        }
      })
    })
    // Order CGPs to match cgpIds order
    const cgpsOrdered = cgpIds.map(id => (cgpsRes.data||[]).find(x=>x.id===id)).filter(Boolean)
    setData({ tasks:tasks||[], attendance:attMap, reports:repMap, stats:stats?{lateCount:stats.late_count, strikes:stats.strikes}:{lateCount:0,strikes:0}, reportComments:rcMap, team:teamRes.data, teamMembers:tmRes.data||[], cgps:cgpsOrdered, cgpMembersMap })
    setLoading(false)
  }, [user.id, user.teamId, JSON.stringify(user.cgpIds||[])])

  useEffect(() => { refresh() }, [refresh])

  if (loading) return <Loader />

  const cgps = data.cgps || []

  const tabs = [
    { id:"home", label:"Home", icon:"🏠" },
    { id:"tasks", label:"My Tasks", icon:"✅" },
    { id:"report", label:"Daily Report", icon:"📋" },
  ]
  if (user.teamId) tabs.push({ id:"team", label:"My Team", icon:"👥" })
  cgps.forEach((c, i) => tabs.push({ id:"cgp_"+i, label: c.name || (i===0 ? "My CGP" : "CGP "+(i+1)), icon:"🚀" }))
  tabs.push({ id:"niche", label:"Niche Ideas", icon:"💡" })
  tabs.push({ id:"voiceover", label:"Voiceover Ideas", icon:"🎙️" })

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:getColor(user.id), borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:600 }}>{user.avatar}</div>
          <div>
            <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>{user.name}</p>
            <p style={{ color:C.textMuted, fontSize:11 }}>
              {user.role}
              {data.team && ` · 👥 ${data.team.name}`}
              {(data.cgps||[]).map(c => ` · 🚀 ${c.name}`).join('')}
            </p>
          </div>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, padding:"7px 16px", borderRadius:8, cursor:"pointer" }}>Logout</button>
      </div>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", gap:4, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ background:"transparent", border:"none", borderBottom:tab===t.id?`2px solid ${C.primary}`:"2px solid transparent", color:tab===t.id?C.primary:C.textMuted, padding:"14px 12px", fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontWeight:tab===t.id?600:500 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, padding:20, overflowY:"auto" }}>
        {tab==="home" && <MemberHome data={data} user={user} refresh={refresh} />}
        {tab==="tasks" && <MemberTasks data={data} refresh={refresh} />}
        {tab==="report" && <MemberReport data={data} user={user} refresh={refresh} />}
        {tab==="team" && <MemberGroupView group={data.team} groupMembers={data.teamMembers} groupMode="team" user={user} />}
        {cgps.map((c, i) => tab==="cgp_"+i && <MemberGroupView key={c.id} group={c} groupMembers={(data.cgpMembersMap||{})[c.id]||[]} groupMode="cgp" user={user} />)}
        {tab==="niche" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>💡 Niche Ideas</h2><IdeasBoard user={user} table="niche_ideas" title="Niche Ideas Board" emoji="💡" /></div>}
        {tab==="voiceover" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🎙️ Voiceover Ideas</h2><IdeasBoard user={user} table="voiceover_ideas" title="Voiceover Ideas Board" emoji="🎙️" /></div>}
      </div>
    </div>
  )
}

function MemberHome({ data, user, refresh }) {
  const td = today()
  const att = data.attendance[td]
  const pending = data.tasks.filter(t=>t.status==="pending").length
  const done = data.tasks.filter(t=>t.status==="done").length
  const reportDone = !!data.reports[td]
  const [now, setNow] = useState(nowHHMM())
  const [lateReason, setLateReason] = useState("")

  useEffect(() => {
    const t = setInterval(()=>setNow(nowHHMM()), 15000)
    return ()=>clearInterval(t)
  }, [])

  const graceMin = user.graceMinutes ?? 15
  const fixedMin = timeToMin(user.checkinTime||"09:00")
  const nowMin = timeToMin(now)
  const windowOpen = nowMin >= fixedMin
  const isLate = nowMin > fixedMin + graceMin

  const doCheckin = async () => {
    if (att?.checkIn) return
    if (isLate && !lateReason.trim()) return alert("Late reason zaroori!")
    await supabase.from('attendance').upsert({ member_id:user.id, date:td, check_in:now, status:isLate?"late":"ontime", reason:lateReason||null, late_by:isLate?nowMin-fixedMin:0 }, { onConflict:'member_id,date' })
    if (isLate) {
      const newLc = data.stats.lateCount + 1
      await supabase.from('member_stats').upsert({ member_id:user.id, late_count:newLc, strikes:data.stats.strikes + (newLc%9===0?1:0) }, { onConflict:'member_id' })
    }
    setLateReason("")
    refresh()
  }

  const doCheckout = async () => {
    if (!att?.checkIn || att?.checkOut) return
    await supabase.from('attendance').update({ check_out:now }).eq('member_id', user.id).eq('date', td)
    refresh()
  }

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:22, fontWeight:700 }}>Assalam u Alaikum, {user.name.split(" ")[0]}! 👋</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>{td}</p>

      <ShiftJobCard user={user} />

      <div style={{ maxWidth:520, margin:"0 auto 24px" }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:22, textAlign:"center", marginBottom:14 }}>
          <p style={{ color:C.textMuted, fontSize:13 }}>Current time 🇵🇰 Pakistan (PKT)</p>
          <p style={{ color:C.text, fontSize:38, fontWeight:700 }}>{to12(now)}</p>
        </div>

        {!att?.checkIn ? (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, textAlign:"center" }}>
            {windowOpen ? (
              <>
                {isLate && <input value={lateReason} onChange={e=>setLateReason(e.target.value)} placeholder="Late reason zaroori..." style={{ marginBottom:12, width:"100%", maxWidth:300, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />}
                {isLate && <br/>}
                <button onClick={doCheckin} style={{ background:isLate?C.warning:C.success, border:"none", color:"#fff", padding:"14px 40px", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" }}>
                  {isLate ? "⚠ Late Check In" : "✓ Check In"}
                </button>
              </>
            ) : (
              <p style={{ color:C.textMuted, fontSize:14 }}>Check-in window opens at {to12(user.checkinTime)} ({fixedMin - nowMin} min)</p>
            )}
          </div>
        ) : (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, display:"flex", gap:14 }}>
            <div style={{ flex:1, background:C.bg, borderRadius:10, padding:12, textAlign:"center" }}>
              <p style={{ color:C.textMuted, fontSize:11 }}>Checked in</p>
              <p style={{ color:att.status==="ontime"?C.success:C.warning, fontSize:20, fontWeight:700 }}>{to12(att.checkIn)}</p>
            </div>
            {att.checkOut ? (
              <div style={{ flex:1, background:C.bg, borderRadius:10, padding:12, textAlign:"center" }}>
                <p style={{ color:C.textMuted, fontSize:11 }}>Checked out</p>
                <p style={{ color:C.primary, fontSize:20, fontWeight:700 }}>{to12(att.checkOut)}</p>
              </div>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <button onClick={doCheckout} style={{ background:C.primary, border:"none", color:"#fff", padding:"12px 24px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Check Out</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12 }}>Tasks</p>
          <p style={{ color:C.warning, fontSize:20, fontWeight:700 }}>{pending} pending</p>
          <p style={{ color:C.textMuted, fontSize:11 }}>{done} done</p>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12 }}>Daily Report</p>
          <p style={{ color:reportDone?C.success:C.danger, fontSize:18, fontWeight:700 }}>{reportDone?"✓ Submitted":"Pending"}</p>
        </div>
      </div>
    </div>
  )
}

function TeamLeadHome({ user, team, cgp, members, myData, refresh }) {
  const td = today()
  const att = myData.attendance[td]
  const [now, setNow] = useState(nowHHMM())
  const [lateReason, setLateReason] = useState("")

  useEffect(() => {
    const t = setInterval(()=>setNow(nowHHMM()), 15000)
    return ()=>clearInterval(t)
  }, [])

  const graceMin = user.graceMinutes ?? 15
  const fixedMin = timeToMin(user.checkinTime||"09:00")
  const nowMin = timeToMin(now)
  const windowOpen = nowMin >= fixedMin
  const isLate = nowMin > fixedMin + graceMin

  const doCheckin = async () => {
    if (att?.checkIn) return
    if (isLate && !lateReason.trim()) return alert("Late reason zaroori!")
    await supabase.from('attendance').upsert({ member_id:user.id, date:td, check_in:now, status:isLate?"late":"ontime", reason:lateReason||null, late_by:isLate?nowMin-fixedMin:0 }, { onConflict:'member_id,date' })
    if (isLate) {
      const newLc = myData.stats.lateCount + 1
      await supabase.from('member_stats').upsert({ member_id:user.id, late_count:newLc, strikes:myData.stats.strikes + (newLc%9===0?1:0) }, { onConflict:'member_id' })
    }
    setLateReason("")
    refresh()
  }

  const doCheckout = async () => {
    if (!att?.checkIn || att?.checkOut) return
    await supabase.from('attendance').update({ check_out:now }).eq('member_id', user.id).eq('date', td)
    refresh()
  }

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:22, fontWeight:700, marginBottom:4 }}>👑 Welcome, {user.name.split(" ")[0]}!</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>{td}</p>
      <ShiftJobCard user={user} />

      <div style={{ maxWidth:520, margin:"0 auto 24px" }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:22, textAlign:"center", marginBottom:14 }}>
          <p style={{ color:C.textMuted, fontSize:13 }}>Current time 🇵🇰 Pakistan (PKT)</p>
          <p style={{ color:C.text, fontSize:38, fontWeight:700 }}>{to12(now)}</p>
        </div>

        {!att?.checkIn ? (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, textAlign:"center" }}>
            {windowOpen ? (
              <>
                {isLate && <input value={lateReason} onChange={e=>setLateReason(e.target.value)} placeholder="Late reason zaroori..." style={{ marginBottom:12, width:"100%", maxWidth:300, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />}
                {isLate && <br/>}
                <button onClick={doCheckin} style={{ background:isLate?C.warning:C.success, border:"none", color:"#fff", padding:"14px 40px", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" }}>
                  {isLate ? "⚠ Late Check In" : "✓ Check In"}
                </button>
              </>
            ) : (
              <p style={{ color:C.textMuted, fontSize:14 }}>Check-in window opens at {to12(user.checkinTime)} ({fixedMin - nowMin} min)</p>
            )}
          </div>
        ) : (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, display:"flex", gap:14 }}>
            <div style={{ flex:1, background:C.bg, borderRadius:10, padding:12, textAlign:"center" }}>
              <p style={{ color:C.textMuted, fontSize:11 }}>Checked in</p>
              <p style={{ color:att.status==="ontime"?C.success:C.warning, fontSize:20, fontWeight:700 }}>{to12(att.checkIn)}</p>
            </div>
            {att.checkOut ? (
              <div style={{ flex:1, background:C.bg, borderRadius:10, padding:12, textAlign:"center" }}>
                <p style={{ color:C.textMuted, fontSize:11 }}>Checked out</p>
                <p style={{ color:C.primary, fontSize:20, fontWeight:700 }}>{to12(att.checkOut)}</p>
              </div>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <button onClick={doCheckout} style={{ background:C.primary, border:"none", color:"#fff", padding:"12px 24px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Check Out</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
        {team && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
            <p style={{ color:C.textMuted, fontSize:12 }}>👥 Team: {team.name}</p>
            <p style={{ color:C.purple, fontSize:22, fontWeight:700 }}>{members.filter(m=>m.team_id===team.id).length} members</p>
          </div>
        )}
        {cgp && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
            <p style={{ color:C.textMuted, fontSize:12 }}>🚀 CGP: {cgp.name}</p>
            <p style={{ color:C.orange, fontSize:22, fontWeight:700 }}>{members.filter(m=>m.cgp_id===cgp.id).length} members</p>
          </div>
        )}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12 }}>My Tasks</p>
          <p style={{ color:C.warning, fontSize:22, fontWeight:700 }}>{myData.tasks.filter(t=>t.status!=="done").length}</p>
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
    const t = setInterval(()=>setNow(nowHHMM()), 15000)
    return ()=>clearInterval(t)
  }, [])

  const startMin = timeToMin(user.checkinTime||"09:00")
  const endMin = timeToMin(user.endTime||"18:00")
  const graceMin = user.graceMinutes ?? 15
  const nowMin = timeToMin(now)
  // On-time window: from start till start+grace
  const canCheckInOntime = nowMin <= startMin + graceMin
  const canCheckInAny = nowMin >= startMin - 30 // allow up to 30 min before start too

  const doCheckin = async () => {
    if (att?.checkIn) return
    const isLate = nowMin > startMin + graceMin
    if (isLate && !lateReason.trim()) return alert("Late reason zaroori!")
    await supabase.from('attendance').upsert({ member_id:user.id, date:td, check_in:now, status:isLate?"late":"ontime", reason:lateReason||null, late_by:isLate?nowMin-startMin:0 }, { onConflict:'member_id,date' })
    if (isLate) {
      const newLc = data.stats.lateCount + 1
      await supabase.from('member_stats').upsert({ member_id:user.id, late_count:newLc, strikes:data.stats.strikes + (newLc%9===0?1:0) }, { onConflict:'member_id' })
    }
    setLateReason("")
    refresh()
  }

  const doCheckout = async () => {
    if (!att?.checkIn || att?.checkOut) return
    await supabase.from('attendance').update({ check_out:now }).eq('member_id', user.id).eq('date', td)
    refresh()
  }

  const isLateNow = nowMin > startMin + graceMin

  return (
    <div style={{ maxWidth:800, margin:"0 auto" }}>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, textAlign:"center" }}>Attendance</h2>
      
      <ShiftJobCard user={user} />
      
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, textAlign:"center", margin:"20px 0" }}>
        <p style={{ color:C.textMuted, fontSize:13 }}>Current time 🇵🇰 Pakistan (PKT)</p>
        <p style={{ color:C.text, fontSize:44, fontWeight:700 }}>{to12(now)}</p>
        <p style={{ color:C.textMuted, fontSize:11, marginTop:4 }}>Aapki shift: {to12(user.checkinTime)} → {to12(user.endTime)} (Grace: {graceMin}m)</p>
      </div>
      {!att?.checkIn ? (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24, textAlign:"center" }}>
          {isLateNow && <input value={lateReason} onChange={e=>setLateReason(e.target.value)} placeholder="Late reason zaroori..." style={{ marginBottom:10, width:"100%", maxWidth:300, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:13, boxSizing:"border-box" }} />}
          <button onClick={doCheckin} style={{ background:isLateNow?C.warning:C.success, border:"none", color:"#fff", padding:"14px 40px", borderRadius:10, fontSize:16, fontWeight:600, cursor:"pointer" }}>{isLateNow?"⚠ Late Check In":"✓ Check In"}</button>
          {!isLateNow && nowMin < startMin && (
            <p style={{ color:C.textMuted, fontSize:12, marginTop:10 }}>Aap {startMin - nowMin} min pehle check-in kar rahe hain</p>
          )}
        </div>
      ) : (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24, display:"flex", gap:16 }}>
          <div style={{ flex:1, background:C.bg, borderRadius:10, padding:14 }}>
            <p style={{ color:C.textMuted, fontSize:12 }}>Checked in</p>
            <p style={{ color:att.status==="ontime"?C.success:C.warning, fontSize:22, fontWeight:700 }}>{to12(att.checkIn)}</p>
          </div>
          {att.checkOut ? (
            <div style={{ flex:1, background:C.bg, borderRadius:10, padding:14 }}>
              <p style={{ color:C.textMuted, fontSize:12 }}>Checked out</p>
              <p style={{ color:C.primary, fontSize:22, fontWeight:700 }}>{to12(att.checkOut)}</p>
            </div>
          ) : (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <button onClick={doCheckout} style={{ background:C.primary, border:"none", color:"#fff", padding:"12px 24px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Check Out</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MemberTasks({ data, refresh }) {
  const pColor = { high:C.danger, medium:C.warning, low:C.success }
  const pBg = { high:C.dangerLight, medium:C.warningLight, low:C.successLight }
  const upd = async (id, status) => { await supabase.from('tasks').update({ status, progress:status==="done"?100:undefined }).eq('id', id); refresh() }
  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:20 }}>My Tasks ({data.tasks.length})</h2>
      {data.tasks.length===0 && <div style={{ textAlign:"center", padding:40, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:12 }}><p style={{ color:C.textMuted, fontSize:14 }}>🎉 Koi task nahi!</p></div>}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.tasks.map(t => {
          const overdue = t.status!=="done" && isPastDate(t.deadline)
          return (
            <div key={t.id} style={{ background:overdue?C.dangerLight:C.surface, border:`1px solid ${overdue?C.danger:C.border}`, borderRadius:10, padding:"14px 16px", display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:4, height:40, background:pColor[t.priority], borderRadius:2 }} />
              <div style={{ flex:1 }}>
                <p style={{ color:t.status==="done"?C.textMuted:C.text, fontWeight:600, fontSize:14, textDecoration:t.status==="done"?"line-through":"none" }}>{t.title}</p>
                <p style={{ color:C.textMuted, fontSize:12 }}>📅 {t.deadline} · <span style={{ color:pColor[t.priority], background:pBg[t.priority], padding:"2px 8px", borderRadius:10, fontWeight:600 }}>{t.priority}</span></p>
              </div>
              {t.status!=="done" && <button onClick={()=>upd(t.id,"done")} style={{ background:C.successLight, border:"none", color:C.success, fontSize:12, padding:"6px 12px", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Done ✓</button>}
              {t.status==="done" && <span style={{ color:C.success, fontSize:12, fontWeight:600 }}>✓ Completed</span>}
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
  const submit = async () => {
    if (!form.tasksCompleted||!form.hoursWorked) return alert("Tasks aur hours zaroori!")
    await supabase.from('reports').upsert({ member_id:user.id, date:td, tasks_completed:form.tasksCompleted, hours_worked:form.hoursWorked, blockers:form.blockers||null, notes:form.notes||null, submitted_at:nowHHMM() }, { onConflict:'member_id,date' })
    setSubmitted(true)
    refresh()
  }
  const comments = data.reportComments[td] || []
  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Daily Report · {td}</h2>
      {submitted ? (
        <div>
          <div style={{ background:C.successLight, border:`1px solid ${C.success}`, borderRadius:16, padding:24, marginBottom:16, marginTop:16 }}>
            <p style={{ color:C.success, fontSize:18, fontWeight:700 }}>✓ Report submitted!</p>
            <button onClick={()=>setSubmitted(false)} style={{ marginTop:14, background:"transparent", border:`1px solid ${C.success}`, color:C.success, padding:"8px 18px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Edit</button>
          </div>
          {comments.length > 0 && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
              <p style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>💬 Feedback</p>
              {comments.map((c,i)=>(
                <div key={i} style={{ background:C.primaryLight, borderRadius:8, padding:"10px 12px", marginBottom:6 }}>
                  <strong style={{ color:C.primary, fontSize:12 }}>{c.author}:</strong>
                  <p style={{ color:C.text, fontSize:13 }}>{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginTop:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <input value={form.tasksCompleted} onChange={e=>setForm(f=>({...f,tasksCompleted:e.target.value}))} placeholder="Tasks completed" style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
            <input type="number" value={form.hoursWorked} onChange={e=>setForm(f=>({...f,hoursWorked:e.target.value}))} placeholder="Hours" style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
          </div>
          <input value={form.blockers} onChange={e=>setForm(f=>({...f,blockers:e.target.value}))} placeholder="Blockers (optional)" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box", marginBottom:14 }} />
          <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="Notes" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box", marginBottom:20, resize:"vertical", fontFamily:"inherit" }} />
          <button onClick={submit} style={{ background:C.primary, border:"none", color:"#fff", padding:"12px 28px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Submit →</button>
        </div>
      )}
    </div>
  )
}

function MemberGroupView({ group, groupMembers, groupMode, user }) {
  if (!group) return <p style={{ color:C.textMuted, fontSize:14 }}>Aap kisi {groupMode==='cgp'?'CGP':'team'} mein nahi hain.</p>
  const emoji = groupMode==='cgp' ? '🚀' : '👥'
  return (
    <div>
      <h2 style={{ color:C.text, fontSize:22, fontWeight:700 }}>{emoji} {group.name}</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>{group.description || "—"}</p>
      
      <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>Members</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:24 }}>
        {groupMembers.map(m => (
          <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:600 }}>{m.avatar}</div>
            <div style={{ flex:1 }}>
              <p style={{ color:C.text, fontSize:13, fontWeight:600 }}>{m.name} {m.is_team_lead && groupMode==='team' && "👑"}</p>
              <p style={{ color:C.textMuted, fontSize:11 }}>{m.role} · 🕐 {to12(m.checkin_time)} → {to12(m.end_time||"18:00")}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>📊 Aapke Assigned Accounts</h3>
      <p style={{ color:C.textMuted, fontSize:12, marginBottom:10 }}>💡 Sirf wo accounts dikh rahe hain jo Team Lead ne aapko assign kiye. Status toggle kar sakte hain.</p>
      <TikTokSheet teamId={group.id} canEdit={false} filterByUserId={user.id} userName={user.name} />

      <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginTop:28, marginBottom:10 }}>🔗 Links</h3>
      <TeamLinks teamId={group.id} canEdit={false} />

      <div style={{ marginTop:28, background:C.warningLight, border:`1px solid ${C.warning}`, borderRadius:10, padding:"12px 16px", fontSize:12, color:C.warning }}>
        🔒 <strong>Gmail + Login Password</strong> vault sirf Team Lead aur Super Admin dekh sakte hain. Zaroorat ho to un se contact karein.
      </div>
    </div>
  )
}
