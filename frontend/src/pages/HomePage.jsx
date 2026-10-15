import { ArrowRight, CalendarClock, Check, Smartphone, Store, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { catalogApi } from '../api/resources'
import ProductCard from '../components/ProductCard'
import DemoButtons from '../components/DemoButtons'
import { buttonClasses } from '../components/buttonStyles'
import { Loader } from '../components/ui'
import { useAuth } from '../context/AuthProvider'
import { useFetch } from '../hooks/useFetch'
import { PHOTOS, photoSrcSet, photoUrl } from '../utils/photos'

/** Photo responsive : le navigateur choisit la taille adaptee a l'ecran. */
function Picture({ photo, ratio, sizes, className = '', eager = false }) {
  return (
    <img
      src={photoUrl(photo, 960, Math.round(960 / ratio))}
      srcSet={photoSrcSet(photo, [480, 960, 1600], ratio)}
      sizes={sizes}
      alt={photo.alt}
      loading={eager ? 'eager' : 'lazy'}
      className={`bg-stone-200 object-cover ${className}`}
    />
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: categories } = useFetch(catalogApi.categories, 'categories')
  const { data: latest, loading } = useFetch(() => catalogApi.products({ page: 1 }), 'latest')

  const services = [
    { Icon: Truck, title: t('home.services.delivery'), text: t('home.services.deliveryText') },
    { Icon: Store, title: t('home.services.pickup'), text: t('home.services.pickupText') },
    { Icon: CalendarClock, title: t('home.services.reservation'), text: t('home.services.reservationText') },
    { Icon: Smartphone, title: t('home.services.payment'), text: t('home.services.paymentText') },
  ]

  return (
    <>
      {/* Accroche : la boutique en photo */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <Picture photo={PHOTOS.hero} ratio={16 / 9} sizes="100vw" eager className="absolute inset-0 -z-10 size-full" />
        <div
          className="absolute inset-0 -z-10 bg-ink/75 sm:bg-transparent sm:bg-gradient-to-r sm:from-ink/95 sm:via-ink/75 sm:to-ink/20"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-28">
          <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-brand-100 ring-1 ring-white/20 backdrop-blur">
            {t('home.badge')}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
            {t('home.title')} <span className="text-brand-500">{t('home.highlight')}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-stone-200">{t('home.subtitle')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/catalogue" className={buttonClasses('primary', 'px-6 py-3 text-base')}>
              {t('home.cta')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href="#comment-ca-marche" className={buttonClasses('secondary', 'px-6 py-3 text-base')}>
              {t('home.howItWorks')}
            </a>
          </div>
          {!user && (
            <div className="mt-8 max-w-xl border-t border-white/15 pt-6">
              <DemoButtons dark />
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      <section id="comment-ca-marche" className="scroll-mt-20 border-b border-stone-200 bg-white">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {services.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-ink">{title}</p>
                <p className="text-sm text-stone-500">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Rayons : Hommes, Femmes, Enfants */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">{t('home.categories')}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {(categories ?? []).map((category) => (
              <Link
                key={category.id}
                to={`/catalogue?category=${category.slug}`}
                className="group relative block overflow-hidden rounded-2xl ring-1 ring-stone-200"
              >
                <Picture
                  photo={PHOTOS[category.name] ?? PHOTOS.wall}
                  ratio={4 / 5}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="aspect-[4/5] w-full transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent p-5 pt-16 text-white">
                  <p className="text-2xl font-bold">{category.name}</p>
                  <p className="text-sm text-stone-200">{category.children.map((child) => child.name).join(' · ')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Nouveautes */}
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-ink">{t('home.latest')}</h2>
            <Link to="/catalogue" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              {t('home.seeAll')}
            </Link>
          </div>
          {loading ? (
            <Loader />
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {(latest?.results ?? []).slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* La boutique */}
        <section className="mt-16 mb-4 grid items-center gap-8 rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:p-8 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <Picture photo={PHOTOS.wall} ratio={3 / 4} sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[3/4] w-full rounded-2xl" />
            <Picture photo={PHOTOS.boxes} ratio={3 / 4} sizes="(min-width: 1024px) 25vw, 50vw" className="mt-8 aspect-[3/4] w-full rounded-2xl" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink">{t('home.shopTitle')}</h2>
            <p className="mt-3 text-stone-600">{t('home.shopText')}</p>
            <ul className="mt-5 space-y-2">
              {t('home.shopPoints', { returnObjects: true }).map((point) => (
                <li key={point} className="flex gap-2 text-ink">
                  <Check className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
            <Link to="/catalogue" className={buttonClasses('primary', 'mt-6 px-6 py-3 text-base')}>
              {t('home.cta')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
