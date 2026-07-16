import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-sm uppercase tracking-[0.35em] text-calm/80">404</div>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-md text-slate-400">The requested operations screen does not exist in this deployment.</p>
      <Link className="rounded-2xl bg-calm px-4 py-3 font-semibold text-slate-950" to="/">
        Return to dashboard
      </Link>
    </div>
  )
}

