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
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>{title}</div>
      </div>
      <div className="text-4xl font-semibold tracking-tight text-slate-950">{value}</div>
      {detail ? <div className="mt-2 text-sm leading-6 text-slate-500">{detail}</div> : null}
    </motion.div>
  )
}
