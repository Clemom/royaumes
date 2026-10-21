import type { Achievement } from '../contracts'

/**
 * Port de lecture des Chroniques.
 * Permet de consulter les distinctions d'un joueur.
 */
export interface AchievementReader {
  forPlayer(playerId: string): Promise<Achievement[]>
}
