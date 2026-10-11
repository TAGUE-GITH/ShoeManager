import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { manageApi } from '../api/resources'
import { ProductEditorPage } from '../pages/manage/CatalogPages'

vi.mock('../api/resources', () => ({
  manageApi: {
    categories: vi.fn(),
    brands: vi.fn(),
    saveProduct: vi.fn(),
    uploadImage: vi.fn(),
    product: vi.fn(),
    variants: vi.fn(),
    colors: vi.fn(),
  },
}))

describe('Creation d un produit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn((file) => `blob:${file.name}`)
    URL.revokeObjectURL = vi.fn()
    manageApi.categories.mockResolvedValue([
      { id: 1, name: 'Hommes', parent: null },
      { id: 2, name: 'Baskets', parent: 1 },
    ])
    manageApi.brands.mockResolvedValue([{ id: 5, name: 'Adidas' }])
    manageApi.saveProduct.mockResolvedValue({ id: 42, name: 'Stan Smith' })
    manageApi.uploadImage.mockResolvedValue({ id: 1, url: '/api/images/1/' })
    manageApi.product.mockReturnValue(new Promise(() => {}))
  })

  it('envoie les photos choisies juste apres avoir cree le produit', async () => {
    render(
      <MemoryRouter initialEntries={['/gestion/catalogue/nouveau']}>
        <Routes>
          <Route path="/gestion/catalogue/:id" element={<ProductEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )
    const photo = new File(['photo'], 'stan-smith.jpg', { type: 'image/jpeg' })

    await userEvent.upload(await screen.findByLabelText('Ajouter des photos'), photo)
    expect(screen.getByRole('button', { name: 'Retirer la photo stan-smith.jpg' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nom du modèle'), 'Stan Smith')
    await userEvent.selectOptions(await screen.findByLabelText('Catégorie'), '2')
    await userEvent.selectOptions(screen.getByLabelText('Marque'), '5')
    await userEvent.type(screen.getByLabelText('Prix (FCFA)'), '55000')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le produit' }))

    expect(manageApi.saveProduct).toHaveBeenCalledWith(undefined, expect.objectContaining({ name: 'Stan Smith' }))
    expect(manageApi.uploadImage).toHaveBeenCalledWith(42, photo)
  })
})
