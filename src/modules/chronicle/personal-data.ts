import { eq } from 'drizzle-orm'
import { GAME_CHANNEL_PREFIX } from '@/modules/dungeon/contracts'
import { VILLAGE_CHANNEL_PREFIX } from '@/modules/realm/contracts'
import type { Db } from '@/platform/db/client'
import type { StoredEvent } from '@/platform/event-store/event-store'
import type { PersonalDataContributor } from '@/platform/privacy/privacy'
import type { ProjectionRunner } from '@/platform/projection/projection'
import { achievementProjection } from './infrastructure/achievement-projection'
import { achievements, gamePlayers } from './infrastructure/schema'

/** Vérifie si un événement concerne les succès du joueur supprimé. */
function belongsToPlayer(event: StoredEvent, playerId: string): boolean {
  if (event.stream === `${VILLAGE_CHANNEL_PREFIX}${playerId}`) {
    return event.type === 'VillageFounded' || event.type === 'BuildingUpgraded'
  }

  if (!event.stream.startsWith(GAME_CHANNEL_PREFIX)) return false

  if (event.type === 'GameCreated') {
    return event.data.hostId === playerId
  }

  if (event.type === 'PlayerJoined') {
    return event.data.playerId === playerId
  }

  return false
}

/** Export et effacement des données personnelles des Chroniques. */
export function createChroniclePersonalData(
  db: Db,
  projections: ProjectionRunner,
): PersonalDataContributor {
  return {
    name: 'chronicle',

    async export(playerId) {
      await projections.catchUp(achievementProjection)

      return db
        .select({
          achievementId: achievements.achievementId,
          obtainedAt: achievements.obtainedAt,
        })
        .from(achievements)
        .where(eq(achievements.playerId, playerId))
    },

    // Marque les événements du joueur supprimé.
    // Une reconstruction ne devra plus lui attribuer de succès.
    redact(event, playerId) {
      if (!belongsToPlayer(event, playerId)) return null
      if (event.data.chronicleErased === true) return null

      return { ...event.data, chronicleErased: true }
    },

    async erase(playerId) {
      await projections.catchUp(achievementProjection)

      await db.delete(gamePlayers).where(eq(gamePlayers.playerId, playerId))
      await db.delete(achievements).where(eq(achievements.playerId, playerId))
    },
  }
}
