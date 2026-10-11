import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountApi, manageApi } from '../api/resources'
import DemoButtons from '../components/DemoButtons'
import ManageLayout, { manageHome } from '../components/ManageLayout'
import { useAuth } from '../context/AuthProvider'
import StockPage from '../pages/manage/StockPage'

vi.mock('../api/resources', () => ({
  accountApi: { demo: vi.fn() },
  manageApi: { stockAlerts: vi.fn(), updateVariant: vi.fn() },
}))
vi.mock('../context/AuthProvider', () => ({ useAuth: vi.fn() }))

const tabNames = () =>
  within(screen.getByRole('navigation'))
    .getAllByRole('link')
    .map((link) => link.textContent)

describe('Espace boutique', () => {
  beforeEach(() => vi.clearAllMocks())

  it('montre au vendeur seulement les onglets de vente', () => {
    useAuth.mockReturnValue({ user: { role: 'VENDEUR' } })
    render(<ManageLayout />, { wrapper: MemoryRouter })
    expect(tabNames()).toEqual(['Commandes en ligne', 'Réservations', 'Caisse', 'Clients'])
  })

  it('montre au gerant le pilotage de la boutique', () => {
    useAuth.mockReturnValue({ user: { role: 'GERANT' } })
    render(<ManageLayout />, { wrapper: MemoryRouter })
    expect(tabNames()).toEqual([
      'Tableau de bord',
      'Commandes en ligne',
      'Réservations',
      'Caisse',
      'Catalogue',
      'Stock bas',
      'Clients',
      'Équipe',
    ])
  })

  it('ouvre le tableau de bord pour le gerant et les commandes pour le vendeur', () => {
    expect(manageHome('GERANT')).toBe('tableau-de-bord')
    expect(manageHome('VENDEUR')).toBe('commandes')
  })
})

describe('DemoButtons', () => {
  it('ouvre une session de demonstration et va sur la page du role', async () => {
    const openSession = vi.fn()
    useAuth.mockReturnValue({ openSession })
    accountApi.demo.mockResolvedValue({ access: 'a', refresh: 'r', user: { role: 'GERANT' } })
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DemoButtons />} />
          <Route path="/gestion/tableau-de-bord" element={<p>Tableau du gérant</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'En gérant' }))

    expect(accountApi.demo).toHaveBeenCalledWith('GERANT')
    expect(openSession).toHaveBeenCalledWith(expect.objectContaining({ access: 'a' }))
    expect(await screen.findByText('Tableau du gérant')).toBeInTheDocument()
  })
})

describe('StockPage', () => {
  it('ajoute les paires recues au stock physique', async () => {
    const row = {
      variant: 7,
      sku: 'SM-7',
      product: 'Stan Smith',
      product_id: 3,
      size: '42',
      color: 'Blanc',
      color_hex: '#ffffff',
      stock: 2,
      available: 1,
      threshold: 3,
    }
    manageApi.stockAlerts.mockResolvedValue([row])
    manageApi.updateVariant.mockResolvedValue({})
    render(<StockPage />, { wrapper: MemoryRouter })

    expect(await screen.findByText('1 restante')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Paires reçues pour Stan Smith, pointure 42'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    expect(manageApi.updateVariant).toHaveBeenCalledWith(7, { stock: 7 })
    expect(manageApi.stockAlerts).toHaveBeenCalledTimes(2)
  })
})
