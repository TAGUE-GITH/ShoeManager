import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ProductCard from '../components/ProductCard'

const product = {
  id: 1,
  name: 'Air Force 1',
  slug: 'air-force-1',
  brand: 'Nike',
  category: 'Baskets',
  price: '65000',
  image: null,
  available_sizes: ['40', '42', '44'],
  in_stock: true,
  colors: [
    { name: 'Blanc', hex_code: '#f8fafc' },
    { name: 'Noir', hex_code: '#111827' },
  ],
}

const renderCard = (overrides = {}) =>
  render(
    <MemoryRouter>
      <ProductCard product={{ ...product, ...overrides }} />
    </MemoryRouter>,
  )

describe('ProductCard', () => {
  it('affiche la marque, le nom, les couleurs et la fourchette de pointures', () => {
    renderCard()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/produits/air-force-1')
    expect(screen.getByText('Nike')).toBeInTheDocument()
    expect(screen.getByText('Air Force 1')).toBeInTheDocument()
    expect(screen.getByText('Pointures 40 à 44')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Blanc', 'Noir'])
  })

  it('signale un modele epuise', () => {
    renderCard({ in_stock: false, available_sizes: [] })
    expect(screen.getByText('Épuisé')).toBeInTheDocument()
  })
})
