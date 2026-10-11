import { ArrowRight, CalendarClock, Smartphone, Store, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { catalogApi } from '../api/resources'
import ProductCard from '../components/ProductCard'
import ShoeIllustration from '../components/ShoeIllustration'
import { buttonClasses } from '../components/buttonStyles'
import { Loader } from '../components/ui'
import { useFetch } from '../hooks/useFetch'

const CATEGORY_LOOK = [
  { shape: 'sneaker', color: '#1e3a5f' },
  { shape: 'heel', color: '#b91c1c' },
  { shape: 'sneaker', color: '#f59e0b' },
]

export default function HomePage() {
  const { t } = useTranslation()
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
      {/* Accroche */}
      <section className="overflow-hidden bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-sm font-semibold tracking-wider text-brand-200 uppercase">{t('home.badge')}</p>
            <h1 className="mt-4 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              {t('home.title')} <span className="text-brand-500">{t('home.highlight')}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-stone-300">{t('home.subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalogue" className={buttonClasses('primary', 'px-6 py-3 text-base')}>
                {t('home.cta')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href="#comment-ca-marche" className={buttonClasses('secondary', 'px-6 py-3 text-base')}>
                {t('home.howItWorks')}
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-6 rounded-full bg-brand-700/30 blur-3xl" aria-hidden />
            <ShoeIllustration shape="sneaker" color="#ea580c" className="relative w-full drop-shadow-2xl" />
          </div>
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
        {/* Categories */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">{t('home.categories')}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {(categories ?? []).map((category, index) => {
              const look = CATEGORY_LOOK[index % CATEGORY_LOOK.length]
              return (
                <Link
                  key={category.id}
                  to={`/catalogue?category=${category.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-stone-200 transition hover:shadow-lg hover:ring-brand-200"
                >
                  <ShoeIllustration {...look} className="mx-auto w-4/5 transition group-hover:scale-105" />
                  <p className="mt-4 text-xl font-bold text-ink">{category.name}</p>
                  <p className="text-sm text-stone-500">{category.children.map((child) => child.name).join(' · ')}</p>
                </Link>
              )
            })}
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
      </div>
    </>
  )
}
