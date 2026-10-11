import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderTimeline } from '../components/orders'
import { deliveryFee, orderSteps, paymentOptions } from '../utils/orders'

describe('regles d affichage des commandes', () => {
  it('calcule la livraison a 10 % du montant des chaussures, retrait gratuit (R8)', () => {
    expect(deliveryFee('LIVRAISON', 10000)).toBe(1000)
    expect(deliveryFee('LIVRAISON', '12345')).toBe(1235)
    expect(deliveryFee('RETRAIT', 10000)).toBe(0)
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
