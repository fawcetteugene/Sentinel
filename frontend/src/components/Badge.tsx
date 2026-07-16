import { clsx, severityTone, resourceStatusTone } from './ui'

export function Badge({ label, tone }: { label: string; tone?: string }) {
  return <span className={clsx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', tone)}>{label}</span>
}

export function SeverityBadge({ severity }: { severity?: string | null }) {
  return <Badge label={(severity ?? 'unknown').toUpperCase()} tone={severityTone(severity)} />
}

export function ResourceBadge({ status }: { status?: string | null }) {
  return <Badge label={(status ?? 'unknown').toUpperCase()} tone={resourceStatusTone(status)} />
}

