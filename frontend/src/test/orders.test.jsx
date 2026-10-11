import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderTimeline } from '../components/orders'
import { deliveryFee, orderSteps, paymentOptions, tooFewPairsAbroad } from '../utils/orders'

describe('regles d affichage des commandes', () => {
  const rules = {
    douala_fee: 1000,
    rates: { AUTRE_VILLE: 10, ETRANGER: 20 },
    min_pairs_abroad: 5,
    bulk_pairs: 10,
    bulk_discount: 10,
  }

  it('calcule la livraison selon la destination, retrait gratuit (R8)', () => {
    expect(deliveryFee('LIVRAISON', 'DOUALA', 80000, 3, rules)).toBe(1000)
    expect(deliveryFee('LIVRAISON', 'AUTRE_VILLE', '12345', 1, rules)).toBe(1235)
    expect(deliveryFee('LIVRAISON', 'ETRANGER', 50000, 5, rules)).toBe(10000)
    expect(deliveryFee('RETRAIT', 'DOUALA', 10000, 1, rules)).toBe(0)
  })

  it('accorde 10 % de reduction sur la livraison a partir de 10 paires', () => {
    expect(deliveryFee('LIVRAISON', 'DOUALA', 100000, 10, rules)).toBe(900)
    expect(deliveryFee('LIVRAISON', 'AUTRE_VILLE', 100000, 10, rules)).toBe(9000)
  })

  it('demande au moins 5 paires pour l etranger', () => {
    expect(tooFewPairsAbroad('ETRANGER', 4, rules)).toBe(true)
    expect(tooFewPairsAbroad('ETRANGER', 5, rules)).toBe(false)
    expect(tooFewPairsAbroad('AUTRE_VILLE', 1, rules)).toBe(false)
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
