import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderTimeline } from '../components/orders'
import { deliveryFee, orderSteps, paymentOptions } from '../utils/orders'

describe('regles d affichage des commandes', () => {
  it('calcule les frais de livraison selon la zone, retrait gratuit (R8)', () => {
    expect(deliveryFee('LIVRAISON', 'DOUALA')).toBe(1000)
    expect(deliveryFee('LIVRAISON', 'AUTRE_VILLE')).toBe(3000)
    expect(deliveryFee('RETRAIT', 'DOUALA')).toBe(0)
  })

  it('propose les moyens de paiement compatibles avec le mode de reception', () => {
    expect(paymentOptions('LIVRAISON')).toEqual(['A_LA_LIVRAISON', 'MOBILE_MONEY'])
    expect(paymentOptions('RETRAIT')).toEqual(['EN_BOUTIQUE', 'MOBILE_MONEY'])
  })

  it('suit les etapes d une livraison ou d un retrait (R5)', () => {
    expect(orderSteps('LIVRAISON')).toContain('EXPEDIEE')
    expect(orderSteps('RETRAIT')).toContain('PRETE')
    expect(orderSteps('RETRAIT')).not.toContain('EXPEDIEE')
  })
})

describe('OrderTimeline', () => {
  it('marque l etape en cours', () => {
    render(<OrderTimeline order={{ status: 'EN_PREPARATION', delivery_mode: 'RETRAIT' }} />)

    const current = screen.getByText('En préparation').closest('li')
    expect(current).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Prête en boutique')).toBeInTheDocument()
  })

  it('affiche seulement « Annulée » pour une commande annulee', () => {
    render(<OrderTimeline order={{ status: 'ANNULEE', delivery_mode: 'RETRAIT' }} />)

    expect(screen.getByText('Annulée')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
