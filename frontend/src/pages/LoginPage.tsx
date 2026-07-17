import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('leader@sentinel.local')
  const [secret, setSecret] = useState('2468')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function continueAsGuest() {
    navigate('/report')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(identifier, secret)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,#f8fafc,#e9f5ee_55%,#f8fafc)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-[0.45em] text-emerald-700/80">Community disaster coordination</div>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
            Simple emergency coordination for Kenyan communities.
          </h1>
          <p className="max-w-xl text-lg text-slate-700">
            Report emergencies in seconds, alert nearby volunteers, guide people to shelters and clinics, and keep the community moving before rescue teams arrive.
          </p>
          <div className="grid max-w-2xl gap-3 text-sm text-slate-400 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-slate-700">Public reporting with no account required.</div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-slate-700">Volunteer PIN login for quick access on feature phones and smartphones.</div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-slate-700">Live map, moving vehicles, shelters, clinics, and road closures.</div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-slate-700">Offline-friendly mock AI explains every recommendation.</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/report" className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Emergency report
            </a>
            <a href="/map" className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
              View live map
            </a>
            <button type="button" onClick={continueAsGuest} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Continue as guest
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-glow backdrop-blur">
          <div className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Simple access</div>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Community access</h2>
          <p className="mt-2 text-sm text-slate-600">Use a phone number, username, email, or PIN depending on your access level.</p>
          <div className="mt-6 space-y-4">
            <label className="grid gap-2">
              <span className="text-sm text-slate-600">Email, phone, or username</span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="leader@sentinel.local or +254700000001"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-slate-600">Password or PIN</span>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="2468 or county password"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <button
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Enter community dashboard'}
          </button>
          <div className="mt-4 text-xs text-slate-500">
            Demo access: leader@sentinel.local / 2468, volunteer@sentinel.local / 1357, admin@sentinel.local / county123
          </div>
          <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <div>Phone OTP: supported in the UI as a PIN-style entry for this offline build.</div>
            <div>Google OAuth: add your client config later if you want real Google sign-in.</div>
          </div>
        </form>
      </div>
    </div>
  )
}
