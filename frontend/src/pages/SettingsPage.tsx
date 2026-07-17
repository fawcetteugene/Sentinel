import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/Badge'
import { clsx } from '@/components/ui'
import { UserGroupIcon, PhoneIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline'

type PanelKey = 'citizen' | 'responder' | 'admin'

type PreferenceState = {
  language: string
  area: string
  trustedContact: string
  shareLocation: boolean
  liveLocation: boolean
  responseRadius: string
  transportMode: string
  countyHotline: string
  broadcastSms: boolean
  broadcastVoice: boolean
  escalationThreshold: string
  largeText: boolean
  highContrast: boolean
}

const panelMeta: Record<PanelKey, { title: string; description: string; icon: typeof UserIcon }> = {
  citizen: {
    title: 'Citizen settings',
    description: 'Simple emergency preferences for public users and family contacts.',
    icon: UserIcon,
  },
  responder: {
    title: 'Responder settings',
    description: 'Volunteer and field responder controls for duty, location, and response reach.',
    icon: UserGroupIcon,
  },
  admin: {
    title: 'Admin settings',
    description: 'County communication preferences and escalation controls.',
    icon: ShieldCheckIcon,
  },
}

const defaultPreferences: PreferenceState = {
  language: 'English / Kiswahili',
  area: '',
  trustedContact: '',
  shareLocation: true,
  liveLocation: true,
  responseRadius: '5',
  transportMode: 'Bodaboda',
  countyHotline: '+254700000000',
  broadcastSms: true,
  broadcastVoice: false,
  escalationThreshold: 'High',
  largeText: true,
  highContrast: true,
}

function preferenceKey(userId: number) {
  return `sentinel_settings_${userId}`
}

export function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const userId = user?.id ?? null
  const canSeeAdminPanel = user?.role === 'county_admin' || user?.role === 'administrator'
  const availablePanels: PanelKey[] = canSeeAdminPanel ? ['citizen', 'responder', 'admin'] : ['citizen', 'responder']
  const [panel, setPanel] = useState<PanelKey>('citizen')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<PreferenceState>(defaultPreferences)
  const [profile, setProfile] = useState({
    full_name: user?.full_name ?? '',
    username: user?.username ?? '',
    phone_number: user?.phone_number ?? '',
    village: user?.village ?? '',
    skills: (user?.skills ?? []).join(', '),
    avatar_url: user?.avatar_url ?? '',
    is_on_duty: user?.is_on_duty ?? true,
  })

  const activeRole = useMemo(() => {
    switch (user?.role) {
      case 'community_volunteer':
      case 'community_leader':
      case 'dispatcher':
      case 'field_responder':
        return 'responder' as const
      case 'county_admin':
      case 'administrator':
        return 'admin' as const
      default:
        return 'citizen' as const
    }
  }, [user?.role])

  useEffect(() => {
    setPanel(activeRole)
  }, [activeRole])

  useEffect(() => {
    if (!availablePanels.includes(panel)) {
      setPanel(activeRole)
    }
  }, [activeRole, availablePanels, panel])

  useEffect(() => {
    setProfile({
      full_name: user?.full_name ?? '',
      username: user?.username ?? '',
      phone_number: user?.phone_number ?? '',
      village: user?.village ?? '',
      skills: (user?.skills ?? []).join(', '),
      avatar_url: user?.avatar_url ?? '',
      is_on_duty: user?.is_on_duty ?? true,
    })
  }, [user])

  useEffect(() => {
    if (!user?.id) return
    const raw = localStorage.getItem(preferenceKey(user.id))
    if (raw) {
      try {
        setPreferences({ ...defaultPreferences, ...(JSON.parse(raw) as Partial<PreferenceState>) })
      } catch {
        setPreferences(defaultPreferences)
      }
    } else {
      setPreferences(defaultPreferences)
    }
  }, [user?.id])

  if (!user) return null

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    setNotice(null)
    try {
      await updateProfile({
        full_name: profile.full_name.trim(),
        username: profile.username.trim() || null,
        phone_number: profile.phone_number.trim() || null,
        village: profile.village.trim() || null,
        skills: profile.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        avatar_url: profile.avatar_url.trim() || null,
        is_on_duty: profile.is_on_duty,
      })
      setNotice('Profile saved.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePreferencesSubmit(event: FormEvent) {
    event.preventDefault()
    setSavingPreferences(true)
    setNotice(null)
    try {
      if (!userId) return
      localStorage.setItem(preferenceKey(userId), JSON.stringify(preferences))
      setNotice('Preferences saved on this device.')
    } finally {
      setSavingPreferences(false)
    }
  }

  const PanelIcon = panelMeta[panel].icon

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader
        eyebrow="Settings"
        title={canSeeAdminPanel ? 'Citizen, responder, and admin controls' : 'Citizen and responder controls'}
        description="Profile details are saved centrally, while device preferences stay local for fast access."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-calm/80">Signed in</div>
              <div className="mt-2 text-2xl font-semibold">{user.full_name}</div>
              <div className="text-sm text-slate-400">{user.email}</div>
            </div>
            <Badge label={user.role.replaceAll('_', ' ').toUpperCase()} tone="bg-calm/15 text-calm ring-calm/30" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Village" value={user.village ?? 'Not set'} />
            <Info label="Phone" value={user.phone_number ?? 'Not set'} />
            <Info label="Username" value={user.username ?? 'Not set'} />
            <Info label="On duty" value={user.is_on_duty ? 'Yes' : 'No'} />
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30">
                <PhoneIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Shared profile</div>
                <div className="text-xs text-slate-400">These fields are visible to leaders and coordinators.</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Full name" value={profile.full_name} onChange={(value) => setProfile((prev) => ({ ...prev, full_name: value }))} />
              <InputField label="Username" value={profile.username} onChange={(value) => setProfile((prev) => ({ ...prev, username: value }))} />
              <InputField label="Phone number" value={profile.phone_number} onChange={(value) => setProfile((prev) => ({ ...prev, phone_number: value }))} />
              <InputField label="Village" value={profile.village} onChange={(value) => setProfile((prev) => ({ ...prev, village: value }))} />
              <InputField label="Avatar URL" value={profile.avatar_url} onChange={(value) => setProfile((prev) => ({ ...prev, avatar_url: value }))} />
              <InputField label="Skills" value={profile.skills} onChange={(value) => setProfile((prev) => ({ ...prev, skills: value }))} placeholder="First aid, driving, rescue" />
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-100">On duty</div>
                <div className="text-xs text-slate-400">Useful for volunteers, responders, and chiefs.</div>
              </div>
              <input
                type="checkbox"
                checked={profile.is_on_duty}
                onChange={(event) => setProfile((prev) => ({ ...prev, is_on_duty: event.target.checked }))}
                className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-emerald-500"
              />
            </label>

            <button
              disabled={savingProfile}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? 'Saving profile…' : 'Save profile'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-calm/80">Role settings</div>
                <h3 className="mt-2 text-2xl font-semibold">{panelMeta[panel].title}</h3>
                <p className="mt-2 text-sm text-slate-400">{panelMeta[panel].description}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-calm ring-1 ring-white/10">
                <PanelIcon className="h-6 w-6" />
              </div>
            </div>

            <div className={`mt-5 grid gap-2 ${availablePanels.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                {availablePanels.map((key) => {
                const isActive = key === panel
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPanel(key)}
                    className={clsx(
                      'rounded-2xl px-4 py-3 text-left transition',
                      isActive ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10',
                    )}
                  >
                    <div className="text-sm font-semibold">{panelMeta[key].title}</div>
                    <div className="mt-1 text-xs text-slate-400">{key === 'citizen' ? 'Public users and families' : key === 'responder' ? 'Volunteers and field teams' : 'County coordination'}</div>
                  </button>
                )
              })}
            </div>

            <form onSubmit={handlePreferencesSubmit} className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <InputField label="Preferred language" value={preferences.language} onChange={(value) => setPreferences((prev) => ({ ...prev, language: value }))} />
                <InputField label="Default area" value={preferences.area} onChange={(value) => setPreferences((prev) => ({ ...prev, area: value }))} />
                <InputField label="Trusted contact" value={preferences.trustedContact} onChange={(value) => setPreferences((prev) => ({ ...prev, trustedContact: value }))} />
                <InputField label="County hotline" value={preferences.countyHotline} onChange={(value) => setPreferences((prev) => ({ ...prev, countyHotline: value }))} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SwitchCard
                  label="Share location on emergencies"
                  description="Helps volunteers and leaders find you quickly."
                  checked={preferences.shareLocation}
                  onChange={(checked) => setPreferences((prev) => ({ ...prev, shareLocation: checked }))}
                />
                <SwitchCard
                  label="Large text mode"
                  description="Makes buttons and labels easier to read."
                  checked={preferences.largeText}
                  onChange={(checked) => setPreferences((prev) => ({ ...prev, largeText: checked }))}
                />
                <SwitchCard
                  label="High contrast"
                  description="Better visibility under bright light."
                  checked={preferences.highContrast}
                  onChange={(checked) => setPreferences((prev) => ({ ...prev, highContrast: checked }))}
                />
                <SwitchCard
                  label="Broadcast SMS alerts"
                  description="Receive alerts as text messages."
                  checked={preferences.broadcastSms}
                  onChange={(checked) => setPreferences((prev) => ({ ...prev, broadcastSms: checked }))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InputField label="Response radius (km)" value={preferences.responseRadius} onChange={(value) => setPreferences((prev) => ({ ...prev, responseRadius: value }))} />
                <InputField label="Transport mode" value={preferences.transportMode} onChange={(value) => setPreferences((prev) => ({ ...prev, transportMode: value }))} />
                <InputField label="Escalation threshold" value={preferences.escalationThreshold} onChange={(value) => setPreferences((prev) => ({ ...prev, escalationThreshold: value }))} />
                <SwitchCard
                  label="Voice alerts"
                  description="Useful when internet is weak or phones are shared."
                  checked={preferences.broadcastVoice}
                  onChange={(checked) => setPreferences((prev) => ({ ...prev, broadcastVoice: checked }))}
                />
                <SwitchCard
                  label="Live location"
                  description="Best for responders and community leaders."
                  checked={preferences.liveLocation}
                  onChange={(checked) => setPreferences((prev) => ({ ...prev, liveLocation: checked }))}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                {panel === 'citizen'
                  ? 'Citizen settings keep the reporting path short and easy to use during an emergency.'
                  : panel === 'responder'
                    ? 'Responder settings help volunteers share location, stay on duty, and arrive with the right transport.'
                    : 'County settings keep alerts, hotline routing, and escalation preferences easy to manage.'}
              </div>

              <button
                disabled={savingPreferences}
                className="w-full rounded-2xl bg-calm px-4 py-3 font-semibold text-slate-950 transition hover:bg-calm/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPreferences ? 'Saving preferences…' : 'Save device preferences'}
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Access guide</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <GuideCard title="Citizen" body="Report incidents, share location, upload photos or voice notes, and see public alerts." />
              <GuideCard title="Responder" body="Accept missions, share live position, and update progress with simple status changes." />
              <GuideCard title="Admin" body="Control county contacts, service directories, escalation paths, and audit visibility." />
            </div>
          </div>
        </div>
      </div>

      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div> : null}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? label}
        className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500"
      />
    </label>
  )
}

function SwitchCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-slate-100">{label}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-emerald-500"
      />
    </label>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  )
}

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
      <div className="text-lg font-semibold text-slate-100">{title}</div>
      <div className="mt-2 text-sm text-slate-400">{body}</div>
    </div>
  )
}
