import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type Db } from '@/platform/db/client'
import { createEventStore, type EventStore } from '@/platform/event-store/event-store'
import { createProjectionRunner, type ProjectionRunner } from '@/platform/projection/projection'
import { achievementProjection } from './achievement-projection'
import { achievements, gamePlayers } from './schema'

let db: Db
let store: EventStore
let projections: ProjectionRunner

beforeEach(async () => {
  db = await createTestDatabase()
  store = createEventStore(db)
  projections = createProjectionRunner(db)
})

/** Distinctions d'un joueur, triées par identifiant pour faciliter les tests. */
async function achievementsOf(playerId: string) {
  const rows = await db.select().from(achievements).where(eq(achievements.playerId, playerId))

  return rows
    .map((row) => ({ id: row.achievementId, at: row.obtainedAt }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

describe('Projection des Chroniques', () => {
  it('attribue les distinctions du Village une seule fois', async () => {
    await store.append('village-alice', 0, [
      { type: 'VillageFounded', data: { name: 'Valombre', at: 100 } },
      { type: 'BuildingUpgraded', data: { at: 200 } },
      { type: 'BuildingUpgraded', data: { at: 300 } },
    ])

    await projections.catchUp(achievementProjection)

    expect(await achievementsOf('alice')).toEqual([
      { id: 'builder', at: 200 },
      { id: 'founder', at: 100 },
    ])
  })

  it('récompense les joueurs humains après une victoire', async () => {
    await store.append('dungeon-1', 0, [
      { type: 'GameCreated', data: { hostId: 'alice', at: 100 } },
      { type: 'PlayerJoined', data: { playerId: 'bob', at: 150 } },
      { type: 'CompanionAdded', data: { companionId: 'companion-1', at: 200 } },
      { type: 'GameEnded', data: { result: 'won', at: 500 } },
    ])

    await projections.catchUp(achievementProjection)

    expect(await achievementsOf('alice')).toEqual([
      { id: 'conqueror', at: 500 },
      { id: 'explorer', at: 100 },
    ])

    expect(await achievementsOf('bob')).toEqual([{ id: 'conqueror', at: 500 }])

    expect(await achievementsOf('companion-1')).toEqual([])
    expect(await db.select().from(gamePlayers)).toEqual([])
  })

  it('ne donne pas Conquérant après une défaite', async () => {
    await store.append('dungeon-1', 0, [
      { type: 'GameCreated', data: { hostId: 'alice', at: 100 } },
      { type: 'GameEnded', data: { result: 'lost', at: 500 } },
    ])

    await projections.catchUp(achievementProjection)

    expect(await achievementsOf('alice')).toEqual([{ id: 'explorer', at: 100 }])
    expect(await db.select().from(gamePlayers)).toEqual([])
  })

  it('reconstruit les distinctions depuis le journal', async () => {
    await store.append('village-alice', 0, [
      { type: 'VillageFounded', data: { name: 'Valombre', at: 100 } },
    ])

    await projections.catchUp(achievementProjection)
    const before = await achievementsOf('alice')

    // La reconstruction vide les tables puis relit les événements.
    await projections.rebuild(achievementProjection)

    expect(await achievementsOf('alice')).toEqual(before)

    // Un nouveau rattrapage ne doit pas créer de doublon.
    await projections.catchUp(achievementProjection)
    expect(await achievementsOf('alice')).toEqual(before)
  })
})
