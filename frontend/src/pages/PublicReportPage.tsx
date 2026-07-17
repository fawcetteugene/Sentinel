import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { HazardType, PublicIncidentReport } from '@/types'

const incidentTypes: { value: HazardType; label: string }[] = [
  { value: 'flood', label: 'Flood' },
  { value: 'river_overflow', label: 'River overflow' },
  { value: 'road_accident', label: 'Road accident' },
  { value: 'medical', label: 'Medical emergency' },
  { value: 'missing_child', label: 'Missing child' },
  { value: 'missing_elderly', label: 'Missing elderly person' },
  { value: 'snake_bite', label: 'Snake bite' },
  { value: 'landslide', label: 'Landslide' },
  { value: 'boat_accident', label: 'Boat accident' },
  { value: 'water_shortage', label: 'Water shortage' },
  { value: 'disease_outbreak', label: 'Disease outbreak' },
  { value: 'tree_blocking_road', label: 'Tree blocking road' },
  { value: 'electric_pole_down', label: 'Electric pole down' },
  { value: 'other', label: 'Other' },
]

export function PublicReportPage() {
  const [form, setForm] = useState<PublicIncidentReport>({
    what_happened: '',
    where: '',
    need_help_immediately: true,
    share_gps: false,
    incident_type: 'other',
    photo_urls: [],
    voice_note_urls: [],
  })
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function addPhoto(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    const dataUrl = await toDataUrl(file)
    setForm((current) => ({ ...current, photo_urls: [...current.photo_urls, dataUrl] }))
  }

  async function addVoice(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    const dataUrl = await toDataUrl(file)
    setForm((current) => ({ ...current, voice_note_urls: [...current.voice_note_urls, dataUrl] }))
  }

  async function useGpsLocation() {
    if (!navigator.geolocation) {
      setMessage('GPS is not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          share_gps: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }))
        setMessage('GPS location captured.')
      },
      () => setMessage('Could not capture GPS location. Please enter the nearest landmark.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await api.publicIncidentReport({
        ...form,
        what_happened: form.what_happened.trim(),
        where: form.where.trim(),
      })
      setMessage('Report sent. Nearby volunteers and leaders can now see it.')
      setForm({
        what_happened: '',
        where: '',
        need_help_immediately: true,
        share_gps: false,
        incident_type: 'other',
        photo_urls: [],
        voice_note_urls: [],
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_32%),linear-gradient(180deg,#f8fafc,#edf7f0_55%,#f8fafc)] px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-glow">
          <div className="text-xs uppercase tracking-[0.35em] text-emerald-700/80">Public emergency reporting</div>
          <h1 className="mt-2 text-4xl font-semibold text-slate-950">Report an emergency in under 30 seconds</h1>
          <p className="mt-3 text-sm text-slate-600">
            Large buttons, simple language, and no login required. Use this for floods, missing people, accidents, snake bites, and other urgent situations.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">What happened?</span>
              <textarea
                rows={4}
                value={form.what_happened}
                onChange={(e) => setForm((current) => ({ ...current, what_happened: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Example: The river has overflowed and two homes are flooded."
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Where?</span>
              <input
                value={form.where}
                onChange={(e) => setForm((current) => ({ ...current, where: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Village, market, school, road, or landmark"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Type of incident</span>
                <select
                  value={form.incident_type}
                  onChange={(e) => setForm((current) => ({ ...current, incident_type: e.target.value as HazardType }))}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                >
                  {incidentTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Need help immediately?</span>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, need_help_immediately: !current.need_help_immediately }))}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                    form.need_help_immediately ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {form.need_help_immediately ? 'Yes, urgent help needed' : 'Not urgent yet'}
                </button>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Photo upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void addPhoto(event.target.files)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                />
                <span className="text-xs text-slate-500">Max 5MB per file. Uploads are stored as demo attachments.</span>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Voice note</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => void addVoice(event.target.files)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                />
                <span className="text-xs text-slate-500">Use short voice notes when typing is difficult.</span>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Reporter name</span>
                <input
                  value={form.reporter_name ?? ''}
                  onChange={(e) => setForm((current) => ({ ...current, reporter_name: e.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Optional"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Reporter phone</span>
                <input
                  value={form.reporter_phone ?? ''}
                  onChange={(e) => setForm((current) => ({ ...current, reporter_phone: e.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, share_gps: !current.share_gps }))}
                className={`rounded-2xl px-4 py-4 text-sm font-semibold ${form.share_gps ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {form.share_gps ? 'GPS sharing on' : 'Share GPS location'}
              </button>
              <button
                type="button"
                onClick={() => void useGpsLocation()}
                className="rounded-2xl bg-slate-100 px-4 py-4 text-sm font-semibold text-slate-700"
              >
                Capture my GPS
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send report'}
              </button>
            </div>
            {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-700/80">Quick actions</div>
            <div className="mt-4 grid gap-3">
              <QuickAction label="Emergency button" tone="bg-red-600 text-white" />
              <QuickAction label="Nearest shelter" />
              <QuickAction label="Nearest clinic" />
              <QuickAction label="Nearest safe route" />
              <QuickAction label="Upload photo" />
              <QuickAction label="Record voice note" />
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-700/80">Need access?</div>
            <p className="mt-3 text-sm text-slate-600">
              Community volunteers and leaders can log in with a phone number, username, or PIN.
            </p>
            <Link to="/login" className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              Open login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ label, tone = 'bg-slate-100 text-slate-700' }: { label: string; tone?: string }) {
  return <button className={`rounded-2xl px-4 py-4 text-left text-sm font-semibold ${tone}`}>{label}</button>
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}
