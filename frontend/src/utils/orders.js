// Regles d'affichage des commandes (le serveur reste la reference : il refait tous les calculs)

// Regle R8 (regles envoyees par l'API) : forfait a Douala, pourcentage ailleurs, reduction a partir de 10 paires
export function deliveryFee(mode, zone, subtotal, pairs, rules) {
  if (mode !== 'LIVRAISON' || !zone || !rules) return 0
  let fee = zone === 'DOUALA' ? rules.douala_fee : (Number(subtotal) * rules.rates[zone]) / 100
  if (pairs >= rules.bulk_pairs) fee = (fee * (100 - rules.bulk_discount)) / 100
  return Math.round(fee)
}

// Livraison a l'etranger seulement a partir d'un minimum de paires
export const tooFewPairsAbroad = (zone, pairs, rules) => zone === 'ETRANGER' && pairs < (rules?.min_pairs_abroad ?? 0)

// Moyens de paiement possibles selon le mode de reception
export function paymentOptions(mode) {
  return mode === 'LIVRAISON' ? ['A_LA_LIVRAISON', 'MOBILE_MONEY'] : ['EN_BOUTIQUE', 'MOBILE_MONEY']
}

// Etapes affichees dans le suivi : une livraison est expediee, un retrait est mis a disposition en boutique
export function orderSteps(mode) {
  return ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', mode === 'LIVRAISON' ? 'EXPEDIEE' : 'PRETE', 'LIVREE']
}

// Couleur de la pastille de statut
export const STATUS_STYLE = {
  EN_ATTENTE: 'bg-amber-50 text-amber-800 ring-amber-200',
  CONFIRMEE: 'bg-sky-50 text-sky-800 ring-sky-200',
  EN_PREPARATION: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  EXPEDIEE: 'bg-violet-50 text-violet-800 ring-violet-200',
  PRETE: 'bg-violet-50 text-violet-800 ring-violet-200',
  LIVREE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  ANNULEE: 'bg-stone-100 text-stone-600 ring-stone-200',
}
