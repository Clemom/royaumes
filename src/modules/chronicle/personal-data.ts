import { eq } from 'drizzle-orm'
import type { Db } from '@/platform/db/client'
import type { PersonalDataContributor } from '@/platform/privacy/privacy'
import type { ProjectionRunner } from '@/platform/projection/projection'
import { achievementProjection } from './infrastructure/achievement-projection'
import { achievements, gamePlayers } from './infrastructure/schema'

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

    async erase(playerId) {
      // Traite les événements en attente avant de supprimer les données.
      await projections.catchUp(achievementProjection)

      await db.delete(gamePlayers).where(eq(gamePlayers.playerId, playerId))
      await db.delete(achievements).where(eq(achievements.playerId, playerId))
    },
  }
}
