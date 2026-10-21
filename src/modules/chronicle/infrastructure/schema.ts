import { bigint, pgSchema, primaryKey, text } from 'drizzle-orm/pg-core'

/** Schéma PostgreSQL des Chroniques. */
export const chronicle = pgSchema('chronicle')

/** Distinctions obtenues par les joueurs. */
export const achievements = chronicle.table(
  'achievements',
  {
    playerId: text('player_id').notNull(),
    achievementId: text('achievement_id').notNull(),
    obtainedAt: bigint('obtained_at', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.achievementId] })],
)

/** Participants humains d'une expédition, conservés jusqu'à sa fin. */
export const gamePlayers = chronicle.table(
  'game_players',
  {
    gameId: text('game_id').notNull(),
    playerId: text('player_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.playerId] })],
)
