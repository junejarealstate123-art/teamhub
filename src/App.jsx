import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const today = () => new Date().toISOString().split("T")[0]
const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` }
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
    const userData = {
      id: data.id, name: data.name, email: data.email, role: data.role,
      checkinTime: data.checkin_time,
      avatar: data.avatar || data.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      isAdmin: data.is_admin, isTeamLead: data.is_team_lead,
      teamId: data.team_id, cgpId: data.cgp_id
    }
    localStorage.setItem("teamhub-user", JSON.stringify(userData))
    setUser(userData)
  }

  const onLogout = () => { localStorage.removeItem("teamhub-user"); setUser(null) }

  if (loading) return <Loader />
  if (!user) return <LoginScreen form={loginForm} setForm={setLoginForm} onLogin={handleLogin} error={loginError} />
  if (user.isAdmin) return <AdminDashboard user={user} onLogout={onLogout} />
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
function TikTokSheet({ teamId, canEdit }) {
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ account_name:"", niche:"", tiktok_link:"", video_source:"", competitor_link:"", category:"" })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const td = today()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data:accs }, { data:cats }] = await Promise.all([
      supabase.from('tiktok_accounts').select('*').eq('team_id', teamId).order('created_at'),
      supabase.from('account_categories').select('*').order('created_at'),
    ])
    setAccounts(accs || [])
    setCategories(cats || [])
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
    setForm({ account_name:"", niche:"", tiktok_link:"", video_source:"", competitor_link:"", category:"" })
    setAdding(false)
    load()
  }

  const saveEdit = async () => {
    if (!editForm.account_name.trim()) return alert("Name zaroori hai!")
    await supabase.from('tiktok_accounts').update(editForm).eq('id', editId)
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
        <div style={{ marginBottom:14 }}>
          <button onClick={()=>setAdding(!adding)} style={{ background:C.primary, border:"none", color:"#fff", padding:"8px 18px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
            {adding ? "Cancel" : "+ Add Account"}
          </button>
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
          </div>
          <button onClick={addAccount} style={{ background:C.success, border:"none", color:"#fff", padding:"8px 20px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:600 }}>Save Account</button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div style={{ textAlign:"center", padding:30, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:10 }}>
          <p style={{ color:C.textMuted, fontSize:14 }}>Koi TikTok account nahi hai abhi.</p>
        </div>
      ) : (
        <div style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderRadius:10 }}>
          <table style={{ borderCollapse:"collapse", width:"100%", fontSize:13, minWidth:1000 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>#</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Account</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Category</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Niche</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>TikTok</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Source</th>
                <th style={{ padding:"10px 12px", textAlign:"left", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Competitor</th>
                <th style={{ padding:"10px 12px", textAlign:"center", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Status</th>
                {canEdit && <th style={{ padding:"10px 12px", textAlign:"center", color:C.textMuted, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, idx) => editId === acc.id ? (
                <tr key={acc.id} style={{ borderBottom:`1px solid ${C.border}`, background:C.primaryLight }}>
                  <td style={{ padding:"8px 12px" }}>{idx+1}</td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.account_name} onChange={e=>setEditForm(f=>({...f,account_name:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}>{catSelect(editForm.category, (v)=>setEditForm(f=>({...f,category:v})))}</td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.niche} onChange={e=>setEditForm(f=>({...f,niche:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.tiktok_link} onChange={e=>setEditForm(f=>({...f,tiktok_link:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.video_source} onChange={e=>setEditForm(f=>({...f,video_source:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"6px 8px" }}><input value={editForm.competitor_link||""} onChange={e=>setEditForm(f=>({...f,competitor_link:e.target.value}))} style={{ width:"100%", border:`1px solid ${C.primary}`, borderRadius:4, padding:"6px 8px", fontSize:13, boxSizing:"border-box" }} /></td>
                  <td style={{ padding:"8px", textAlign:"center", color:C.textMuted }}>—</td>
                  <td style={{ padding:"8px", textAlign:"center" }}>
                    <button onClick={saveEdit} style={{ background:C.success, border:"none", color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer", marginRight:4 }}>Save</button>
                    <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={acc.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 12px", color:C.textMuted }}>{idx+1}</td>
                  <td style={{ padding:"10px 12px", color:C.text, fontWeight:500 }}>{acc.account_name}</td>
                  <td style={{ padding:"10px 12px" }}>
                    {acc.category ? <span style={{ background:catColor(acc.category)+"22", color:catColor(acc.category), fontSize:11, padding:"3px 10px", borderRadius:12, fontWeight:600 }}>{acc.category}</span> : "—"}
                  </td>
                  <td style={{ padding:"10px 12px" }}>{acc.niche || "—"}</td>
                  <td style={{ padding:"10px 12px" }}>{acc.tiktok_link ? <a href={acc.tiktok_link} target="_blank" rel="noopener noreferrer" style={{ color:C.primary, fontSize:12 }}>Open →</a> : "—"}</td>
                  <td style={{ padding:"10px 12px" }}>{acc.video_source || "—"}</td>
                  <td style={{ padding:"10px 12px" }}>{acc.competitor_link ? <a href={acc.competitor_link} target="_blank" rel="noopener noreferrer" style={{ color:C.warning, fontSize:12 }}>🎯 Open</a> : "—"}</td>
                  <td style={{ padding:"8px", textAlign:"center" }}>
                    <button onClick={()=>toggleStatus(acc)} style={{ background:isDone(acc)?C.successLight:C.dangerLight, color:isDone(acc)?C.success:C.danger, border:"none", borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      {isDone(acc) ? "✓ Done" : "Not Yet"}
                    </button>
                  </td>
                  {canEdit && (
                    <td style={{ padding:"8px", textAlign:"center" }}>
                      <button onClick={()=>{setEditId(acc.id); setEditForm({account_name:acc.account_name, niche:acc.niche||"", tiktok_link:acc.tiktok_link||"", video_source:acc.video_source||"", competitor_link:acc.competitor_link||"", category:acc.category||""})}} style={{ background:C.primaryLight, border:"none", color:C.primary, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer", marginRight:4, fontWeight:600 }}>Edit</button>
                      <button onClick={()=>deleteAccount(acc.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.danger, fontSize:11, padding:"4px 10px", borderRadius:4, cursor:"pointer" }}>✕</button>
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

// ============ SHARED: Group Members Management (Team or CGP) ============
function GroupMembersManage({ groupId, groupMode, allMembers, refresh, canManage }) {
  // groupMode: 'team' or 'cgp'
  const idField = groupMode === 'cgp' ? 'cgp_id' : 'team_id'
  const [addMode, setAddMode] = useState(null)
  const [existingSelect, setExistingSelect] = useState("")
  const [newForm, setNewForm] = useState({ name:"", email:"", password:"", role:"", checkin_time:"09:00" })
  const [credShow, setCredShow] = useState(null)

  const groupMembers = allMembers.filter(m => m[idField] === groupId)
  // Available: not in THIS group already, and not admin
  const availableMembers = allMembers.filter(m => m[idField] !== groupId && !m.is_admin)

  const addExisting = async () => {
    if (!existingSelect) return alert("Member select karein!")
    await supabase.from('members').update({ [idField]:groupId }).eq('id', existingSelect)
    setExistingSelect(""); setAddMode(null)
    refresh()
  }

  const createNew = async () => {
    if (!newForm.name || !newForm.email || !newForm.role) return alert("Name, email, role zaroori!")
    const password = newForm.password || genPassword()
    const id = "m"+Date.now()
    const avatar = newForm.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    const insertData = {
      id, name:newForm.name, email:newForm.email.toLowerCase(), password,
      role:newForm.role, checkin_time:newForm.checkin_time, avatar,
      is_admin:false, is_team_lead:false,
      [idField]: groupId
    }
    const { error } = await supabase.from('members').insert(insertData)
    if (error) return alert("Error: " + error.message)
    await supabase.from('member_stats').insert({ member_id:id, late_count:0, strikes:0 })
    setCredShow({ email:newForm.email, password, name:newForm.name })
    setNewForm({ name:"", email:"", password:"", role:"", checkin_time:"09:00" })
    setAddMode(null)
    refresh()
  }

  const removeFromGroup = async (memberId) => {
    if (!confirm(`${groupMode === 'cgp' ? 'CGP' : 'Team'} se remove karein?`)) return
    const updateData = { [idField]:null }
    // Only unset team_lead if removing from team
    if (groupMode === 'team') updateData.is_team_lead = false
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
              <p style={{ color:C.textMuted, fontSize:11, marginBottom:8 }}>💡 Member ki mojooda team change nahi hogi — sirf {groupMode==='cgp'?'CGP':'team'} assign hogi.</p>
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <input value={newForm.name} onChange={e=>setNewForm(f=>({...f,name:e.target.value}))} placeholder="Full Name *" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <input value={newForm.email} onChange={e=>setNewForm(f=>({...f,email:e.target.value}))} placeholder="Email *" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <input value={newForm.password} onChange={e=>setNewForm(f=>({...f,password:e.target.value}))} placeholder="Password (optional)" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
            <input value={newForm.role} onChange={e=>setNewForm(f=>({...f,role:e.target.value}))} placeholder="Role *" style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
          </div>
          <input type="time" value={newForm.checkin_time} onChange={e=>setNewForm(f=>({...f,checkin_time:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, marginBottom:10 }} />
          <br/>
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
              <p style={{ color:C.textMuted, fontSize:11 }}>{m.role} · {m.email}</p>
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
  const idField = groupType === 'cgp' ? 'cgp_id' : 'team_id'

  const addTeam = async () => {
    if (!form.name.trim()) return alert("Name zaroori hai!")
    const id = "team"+Date.now()
    await supabase.from('teams').insert({ id, name:form.name, description:form.description, team_lead_id:form.team_lead_id||null, group_type:groupType })
    if (form.team_lead_id) {
      const updateData = { [idField]:id }
      if (groupType === 'team') updateData.is_team_lead = true
      await supabase.from('members').update(updateData).eq('id', form.team_lead_id)
    }
    setForm({ name:"", description:"", team_lead_id:"" })
    setAdding(false)
    refresh()
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return alert("Name zaroori!")
    const oldTeam = data.teams.find(t=>t.id===editId)
    if (oldTeam?.team_lead_id && oldTeam.team_lead_id !== editForm.team_lead_id && groupType === 'team') {
      await supabase.from('members').update({ is_team_lead:false }).eq('id', oldTeam.team_lead_id)
    }
    await supabase.from('teams').update({ name:editForm.name, description:editForm.description, team_lead_id:editForm.team_lead_id||null }).eq('id', editId)
    if (editForm.team_lead_id) {
      const updateData = { [idField]:editId }
      if (groupType === 'team') updateData.is_team_lead = true
      await supabase.from('members').update(updateData).eq('id', editForm.team_lead_id)
    }
    setEditId(null); setEditForm(null)
    refresh()
  }

  const deleteTeam = async (id) => {
    if (!confirm(`${sectionLabel} delete karein?`)) return
    const updateData = { [idField]:null }
    if (groupType === 'team') updateData.is_team_lead = false
    await supabase.from('members').update(updateData).eq(idField, id)
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
        <TikTokSheet teamId={selectedTeam} canEdit={true} />

        <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginTop:28, marginBottom:12 }}>🔗 Links</h3>
        <TeamLinks teamId={selectedTeam} canEdit={true} />
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
              <p style={{ color:C.textMuted, fontSize:12 }}>{t.description || "No description"} · 👤 {data.members.filter(m=>m[idField]===t.id).length} · 📊 {data.accounts.filter(a=>a.team_id===t.id).length}</p>
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
            <p style={{ color:C.textMuted, fontSize:12, marginBottom:8, fontWeight:500 }}>{c.label}</p>
            <p style={{ color:c.color, fontSize:30, fontWeight:700 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {[["Teams Breakdown", teamGroups, 'team_id'], ["CGP Breakdown", cgpGroups, 'cgp_id']].map(([label, groups, idField]) => groups.length > 0 && (
        <div key={label}>
          <h3 style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:14, textTransform:"uppercase" }}>{label}</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
            {groups.map(t => {
              const tm = data.members.filter(m => m[idField] === t.id)
              const ta = data.accounts.filter(a => a.team_id === t.id)
              const done = ta.filter(a => a.status === 'done' && a.status_date === td).length
              const lead = data.members.find(m => m.id === t.team_lead_id)
              return (
                <div key={t.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:getColor(t.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff" }}>{t.group_type==='cgp'?"🚀":"👥"}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>{t.name}</p>
                    <p style={{ color:C.textMuted, fontSize:12 }}>👑 {lead?.name || "No Lead"} · 👤 {tm.length} · 📊 {ta.length} ({done} done today)</p>
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
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"", checkin_time:"09:00", team_id:"", cgp_id:"" })
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
    const { error } = await supabase.from('members').insert({ id, name:form.name, email:form.email.toLowerCase(), password, role:form.role, checkin_time:form.checkin_time, avatar, is_admin:false, is_team_lead:false, team_id:form.team_id||null, cgp_id:form.cgp_id||null })
    if (error) return alert("Error: " + error.message)
    await supabase.from('member_stats').insert({ member_id:id, late_count:0, strikes:0 })
    setCredShow({ email:form.email, password, name:form.name })
    setForm({ name:"", email:"", password:"", role:"", checkin_time:"09:00", team_id:"", cgp_id:"" })
    setAdding(false)
    refresh()
  }

  const saveEdit = async () => {
    if (!editForm.name||!editForm.email||!editForm.role) return alert("Sab zaroori!")
    const avatar = editForm.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    await supabase.from('members').update({ name:editForm.name, email:editForm.email.toLowerCase(), password:editForm.password, role:editForm.role, checkin_time:editForm.checkin_time, avatar, team_id:editForm.team_id||null, cgp_id:editForm.cgp_id||null }).eq('id', editId)
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full Name" style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }} />
            <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email" style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }} />
            <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Password (optional)" style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }} />
            <input value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Role" style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }} />
            <input type="time" value={form.checkin_time} onChange={e=>setForm(f=>({...f,checkin_time:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }} />
            <div /> {/* spacer */}
            <select value={form.team_id} onChange={e=>setForm(f=>({...f,team_id:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">-- No Team --</option>
              {teamGroups.map(t => <option key={t.id} value={t.id}>👥 {t.name}</option>)}
            </select>
            <select value={form.cgp_id} onChange={e=>setForm(f=>({...f,cgp_id:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" }}>
              <option value="">-- No CGP --</option>
              {cgpGroups.map(t => <option key={t.id} value={t.id}>🚀 {t.name}</option>)}
            </select>
          </div>
          <button onClick={addMember} style={{ background:C.primary, border:"none", color:"#fff", padding:"10px 24px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>Save Member</button>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.members.map(m => editId === m.id ? (
          <div key={m.id} style={{ background:C.surface, border:`2px solid ${C.primary}`, borderRadius:12, padding:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
              <input value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
              <input value={editForm.password} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
              <input value={editForm.role} onChange={e=>setEditForm(f=>({...f,role:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
              <input type="time" value={editForm.checkin_time} onChange={e=>setEditForm(f=>({...f,checkin_time:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }} />
              <div />
              <select value={editForm.team_id} onChange={e=>setEditForm(f=>({...f,team_id:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
                <option value="">-- No Team --</option>
                {teamGroups.map(t => <option key={t.id} value={t.id}>👥 {t.name}</option>)}
              </select>
              <select value={editForm.cgp_id} onChange={e=>setEditForm(f=>({...f,cgp_id:e.target.value}))} style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", fontSize:13, boxSizing:"border-box" }}>
                <option value="">-- No CGP --</option>
                {cgpGroups.map(t => <option key={t.id} value={t.id}>🚀 {t.name}</option>)}
              </select>
            </div>
            <button onClick={saveEdit} style={{ background:C.primary, border:"none", color:"#fff", padding:"8px 18px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:600, marginRight:8 }}>Save</button>
            <button onClick={()=>{setEditId(null);setEditForm(null)}} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 18px", borderRadius:6, fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        ) : (
          <div key={m.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:getColor(m.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", fontWeight:600 }}>{m.avatar}</div>
            <div style={{ flex:1 }}>
              <p style={{ color:C.text, fontWeight:600, fontSize:14 }}>{m.name} {m.is_team_lead && <span style={{background:C.warningLight, color:C.warning, fontSize:10, padding:"2px 6px", borderRadius:4, marginLeft:4}}>👑 LEAD</span>}</p>
              <p style={{ color:C.textMuted, fontSize:12 }}>
                {m.email} · {m.role} · 🕐 {m.checkin_time}
                {m.team_id && ` · 👥 ${data.teams.find(t=>t.id===m.team_id)?.name || "Team"}`}
                {m.cgp_id && ` · 🚀 ${data.teams.find(t=>t.id===m.cgp_id)?.name || "CGP"}`}
                {!m.team_id && !m.cgp_id && " · ❌ No group"}
              </p>
            </div>
            <button onClick={()=>{setEditId(m.id); setEditForm({name:m.name, email:m.email, password:m.password, role:m.role, checkin_time:m.checkin_time, team_id:m.team_id||"", cgp_id:m.cgp_id||""})}} style={{ background:C.primaryLight, border:"none", color:C.primary, fontSize:12, padding:"7px 14px", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Edit</button>
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
                <p style={{ color:C.textMuted, fontSize:12 }}>Fixed: {m.checkin_time} · Lates: {lc} · Strikes: {s}</p>
              </div>
              {a ? <span style={{ background:a.status==="ontime"?C.successLight:C.warningLight, color:a.status==="ontime"?C.success:C.warning, fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>{a.status==="ontime"?"✓ "+a.checkIn:"⚠ "+a.checkIn}</span>
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

  // Primary group = whichever they belong to (team preferred)
  const primary = team || cgp
  const primaryMode = team ? 'team' : 'cgp'

  const tabs = [
    { id:"home", label:"Home", icon:"🏠" },
  ]
  if (team) {
    tabs.push({ id:"team", label:"My Team", icon:"👥" })
    tabs.push({ id:"team_accounts", label:"Team Accounts", icon:"📊" })
    tabs.push({ id:"team_links", label:"Team Links", icon:"🔗" })
  }
  if (cgp) {
    tabs.push({ id:"cgp", label:"My CGP", icon:"🚀" })
    tabs.push({ id:"cgp_accounts", label:"CGP Accounts", icon:"📊" })
    tabs.push({ id:"cgp_links", label:"CGP Links", icon:"🔗" })
  }
  tabs.push({ id:"niche", label:"Niche Ideas", icon:"💡" })
  tabs.push({ id:"voiceover", label:"Voiceover Ideas", icon:"🎙️" })
  tabs.push({ id:"checkin", label:"Attendance", icon:"🕐" })
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
          <div>
            <h2 style={{ color:C.text, fontSize:22, fontWeight:700, marginBottom:4 }}>👑 Welcome, {user.name.split(" ")[0]}!</h2>
            <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>{today()}</p>
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
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
                <p style={{ color:C.textMuted, fontSize:12 }}>My Attendance</p>
                <p style={{ color:C.success, fontSize:16, fontWeight:700 }}>{myData.attendance[today()] ? "✓ Present" : "✗ Not yet"}</p>
              </div>
            </div>
          </div>
        )}
        {tab==="team" && team && <GroupMembersManage groupId={team.id} groupMode="team" allMembers={members} refresh={refresh} canManage={true} />}
        {tab==="team_accounts" && team && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>📊 Team TikTok Accounts</h2><TikTokSheet teamId={team.id} canEdit={true} /></div>}
        {tab==="team_links" && team && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🔗 Team Links</h2><TeamLinks teamId={team.id} canEdit={true} /></div>}
        {tab==="cgp" && cgp && <GroupMembersManage groupId={cgp.id} groupMode="cgp" allMembers={members} refresh={refresh} canManage={true} />}
        {tab==="cgp_accounts" && cgp && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>📊 CGP TikTok Accounts</h2><TikTokSheet teamId={cgp.id} canEdit={true} /></div>}
        {tab==="cgp_links" && cgp && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🔗 CGP Links</h2><TeamLinks teamId={cgp.id} canEdit={true} /></div>}
        {tab==="niche" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>💡 Niche Ideas</h2><IdeasBoard user={user} table="niche_ideas" title="Niche Ideas Board" emoji="💡" /></div>}
        {tab==="voiceover" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🎙️ Voiceover Ideas</h2><IdeasBoard user={user} table="voiceover_ideas" title="Voiceover Ideas Board" emoji="🎙️" /></div>}
        {tab==="checkin" && <MemberCheckin data={myData} user={user} refresh={refresh} />}
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
    const [{ data:tasks }, { data:att }, { data:reps }, { data:stats }, { data:rc }, teamRes, tmRes, cgpRes, cgpMemRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at'),
      supabase.from('attendance').select('*').eq('member_id', user.id),
      supabase.from('reports').select('*').eq('member_id', user.id),
      supabase.from('member_stats').select('*').eq('member_id', user.id).maybeSingle(),
      supabase.from('report_comments').select('*').eq('report_member_id', user.id).order('created_at'),
      user.teamId ? supabase.from('teams').select('*').eq('id', user.teamId).maybeSingle() : Promise.resolve({data:null}),
      user.teamId ? supabase.from('members').select('*').eq('team_id', user.teamId) : Promise.resolve({data:[]}),
      user.cgpId ? supabase.from('teams').select('*').eq('id', user.cgpId).maybeSingle() : Promise.resolve({data:null}),
      user.cgpId ? supabase.from('members').select('*').eq('cgp_id', user.cgpId) : Promise.resolve({data:[]}),
    ])
    const attMap = {}; (att||[]).forEach(a=>{ attMap[a.date]={checkIn:a.check_in,checkOut:a.check_out,status:a.status} })
    const repMap = {}; (reps||[]).forEach(r=>{ repMap[r.date]={tasksCompleted:r.tasks_completed,hoursWorked:r.hours_worked,blockers:r.blockers,notes:r.notes} })
    const rcMap = {}; (rc||[]).forEach(c=>{ if(!rcMap[c.report_date]) rcMap[c.report_date]=[]; rcMap[c.report_date].push({author:c.author, text:c.text}) })
    setData({ tasks:tasks||[], attendance:attMap, reports:repMap, stats:stats?{lateCount:stats.late_count, strikes:stats.strikes}:{lateCount:0,strikes:0}, reportComments:rcMap, team:teamRes.data, teamMembers:tmRes.data||[], cgp:cgpRes.data, cgpMembers:cgpMemRes.data||[] })
    setLoading(false)
  }, [user.id, user.teamId, user.cgpId])

  useEffect(() => { refresh() }, [refresh])

  if (loading) return <Loader />

  const tabs = [
    { id:"home", label:"Home", icon:"🏠" },
    { id:"checkin", label:"Attendance", icon:"🕐" },
    { id:"tasks", label:"My Tasks", icon:"✅" },
    { id:"report", label:"Daily Report", icon:"📋" },
  ]
  if (user.teamId) tabs.push({ id:"team", label:"My Team", icon:"👥" })
  if (user.cgpId) tabs.push({ id:"cgp", label:"My CGP", icon:"🚀" })
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
              {data.cgp && ` · 🚀 ${data.cgp.name}`}
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
        {tab==="home" && <MemberHome data={data} user={user} />}
        {tab==="checkin" && <MemberCheckin data={data} user={user} refresh={refresh} />}
        {tab==="tasks" && <MemberTasks data={data} refresh={refresh} />}
        {tab==="report" && <MemberReport data={data} user={user} refresh={refresh} />}
        {tab==="team" && <MemberGroupView group={data.team} groupMembers={data.teamMembers} groupMode="team" />}
        {tab==="cgp" && <MemberGroupView group={data.cgp} groupMembers={data.cgpMembers} groupMode="cgp" />}
        {tab==="niche" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>💡 Niche Ideas</h2><IdeasBoard user={user} table="niche_ideas" title="Niche Ideas Board" emoji="💡" /></div>}
        {tab==="voiceover" && <div><h2 style={{ color:C.text, fontSize:20, fontWeight:700, marginBottom:16 }}>🎙️ Voiceover Ideas</h2><IdeasBoard user={user} table="voiceover_ideas" title="Voiceover Ideas Board" emoji="🎙️" /></div>}
      </div>
    </div>
  )
}

function MemberHome({ data, user }) {
  const td = today()
  const att = data.attendance[td]
  const pending = data.tasks.filter(t=>t.status==="pending").length
  const done = data.tasks.filter(t=>t.status==="done").length
  const reportDone = !!data.reports[td]
  return (
    <div>
      <h2 style={{ color:C.text, fontSize:22, fontWeight:700 }}>Assalam u Alaikum, {user.name.split(" ")[0]}! 👋</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>{td}</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12 }}>Attendance</p>
          {att ? <p style={{ color:att.status==="ontime"?C.success:C.warning, fontSize:20, fontWeight:700 }}>{att.status==="ontime"?"✓ On Time":"⚠ Late"}</p>
               : <p style={{ color:C.danger, fontSize:18, fontWeight:700 }}>Not checked in</p>}
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12 }}>Tasks</p>
          <p style={{ color:C.warning, fontSize:20, fontWeight:700 }}>{pending} pending</p>
          <p style={{ color:C.textMuted, fontSize:11 }}>{done} done</p>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <p style={{ color:C.textMuted, fontSize:12 }}>Daily Report</p>
          <p style={{ color:reportDone?C.success:C.danger, fontSize:18, fontWeight:700 }}>{reportDone?"✓ Submitted":"Pending"}</p>
        </div>
        {data.team && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
            <p style={{ color:C.textMuted, fontSize:12 }}>👥 My Team</p>
            <p style={{ color:C.purple, fontSize:16, fontWeight:700 }}>{data.team.name}</p>
          </div>
        )}
        {data.cgp && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
            <p style={{ color:C.textMuted, fontSize:12 }}>🚀 My CGP</p>
            <p style={{ color:C.orange, fontSize:16, fontWeight:700 }}>{data.cgp.name}</p>
          </div>
        )}
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
      <h2 style={{ color:C.text, fontSize:20, fontWeight:700 }}>Attendance</h2>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, textAlign:"center", margin:"20px 0" }}>
        <p style={{ color:C.textMuted, fontSize:13 }}>Current time</p>
        <p style={{ color:C.text, fontSize:44, fontWeight:700 }}>{now}</p>
        <p style={{ color:C.textMuted, fontSize:13 }}>Your check-in: <strong style={{ color:C.primary }}>{user.checkinTime}</strong></p>
      </div>
      {!att?.checkIn ? (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24, textAlign:"center" }}>
          {windowOpen && (
            <div>
              {nowMin>fixedMin && <input value={lateReason} onChange={e=>setLateReason(e.target.value)} placeholder="Late reason..." style={{ marginBottom:10, width:"100%", maxWidth:300, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:13, boxSizing:"border-box" }} />}
              <br/>
              <button onClick={doCheckin} style={{ background:nowMin>fixedMin?C.warning:C.success, border:"none", color:"#fff", padding:"14px 40px", borderRadius:10, fontSize:16, fontWeight:600, cursor:"pointer" }}>{nowMin>fixedMin?"⚠ Late Check In":"✓ Check In"}</button>
            </div>
          )}
          {!windowOpen && !windowPast && <p style={{ color:C.textMuted, fontSize:14 }}>Window opens in {fixedMin - nowMin} min</p>}
          {windowPast && (
            <div>
              <input value={lateReason} onChange={e=>setLateReason(e.target.value)} placeholder="Reason..." style={{ width:"100%", maxWidth:300, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:10, boxSizing:"border-box" }} />
              <br/>
              <button onClick={doCheckin} style={{ background:C.warning, border:"none", color:"#fff", padding:"12px 32px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>⚠ Late Check-in</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24, display:"flex", gap:16 }}>
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

function MemberGroupView({ group, groupMembers, groupMode }) {
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
              <p style={{ color:C.textMuted, fontSize:11 }}>{m.role}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>📊 TikTok Accounts</h3>
      <p style={{ color:C.textMuted, fontSize:12, marginBottom:10 }}>💡 Aap sirf Status toggle kar sakte hain.</p>
      <TikTokSheet teamId={group.id} canEdit={false} />

      <h3 style={{ color:C.text, fontSize:15, fontWeight:600, marginTop:28, marginBottom:10 }}>🔗 Links</h3>
      <TeamLinks teamId={group.id} canEdit={false} />
    </div>
  )
}
