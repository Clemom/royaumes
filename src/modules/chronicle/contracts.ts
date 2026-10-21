import type { AchievementId } from './domain/achievement'

export type { Achievement, AchievementId } from './domain/achievement'

/** Les distinctions affichées dans les Chroniques. */
export const ACHIEVEMENTS: {
  id: AchievementId
  name: string
  description: string
}[] = [
  {
    id: 'founder',
    name: 'Fondateur',
    description: 'Fonder son premier village',
  },
  {
    id: 'builder',
    name: 'Bâtisseur',
    description: 'Améliorer un bâtiment du village',
  },
  {
    id: 'explorer',
    name: 'Éclaireur',
    description: 'Ouvrir une expédition',
  },
  {
    id: 'conqueror',
    name: 'Conquérant',
    description: 'Remporter une expédition',
  },
]
