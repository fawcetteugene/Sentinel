export function clsx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function severityTone(severity?: string | null) {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/15 text-red-300 ring-red-500/30'
    case 'high':
      return 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
    case 'moderate':
      return 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
    case 'low':
      return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
    default:
      return 'bg-slate-500/15 text-slate-300 ring-white/10'
  }
}

export function resourceStatusTone(status?: string | null) {
  switch (status) {
    case 'available':
      return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
    case 'busy':
      return 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
    case 'maintenance':
      return 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
    case 'offline':
      return 'bg-red-500/15 text-red-300 ring-red-500/30'
    default:
      return 'bg-slate-500/15 text-slate-300 ring-white/10'
  }
}

