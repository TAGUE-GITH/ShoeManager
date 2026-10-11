import { describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { catalogParams, formatPrice, shoeShape } from '../utils/format'

describe('formatPrice', () => {
  it('affiche les francs CFA sans decimale, au format de la langue', async () => {
    await i18n.changeLanguage('fr')
    expect(formatPrice('45000').replace(/\s/g, ' ')).toBe('45 000 FCFA')
    await i18n.changeLanguage('en')
    expect(formatPrice(45000).replace(/\s/g, ' ')).toBe('FCFA 45,000')
    await i18n.changeLanguage('fr')
  })
})

describe('catalogParams', () => {
  it('ne garde que les filtres renseignes', () => {
    const params = new URLSearchParams('category=hommes&size=42&color=&search=nike&utm=pub')
    expect(catalogParams(params)).toEqual({ category: 'hommes', size: '42', search: 'nike' })
  })
})

describe('shoeShape', () => {
  it.each([
    ['Talons', 'heel'],
    ['Sandales', 'sandal'],
    ['Ville', 'classic'],
    ['Écoliers', 'classic'],
    ['Baskets', 'sneaker'],
  ])('%s -> %s', (category, shape) => {
    expect(shoeShape(category)).toBe(shape)
  })
})
