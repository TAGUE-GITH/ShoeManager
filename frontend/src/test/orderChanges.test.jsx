import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { catalogApi, ordersApi } from '../api/resources'
import { OrderPage } from '../pages/OrderPages'

vi.mock('../api/resources', () => ({
  ordersApi: { get: vi.fn(), addItem: vi.fn(), reorder: vi.fn(), cancel: vi.fn() },
  catalogApi: { products: vi.fn(), product: vi.fn() },
}))
const refresh = vi.fn()
vi.mock('../context/CartProvider', () => ({ useCart: () => ({ refresh }) }))

const order = (overrides) => ({
  id: 1,
  reference: 'CMD-2026-00001',
  status: 'CONFIRMEE',
  delivery_mode: 'LIVRAISON',
  delivery_city: 'Bafang',
  delivery_zone: 'AUTRE_VILLE',
  delivery_address: 'rue 2',
  phone: '651619171',
  payment_method: 'MOBILE_MONEY',
  is_paid: true,
  subtotal: '48000',
  delivery_fee: '4800',
  total: '52800',
  created_at: '2026-10-11T10:00:00Z',
  items: [
    {
      id: 1,
      product_name: 'Babies Daisy',
      size: '35',
      color: 'Bleu marine',
      quantity: 2,
      unit_price: '24000',
      line_total: '48000',
    },
  ],
  can_cancel: true,
  can_add_items: true,
  ...overrides,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/compte/commandes/1']}>
      <Routes>
        <Route path="/compte/commandes/:id" element={<OrderPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('Modifier une commande', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogApi.products.mockResolvedValue({
      results: [{ id: 3, slug: 'stan-smith', name: 'Stan Smith', brand: 'Adidas', price: '10000' }],
    })
    catalogApi.product.mockResolvedValue({
      name: 'Stan Smith',
      price: '10000',
      variants: [{ id: 9, size: '42', available: 3, color: { name: 'Blanc', hex_code: '#fff' } }],
    })
  })

  it('ajoute une paire a une commande confirmee', async () => {
    ordersApi.get.mockResolvedValue(order())
    ordersApi.addItem.mockResolvedValue(order({ total: '63800' }))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /Stan Smith/ }))
    await userEvent.click(await screen.findByRole('button', { name: /Ajouter la pointure 42 Blanc/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter à la commande' }))

    expect(ordersApi.addItem).toHaveBeenCalledWith(1, 9, 1)
    expect(await screen.findByText(/ajoutée à la commande/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Commander à nouveau' })).not.toBeInTheDocument()
  })

  it('propose seulement de commander a nouveau une commande expediee', async () => {
    ordersApi.get.mockResolvedValue(order({ status: 'EXPEDIEE', can_cancel: false, can_add_items: false }))
    ordersApi.reorder.mockResolvedValue({ added: 2, unavailable: [] })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Commander à nouveau' }))

    expect(screen.queryByText('Ajouter des paires à cette commande')).not.toBeInTheDocument()
    expect(ordersApi.reorder).toHaveBeenCalledWith(1)
    expect(refresh).toHaveBeenCalled()
    expect(await screen.findByText('2 paires ont été ajoutées à votre panier.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir mon panier' })).toHaveAttribute('href', '/panier')
  })
})
