/** Les quatre distinctions du jeu. */
export type AchievementId = 'founder' | 'builder' | 'explorer' | 'conqueror'

/** Une distinction obtenue par un joueur. */
export interface Achievement {
  id: AchievementId
  obtainedAt: number
}

/** Actions du jeu pouvant débloquer une distinction. */
export type AchievementTrigger =
  | { type: 'VillageFounded' }
  | { type: 'BuildingUpgraded' }
  | { type: 'GameCreated' }
  | { type: 'GameEnded'; result: 'won' | 'lost'; human: boolean }

/**
 * Détermine si une action débloque une nouvelle distinction.
 * Une distinction déjà obtenue ne peut pas être attribuée une seconde fois.
 */
export function unlock(
  owned: AchievementId[],
  trigger: AchievementTrigger,
  at: number,
): Achievement | null {
  let id: AchievementId | null = null

  switch (trigger.type) {
    case 'VillageFounded':
      id = 'founder'
      break

    case 'BuildingUpgraded':
      id = 'builder'
      break

    case 'GameCreated':
      id = 'explorer'
      break

    case 'GameEnded':
      if (trigger.result === 'won' && trigger.human) {
        id = 'conqueror'
      }
      break
  }

  if (id === null || owned.includes(id)) {
    return null
  }

  return { id, obtainedAt: at }
}
