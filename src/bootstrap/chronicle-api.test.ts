import { describe, expect, it } from 'vitest'
import type { Achievement } from '@/modules/chronicle/contracts'
import { achievementProjection } from '@/modules/chronicle/infrastructure/achievement-projection'
import { createEventStore } from '@/platform/event-store/event-store'
import { createProjectionRunner } from '@/platform/projection/projection'
import { createTestApi } from './testing'

type TestApi = Awaited<ReturnType<typeof createTestApi>>

/** Distinctions renvoyées par l'API pour un joueur. */
async function achievementsOf(api: TestApi, player = 'alice') {
  const res = await api.get('/api/chronicle/achievements', player)
  const body = (await res.json()) as { achievements: Achievement[] }
  return body.achievements
}

describe('API du module Chroniques', () => {
  it('refuse une requête anonyme (401)', async () => {
    const api = await createTestApi()

    const res = await api.get('/api/chronicle/achievements', null)
    expect(res.status).toBe(401)
  })

  it('attribue les distinctions du Village au bon joueur', async () => {
    const api = await createTestApi()

    await api.post('/api/realm/village', { name: 'Valombre' }, 'alice')
    api.advance(2)
    await api.post('/api/realm/village/upgrade', { building: 'mine' }, 'alice')

    const alice = await achievementsOf(api, 'alice')
    const bob = await achievementsOf(api, 'bob')

    expect(alice.map((a) => a.id).sort()).toEqual(['builder', 'founder'])
    expect(bob).toEqual([])
  })

  it("attribue Éclaireur au joueur qui ouvre l'expédition", async () => {
    const api = await createTestApi()

    const res = await api.post('/api/dungeon/games', {}, 'alice')
    const { gameId } = await res.json()

    await api.post(`/api/dungeon/games/${gameId}/join`, {}, 'bob')

    expect((await achievementsOf(api, 'alice')).map((a) => a.id)).toEqual(['explorer'])
    expect(await achievementsOf(api, 'bob')).toEqual([])
  })

  it("exporte et efface les distinctions d'un joueur", async () => {
    const api = await createTestApi()

    await api.post('/api/realm/village', { name: 'Valombre' })

    // Export des données personnelles.
    const exportRes = await api.get('/api/account/export')
    const { sections } = await exportRes.json()

    expect(sections.chronicle).toMatchObject([
      { achievementId: 'founder', obtainedAt: expect.any(Number) },
    ])

    // Suppression du compte.
    const deleteRes = await api.api.request('/api/account', {
      method: 'DELETE',
      headers: { 'x-test-user': 'alice' },
    })

    expect(deleteRes.status).toBe(200)
    expect(await achievementsOf(api)).toEqual([])
  })

  it('refuse le canal Chroniques à un joueur anonyme', async () => {
    const api = await createTestApi()

    const res = await api.get('/api/stream/chronicle/events?after=0', null)

    expect(res.status).toBe(401)
  })

  it('autorise le canal sans divulguer les données des événements', async () => {
    const api = await createTestApi()

    await api.post('/api/realm/village', { name: 'Valombre' }, 'alice')

    const res = await api.get('/api/stream/chronicle/events?after=0', 'alice')

    expect(res.status).toBe(200)

    const body = await res.json()
    const event = body.events.find((item: { type: string }) => item.type === 'VillageFounded')

    expect(event).toBeDefined()
    expect(event.data).toEqual({})
  })

  it('ne recrée pas les succès après la suppression du compte et une reconstruction', async () => {
    const api = await createTestApi()

    // Le user créé son village et améliore un bâtiment.
    await api.post('/api/realm/village', { name: 'Valombre' })
    api.advance(2)
    await api.post('/api/realm/village/upgrade', { building: 'mine' })

    expect((await achievementsOf(api)).map((a) => a.id).sort()).toEqual(['builder', 'founder'])

    // Il supprime son compte.
    const res = await api.api.request('/api/account', {
      method: 'DELETE',
      headers: { 'x-test-user': 'alice' },
    })

    expect(res.status).toBe(200)
    expect(await achievementsOf(api)).toEqual([])

    // Le moteur reconstruit les succès depuis le journal.
    const projections = createProjectionRunner(api.db)
    await projections.rebuild(achievementProjection)

    // Les succès du compte supprimé ne doivent pas réapparaître.
    expect(await achievementsOf(api)).toEqual([])
  })

  it("conserve les succès des autres joueurs après l'effacement de l'hôte", async () => {
    const api = await createTestApi()
    const store = createEventStore(api.db)
    const at = Date.UTC(2026, 0, 1)

    // User1 ouvre une expédition, user2 la rejoint et ils gagnent.
    await store.append('dungeon-rgpd', 0, [
      { type: 'GameCreated', data: { hostId: 'alice', hostName: 'Alice', at } },
      { type: 'PlayerJoined', data: { playerId: 'bob', name: 'Bob', at } },
      { type: 'GameEnded', data: { result: 'won', at } },
    ])

    expect((await achievementsOf(api, 'alice')).map((a) => a.id).sort()).toEqual([
      'conqueror',
      'explorer',
    ])
    expect((await achievementsOf(api, 'bob')).map((a) => a.id)).toEqual(['conqueror'])

    const res = await api.api.request('/api/account', {
      method: 'DELETE',
      headers: { 'x-test-user': 'alice' },
    })
    expect(res.status).toBe(200)

    // Reconstruction à partir du journal anonymisé.
    const projections = createProjectionRunner(api.db)
    await projections.rebuild(achievementProjection)

    // User1 ne retrouve aucun succès, mais user2 conserve le sien.
    expect(await achievementsOf(api, 'alice')).toEqual([])
    expect((await achievementsOf(api, 'bob')).map((a) => a.id)).toEqual(['conqueror'])
  })
})
