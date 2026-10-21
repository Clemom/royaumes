import { eq } from 'drizzle-orm'
import { GAME_CHANNEL_PREFIX } from '@/modules/dungeon/contracts'
import { VILLAGE_CHANNEL_PREFIX } from '@/modules/realm/contracts'
import type { DbTransaction, Projection } from '@/platform/projection/projection'
import { type AchievementId, type AchievementTrigger, unlock } from '../domain/achievement'
import { achievements, gamePlayers } from './schema'

/** Attribue une distinction si le joueur ne la possède pas. */
async function award(tx: DbTransaction, playerId: string, trigger: AchievementTrigger, at: number) {
  const owned = await tx
    .select({ id: achievements.achievementId })
    .from(achievements)
    .where(eq(achievements.playerId, playerId))

  const result = unlock(
    owned.map((row) => row.id as AchievementId),
    trigger,
    at,
  )

  if (!result) return

  await tx
    .insert(achievements)
    .values({
      playerId,
      achievementId: result.id,
      obtainedAt: result.obtainedAt,
    })
    .onConflictDoNothing()
}

/** Projection des distinctions à partir des événements du Village et du Donjon. */
export const achievementProjection: Projection = {
  name: 'chronicle',
  version: 1,
  eventTypes: ['VillageFounded', 'BuildingUpgraded', 'GameCreated', 'PlayerJoined', 'GameEnded'],

  async apply(event, tx) {
    if (event.data.chronicleErased === true) return
    switch (event.type) {
      case 'VillageFounded':
      case 'BuildingUpgraded': {
        const playerId = event.stream.slice(VILLAGE_CHANNEL_PREFIX.length)
        const data = event.data as { at: number }

        await award(tx, playerId, { type: event.type }, data.at)
        return
      }

      case 'GameCreated': {
        const gameId = event.stream.slice(GAME_CHANNEL_PREFIX.length)
        const data = event.data as { hostId: string; at: number }

        await tx.insert(gamePlayers).values({ gameId, playerId: data.hostId }).onConflictDoNothing()

        await award(tx, data.hostId, { type: 'GameCreated' }, data.at)
        return
      }

      case 'PlayerJoined': {
        const gameId = event.stream.slice(GAME_CHANNEL_PREFIX.length)
        const data = event.data as { playerId: string }

        await tx
          .insert(gamePlayers)
          .values({ gameId, playerId: data.playerId })
          .onConflictDoNothing()
        return
      }

      case 'GameEnded': {
        const gameId = event.stream.slice(GAME_CHANNEL_PREFIX.length)
        const data = event.data as { result: 'won' | 'lost'; at: number }

        const players = await tx.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId))

        if (data.result === 'won') {
          for (const player of players) {
            await award(
              tx,
              player.playerId,
              { type: 'GameEnded', result: 'won', human: true },
              data.at,
            )
          }
        }

        // L'expédition est terminée : ses participants ne sont plus nécessaires.
        await tx.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId))
        return
      }
    }
  },

  async reset(tx) {
    await tx.delete(gamePlayers)
    await tx.delete(achievements)
  },
}
