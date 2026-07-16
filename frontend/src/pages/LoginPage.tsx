import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('dispatcher@sentinel.ai')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.15),_transparent_30%),linear-gradient(180deg,#020617,#0f172a_55%,#020617)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-[0.45em] text-calm/80">Sentinel AI</div>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
            AI incident command for real-time disaster response.
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Coordinate responders, triage incidents, allocate resources, and generate live operational briefings from a single command surface.
          </p>
          <div className="grid max-w-2xl gap-3 text-sm text-slate-400 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Dark command-center UI built for live operations.</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Role-based access with dispatcher and commander workflows.</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">WebSocket live feed for incident and resource updates.</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">OpenAI-backed AI Incident Commander with structured outputs.</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow backdrop-blur">
          <div className="text-sm uppercase tracking-[0.35em] text-calm/80">Secure Login</div>
          <h2 className="mt-3 text-3xl font-semibold">Command Center Access</h2>
          <p className="mt-2 text-sm text-slate-400">Use the seeded emergency operations accounts or your own JWT-backed user.</p>
          <div className="mt-6 space-y-4">
            <label className="grid gap-2">
              <span className="text-sm text-slate-400">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-calm/60" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-slate-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-calm/60"
              />
            </label>
          </div>
          {error ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
          <button
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-calm px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Enter Sentinel AI'}
          </button>
          <div className="mt-4 text-xs text-slate-500">
            Demo accounts: dispatcher@sentinel.ai / admin123, commander@sentinel.ai / admin123, admin@sentinel.ai / admin123
          </div>
        </form>
      </div>
    </div>
  )
}
