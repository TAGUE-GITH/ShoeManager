// Calculs d'affichage des reservations et de la caisse (le serveur refait tous les controles)

// Temps restant avant l'echeance d'une reservation (regle R9 : 48 h)
export function timeLeft(expiresAt, now = new Date()) {
  const minutes = Math.floor((new Date(expiresAt) - now) / 60_000)
  if (minutes <= 0) return { expired: true, hours: 0, minutes: 0 }
  return { expired: false, hours: Math.floor(minutes / 60), minutes: minutes % 60 }
}

// Total d'un ticket de caisse : somme des prix x quantites
export function ticketTotal(lines) {
  return lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0)
}

// Ajoute une paire au ticket (ou augmente sa quantite) sans depasser le stock disponible
export function addToTicket(lines, line) {
  const existing = lines.find((current) => current.variant === line.variant)
  if (!existing) return [...lines, { ...line, quantity: 1 }]
  return lines.map((current) =>
    current.variant === line.variant ? { ...current, quantity: Math.min(current.quantity + 1, current.available) } : current,
  )
}

export const SALE_PAYMENTS = ['ESPECES', 'MOBILE_MONEY', 'CARTE']
