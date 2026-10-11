import i18n from '../i18n'

const locale = () => (i18n.language === 'en' ? 'en-US' : 'fr-FR')

// Francs CFA sans decimale : "45 000 FCFA" (francais), "FCFA 45,000" (anglais)
export const formatPrice = (amount) =>
  new Intl.NumberFormat(locale(), { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(
    Number(amount ?? 0),
  )

// Parametres de recherche du catalogue : seules les valeurs renseignees sont gardees
export function catalogParams(searchParams) {
  const keys = ['category', 'brand', 'size', 'color', 'min_price', 'max_price', 'search', 'page']
  return Object.fromEntries(keys.map((key) => [key, searchParams.get(key)]).filter(([, value]) => value))
}

// Silhouette d'illustration selon la sous-categorie (en attendant les photos des produits)
export function shoeShape(categoryName = '') {
  const name = categoryName.toLowerCase()
  if (name.includes('talon') || name.includes('heel')) return 'heel'
  if (name.includes('sandale') || name.includes('sandal')) return 'sandal'
  if (name.includes('ville') || name.includes('écolier') || name.includes('ecolier')) return 'classic'
  return 'sneaker'
}
