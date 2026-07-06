import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#1e293b', borderRadius: 12, padding: 40, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#f8fafc' },
  sub: { color: '#94a3b8', marginBottom: 28, fontSize: 14 },
  label: { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 500 },
  input: { width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 15, outline: 'none', marginBottom: 18 },
  btn: { width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  err: { color: '#f87171', fontSize: 13, marginBottom: 16 },
  link: { color: '#818cf8', textDecoration: 'none' },
  foot: { marginTop: 20, textAlign: 'center', fontSize: 14, color: '#64748b' },
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('token', data.access_token)
      nav('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.wrap}>
      <form style={s.card} onSubmit={submit}>
        <h1 style={s.h1}>Welcome back</h1>
        <p style={s.sub}>Sign in to your URL Shortener account</p>
        {error && <div style={s.err}>{error}</div>}
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <button style={s.btn} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <div style={s.foot}>No account? <Link to="/register" style={s.link}>Register</Link></div>
      </form>
    </div>
  )
}
