import { eq } from 'drizzle-orm'
import type { Db } from '@/platform/db/client'
import type { ProjectionRunner } from '@/platform/projection/projection'
import type { AchievementReader } from '../application/achievement-reader'
import type { AchievementId } from '../contracts'
import { achievementProjection } from './achievement-projection'
import { achievements } from './schema'

/** Lecture des distinctions d'un joueur depuis la base de données. */
export function createDrizzleAchievementReader(
  db: Db,
  projections: ProjectionRunner,
): AchievementReader {
  return {
    async forPlayer(playerId) {
      // Met la projection à jour avant de lire les distinctions.
      await projections.catchUp(achievementProjection)

      const rows = await db.select().from(achievements).where(eq(achievements.playerId, playerId))

      return rows.map((row) => ({
        id: row.achievementId as AchievementId,
        obtainedAt: row.obtainedAt,
      }))
    },
  }
}
