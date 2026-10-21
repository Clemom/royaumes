import { Hono } from 'hono'
import type { AppEnv } from '@/platform/http/types'
import type { AchievementReader } from './application/achievement-reader'

/**
 * API des Chroniques, montée sur /api/chronicle.
 * Chaque joueur consulte uniquement ses propres distinctions.
 */
export function createChronicleApi(reader: AchievementReader) {
  return new Hono<AppEnv>().get('/achievements', async (c) => {
    const achievements = await reader.forPlayer(c.var.userId)
    return c.json({ achievements })
  })
}

/** Type de l'API, utilisé par le client de l'interface. */
export type ChronicleApi = ReturnType<typeof createChronicleApi>
