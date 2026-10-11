// Classes des boutons, partagees par les boutons et les liens qui ressemblent a des boutons
export function buttonClasses(variant = 'primary', extra = '') {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800',
    dark: 'bg-ink text-white hover:bg-stone-700',
    secondary: 'bg-white text-ink ring-1 ring-stone-300 hover:bg-stone-100',
    ghost: 'text-stone-700 hover:bg-stone-100',
  }
  return `${base} ${variants[variant]} ${extra}`
}
