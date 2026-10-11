import { Link } from 'react-router-dom'

export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#c2410c" />
      <path d="M12 40c0-9 4-15 10-17l6 8c4 4 9 5 15 6l9 1c2 0 4 2 4 4v2H12z" fill="#fff" />
      <rect x="10" y="45" width="46" height="6" rx="3" fill="#fde68a" />
    </svg>
  )
}

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="FranckShoese">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-ink">
        Franck<span className="text-brand-700">Shoese</span>
      </span>
    </Link>
  )
}
