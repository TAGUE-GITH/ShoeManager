import { FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage, fieldErrors } from '../../api/client'
import { manageApi } from '../../api/resources'
import { Alert, Button, Field, Loader } from '../../components/ui'
import { useFetch } from '../../hooks/useFetch'

// Ligne d'une categorie : renommer ou supprimer
function CategoryRow({ category, onChange, onError, child = false }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)

  const run = async (action) => {
    onError('')
    try {
      await action()
      setEditing(false)
      onChange()
    } catch (err) {
      const byField = fieldErrors(err)
      onError(Object.values(byField)[0] ?? err.response?.data?.detail ?? errorMessage(err))
    }
  }

  return (
    <div className={`flex items-center gap-2 py-2 ${child ? 'pl-6' : ''}`}>
      {editing ? (
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            run(() => manageApi.updateCategory(category.id, { name: name.trim() }))
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={t('categories.renameOf', { name: category.name })}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
            autoFocus
          />
          <Button type="submit" variant="secondary" className="px-3 py-1.5">
            {t('catalogAdmin.save')}
          </Button>
          <Button type="button" variant="ghost" className="px-3 py-1.5" onClick={() => setEditing(false)}>
            {t('categories.cancel')}
          </Button>
        </form>
      ) : (
        <>
          <span className={`flex-1 ${child ? 'text-stone-700' : 'font-bold text-ink'}`}>{category.name}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-ink"
            aria-label={t('categories.renameOf', { name: category.name })}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() =>
              window.confirm(t('categories.confirmDelete', { name: category.name })) &&
              run(() => manageApi.deleteCategory(category.id))
            }
            className="rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700"
            aria-label={t('categories.deleteOf', { name: category.name })}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </>
      )}
    </div>
  )
}

// US-05 : rayons (Hommes, Femmes, Enfants) et leurs categories (Baskets, Sandales...)
export default function CategoriesPage() {
  const { t } = useTranslation()
  const [version, setVersion] = useState(0)
  const { data: categories, loading, error } = useFetch(manageApi.categories, `categories-${version}`)
  const [form, setForm] = useState({ name: '', parent: '' })
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const reload = () => setVersion((v) => v + 1)

  if (loading && !categories) return <Loader />
  const parents = (categories ?? []).filter((category) => !category.parent)
  const childrenOf = (parent) => categories.filter((category) => category.parent === parent.id)

  const add = async (event) => {
    event.preventDefault()
    setErrors({})
    setFeedback({ type: '', text: '' })
    try {
      const created = await manageApi.addCategory({ name: form.name.trim(), parent: form.parent || null })
      setFeedback({ type: 'success', text: t('categories.added', { name: created.name }) })
      setForm({ name: '', parent: form.parent })
      reload()
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      if (!Object.keys(byField).length) setFeedback({ type: 'error', text: errorMessage(err) })
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="sr-only">{t('manage.tabs.categories')}</h1>
        <p className="text-sm text-stone-600">{t('categories.intro')}</p>
        <div className="mt-3">
          <Alert type={feedback.type || 'error'}>{feedback.text}</Alert>
          <Alert>{error}</Alert>
        </div>
        <ul className="mt-3 space-y-3">
          {parents.map((parent) => (
            <li key={parent.id} className="rounded-2xl bg-white px-4 py-2 ring-1 ring-stone-200">
              <CategoryRow
                category={parent}
                onChange={reload}
                onError={(text) => setFeedback({ type: 'error', text })}
              />
              <ul className="divide-y divide-stone-100 border-t border-stone-100">
                {childrenOf(parent).map((child) => (
                  <li key={child.id}>
                    <CategoryRow
                      category={child}
                      child
                      onChange={reload}
                      onError={(text) => setFeedback({ type: 'error', text })}
                    />
                  </li>
                ))}
                {childrenOf(parent).length === 0 && (
                  <li className="py-2 pl-6 text-sm text-stone-400">{t('categories.empty')}</li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={add} className="h-fit space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200" noValidate>
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <FolderPlus className="size-5 text-brand-700" aria-hidden />
          {t('categories.addTitle')}
        </h2>
        <Field
          label={t('categories.name')}
          value={form.name}
          error={errors.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder={t('categories.namePlaceholder')}
          required
        />
        <div>
          <label htmlFor="category-parent" className="mb-1.5 block text-sm font-medium text-stone-700">
            {t('categories.parent')}
          </label>
          <select
            id="category-parent"
            value={form.parent}
            onChange={(event) => setForm({ ...form, parent: event.target.value })}
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="">{t('categories.newDepartment')}</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
          {errors.parent && <p className="mt-1.5 text-sm text-red-700">{errors.parent}</p>}
        </div>
        <Button type="submit" className="w-full">
          {t('categories.add')}
        </Button>
      </form>
    </div>
  )
}
