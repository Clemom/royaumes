import type { Db } from '@/platform/db/client'
import type { ProjectionRunner } from '@/platform/projection/projection'
import { createChronicleApi } from './api'
import { createDrizzleAchievementReader } from './infrastructure/drizzle-achievement-reader'
import { createChroniclePersonalData } from './personal-data'

export interface ChronicleModuleDeps {
  db: Db
  projections: ProjectionRunner
}

/** Assemble les différentes parties du module Chroniques. */
export function createChronicleModule({ db, projections }: ChronicleModuleDeps) {
  const reader = createDrizzleAchievementReader(db, projections)

  return {
    api: createChronicleApi(reader),
    personalData: createChroniclePersonalData(db, projections),
  }
}

export type { ChronicleApi } from './api'
