import { describe, expect, it } from 'vitest'
import { unlock } from './achievement'

describe('Distinctions des Chroniques', () => {
  it('débloque Fondateur quand un joueur fonde son village', () => {
    const result = unlock([], { type: 'VillageFounded' }, 100)

    expect(result).toEqual({ id: 'founder', obtainedAt: 100 })
  })

  it('débloque Bâtisseur quand un bâtiment est amélioré', () => {
    const result = unlock([], { type: 'BuildingUpgraded' }, 200)

    expect(result).toEqual({ id: 'builder', obtainedAt: 200 })
  })

  it('débloque Éclaireur quand une expédition est ouverte', () => {
    const result = unlock([], { type: 'GameCreated' }, 300)

    expect(result).toEqual({ id: 'explorer', obtainedAt: 300 })
  })

  it('débloque Conquérant pour un joueur humain après une victoire', () => {
    const result = unlock([], { type: 'GameEnded', result: 'won', human: true }, 400)

    expect(result).toEqual({ id: 'conqueror', obtainedAt: 400 })
  })

  it('ne débloque pas Conquérant après une défaite ou pour un compagnon', () => {
    expect(unlock([], { type: 'GameEnded', result: 'lost', human: true }, 500)).toBeNull()

    expect(unlock([], { type: 'GameEnded', result: 'won', human: false }, 500)).toBeNull()
  })

  it('ne débloque pas deux fois la même distinction', () => {
    const first = unlock([], { type: 'VillageFounded' }, 100)
    const second = unlock(['founder'], { type: 'VillageFounded' }, 200)

    expect(first?.obtainedAt).toBe(100)
    expect(second).toBeNull()
  })
})
