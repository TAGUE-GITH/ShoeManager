import { describe, expect, it } from 'vitest'
import { addToTicket, ticketTotal, timeLeft } from '../utils/shop'

describe('timeLeft', () => {
  const now = new Date('2026-10-11T10:00:00Z')

  it('donne les heures et minutes restantes', () => {
    expect(timeLeft('2026-10-13T08:30:00Z', now)).toEqual({ expired: false, hours: 46, minutes: 30 })
  })

  it('signale une reservation echue', () => {
    expect(timeLeft('2026-10-11T09:59:00Z', now).expired).toBe(true)
  })
})

describe('ticket de caisse', () => {
  const pair = { variant: 7, label: 'Stan Smith 42', price: '55000', available: 2 }

  it('ajoute une paire puis augmente la quantite sans depasser le stock', () => {
    let lines = addToTicket([], pair)
    lines = addToTicket(lines, pair)
    lines = addToTicket(lines, pair)
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
  })

  it('calcule le total', () => {
    const lines = [
      { ...pair, quantity: 2 },
      { variant: 9, price: '12000', quantity: 1 },
    ]
    expect(ticketTotal(lines)).toBe(122000)
  })
})
