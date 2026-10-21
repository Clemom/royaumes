import type { Db } from '@/platform/db/client'
import type { ProjectionRunner } from '@/platform/projection/projection'
import type { ChannelPolicy } from '@/platform/realtime/channel-policy'
import { createChronicleApi } from './api'
import { CHRONICLE_CHANNEL } from './contracts'
import { achievementProjection } from './infrastructure/achievement-projection'
import { createDrizzleAchievementReader } from './infrastructure/drizzle-achievement-reader'
import { createChroniclePersonalData } from './personal-data'

export interface ChronicleModuleDeps {
  db: Db
  projections: ProjectionRunner
}

/** Assemble les composants du module Chroniques. */
export function createChronicleModule({ db, projections }: ChronicleModuleDeps) {
  const reader = createDrizzleAchievementReader(db, projections)

  // Comme pour le Classement, le canal annonce les événements
  // sans transmettre leurs données aux joueurs.
  const channelPolicy: ChannelPolicy = {
    prefix: CHRONICLE_CHANNEL,
    canSubscribe: (channel) => channel === CHRONICLE_CHANNEL,
    redact: true,
    global: { types: achievementProjection.eventTypes },
  }

  return {
    api: createChronicleApi(reader),
    channelPolicy,
    personalData: createChroniclePersonalData(db, projections),
  }
}

export type { ChronicleApi } from './api'
