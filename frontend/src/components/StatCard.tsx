import { motion } from 'framer-motion'

export function StatCard({
  title,
  value,
  detail,
  accent = 'bg-calm/15 text-calm',
}: {
  title: string
  value: string | number
  detail?: string
  accent?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow"
    >
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>{title}</div>
      <div className="mt-4 text-4xl font-semibold tracking-tight">{value}</div>
      {detail ? <div className="mt-2 text-sm text-slate-400">{detail}</div> : null}
    </motion.div>
  )
}

