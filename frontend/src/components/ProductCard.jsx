import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatPrice, shoeShape } from '../utils/format'
import ShoeIllustration from './ShoeIllustration'

// Carte produit du catalogue : photo (ou illustration), marque, nom, prix et pointures disponibles
export default function ProductCard({ product }) {
  const { t } = useTranslation()
  const sizes = product.available_sizes
  return (
    <Link
      to={`/produits/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-200"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-stone-100 to-brand-50 p-6">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <ShoeIllustration
            shape={shoeShape(product.category)}
            color={product.colors[0]?.hex_code ?? '#c2410c'}
            className="w-full transition group-hover:scale-105"
          />
        )}
        {!product.in_stock && (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
            {t('product.soldOut')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{product.brand}</p>
        <h3 className="font-semibold text-ink">{product.name}</h3>
        <p className="text-sm text-stone-500">{product.category}</p>
        <ul className="mt-1 flex gap-1.5" aria-label={t('product.colors')}>
          {product.colors.map((color) => (
            <li
              key={color.name}
              title={color.name}
              className="size-4 rounded-full ring-1 ring-stone-300 ring-offset-1"
              style={{ backgroundColor: color.hex_code }}
            >
              <span className="sr-only">{color.name}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-3">
          <p className="text-lg font-bold text-ink">{formatPrice(product.price)}</p>
          {sizes.length > 0 && (
            <p className="text-xs text-stone-500">
              {t('product.sizesRange', { from: sizes[0], to: sizes[sizes.length - 1] })}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
