import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const s = {
  page: { minHeight: '100vh', background: '#0f172a' },
  nav: { background: '#1e293b', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' },
  navTitle: { fontSize: 20, fontWeight: 700, color: '#818cf8' },
  logoutBtn: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 24px' },
  card: { background: '#1e293b', borderRadius: 12, padding: 28, marginBottom: 24, border: '1px solid #334155' },
  h2: { fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#f1f5f9' },
  row: { display: 'flex', gap: 12, marginBottom: 0 },
  input: { flex: 1, padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none' },
  inputSmall: { width: 140, padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none' },
  btn: { padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnDanger: { padding: '6px 12px', background: 'transparent', color: '#f87171', border: '1px solid #f87171', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  btnSecondary: { padding: '6px 12px', background: 'transparent', color: '#818cf8', border: '1px solid #818cf8', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  urlRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #1e293b', gap: 16 },
  urlLeft: { flex: 1, overflow: 'hidden' },
  shortLink: { color: '#818cf8', fontWeight: 600, fontSize: 15, textDecoration: 'none' },
  origUrl: { color: '#64748b', fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  clicks: { color: '#22d3ee', fontWeight: 700, fontSize: 20, minWidth: 60, textAlign: 'center' },
  clickLabel: { color: '#475569', fontSize: 10, marginTop: 2, textAlign: 'center' },
  badge: { background: '#0f172a', border: '1px solid #334155', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#94a3b8' },
  expired: { color: '#f87171', fontSize: 11 },
  err: { color: '#f87171', fontSize: 13, marginTop: 12 },
  empty: { color: '#475569', textAlign: 'center', padding: '40px 0', fontSize: 15 },
  copied: { color: '#4ade80', fontSize: 12 },
}

export default function Dashboard() {
  const [url, setUrl] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [expiryDays, setExpiryDays] = useState('')
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data: urls = [], isLoading } = useQuery({
    queryKey: ['urls'],
    queryFn: () => api.get('/urls').then(r => r.data),
  })

  const shortenMutation = useMutation({
    mutationFn: payload => api.post('/shorten', payload),
    onSuccess: () => {
      qc.invalidateQueries(['urls'])
      setUrl('')
      setCustomCode('')
      setExpiryDays('')
      setError('')
    },
    onError: err => setError(err.response?.data?.detail || 'Failed to shorten URL'),
  })

  const deleteMutation = useMutation({
    mutationFn: code => api.delete(`/urls/${code}`),
    onSuccess: () => qc.invalidateQueries(['urls']),
  })

  const handleShorten = e => {
    e.preventDefault()
    setError('')
    const payload = { original_url: url }
    if (customCode) payload.custom_code = customCode
    if (expiryDays) payload.expires_in_days = parseInt(expiryDays)
    shortenMutation.mutate(payload)
  }

  const copyToClipboard = (shortUrl, code) => {
    navigator.clipboard.writeText(shortUrl)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const logout = () => {
    localStorage.removeItem('token')
    nav('/login')
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.navTitle}>⚡ LinkShort</span>
        <button style={s.logoutBtn} onClick={logout}>Sign out</button>
      </nav>

      <div style={s.main}>
        <div style={s.card}>
          <h2 style={s.h2}>Shorten a URL</h2>
          <form onSubmit={handleShorten}>
            <div style={s.row}>
              <input
                style={s.input}
                placeholder="https://very-long-url.com/with/a/long/path"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
              <input
                style={s.inputSmall}
                placeholder="Custom code"
                value={customCode}
                onChange={e => setCustomCode(e.target.value)}
              />
              <input
                style={{ ...s.inputSmall, width: 100 }}
                placeholder="Expires (days)"
                type="number"
                min="1"
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
              />
              <button style={s.btn} type="submit" disabled={shortenMutation.isLoading}>
                {shortenMutation.isLoading ? '…' : 'Shorten'}
              </button>
            </div>
            {error && <div style={s.err}>{error}</div>}
          </form>
        </div>

        <div style={s.card}>
          <h2 style={s.h2}>Your links</h2>
          {isLoading && <div style={s.empty}>Loading…</div>}
          {!isLoading && urls.length === 0 && (
            <div style={s.empty}>No links yet. Shorten your first URL above.</div>
          )}
          {urls.map(u => (
            <div key={u.id} style={s.urlRow}>
              <div style={s.urlLeft}>
                <a href={u.short_url} target="_blank" rel="noreferrer" style={s.shortLink}>
                  {u.short_url.replace('http://localhost:8001/', '')}
                </a>
                {u.expires_at && (
                  <span style={{ marginLeft: 8, ...s.expired }}>
                    exp {new Date(u.expires_at).toLocaleDateString()}
                  </span>
                )}
                <div style={s.origUrl}>{u.original_url}</div>
              </div>

              <div>
                <div style={s.clicks}>{u.click_count}</div>
                <div style={s.clickLabel}>CLICKS</div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {copiedCode === u.short_code
                  ? <span style={s.copied}>Copied!</span>
                  : <button style={s.btnSecondary} onClick={() => copyToClipboard(u.short_url, u.short_code)}>Copy</button>
                }
                <button style={s.btnSecondary} onClick={() => nav(`/analytics/${u.short_code}`)}>Analytics</button>
                <button style={s.btnDanger} onClick={() => deleteMutation.mutate(u.short_code)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
