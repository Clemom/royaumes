'use client'

import { hc } from 'hono/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChannel } from '@/platform/realtime/use-channel'
import { Notification } from '@/ui/notification'
import type { ChronicleApi } from './api'
import { ACHIEVEMENTS, type Achievement, type AchievementId, CHRONICLE_CHANNEL } from './contracts'

/** Client HTTP du module Chroniques. */
const client = hc<ChronicleApi>('/api/chronicle')

/** Affiche les distinctions obtenues et celles qui restent à débloquer. */
export function ChronicleScreen() {
  const [achievements, setAchievements] = useState<Achievement[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await client.achievements.$get()
        if (!res.ok) throw new Error('Erreur de chargement')

        const data = await res.json()
        setAchievements(data.achievements)
      } catch {
        setError(true)
      }
    }

    load()
  }, [])

  return (
    <>
      <h1>Vos succès</h1>

      <section className="panel" aria-label="Distinctions du joueur">
        {error && <p>Impossible de charger les distinctions.</p>}

        {!error && achievements === null && <p className="muted">Chargement des distinctions...</p>}

        {achievements !== null && (
          <>
            <p className="muted">
              {achievements.length} distinction(s) sur {ACHIEVEMENTS.length} débloquée(s).
            </p>

            <table className="ranking">
              <thead>
                <tr>
                  <th>Distinction</th>
                  <th>Objectif</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {ACHIEVEMENTS.map((item) => {
                  const obtained = achievements.find((a) => a.id === item.id)

                  return (
                    <tr key={item.id} style={{ opacity: obtained ? 1 : 0.5 }}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.description}</td>
                      <td>
                        {obtained
                          ? `Obtenue le ${new Date(obtained.obtainedAt).toLocaleDateString('fr-FR')}`
                          : 'À débloquer'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  )
}

/** Affiche une notification lorsqu'un joueur débloque un succès. */
export function ChronicleNotification() {
  const knownIds = useRef<Set<AchievementId> | null>(null)
  const [notifications, setNotifications] = useState<AchievementId[]>([])

  // Relit les succès du joueur connecté.
  const refresh = useCallback(async () => {
    try {
      const res = await client.achievements.$get()
      if (!res.ok) return

      const { achievements } = await res.json()

      const currentIds = new Set<AchievementId>(achievements.map((achievement) => achievement.id))

      const previousIds = knownIds.current

      // La première lecture sert de référence : pas de notification
      // pour les succès obtenus avant l'ouverture du jeu.
      if (previousIds !== null) {
        const unlocked = achievements
          .filter((achievement) => !previousIds.has(achievement.id))
          .map((achievement) => achievement.id)

        if (unlocked.length > 0) {
          setNotifications((current) => [...current, ...unlocked])
        }
      }

      knownIds.current = currentIds
    } catch {
      // Une erreur réseau ne doit pas bloquer le jeu.
    }
  }, [])

  // Charge les succès déjà obtenus.
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Écoute les événements susceptibles de débloquer un succès.
  useChannel(CHRONICLE_CHANNEL, () => {
    void refresh()
  })

  const currentId = notifications[0]
  const achievement = ACHIEVEMENTS.find((item) => item.id === currentId)

  // Affiche chaque notification pendant 5 secondes.
  useEffect(() => {
    if (!currentId) return

    const timer = setTimeout(() => {
      setNotifications((current) => current.slice(1))
    }, 5000)

    return () => clearTimeout(timer)
  }, [currentId])

  if (!achievement) return null

  return (
    <Notification
      title="Succès débloqué !"
      message={`Tu as obtenu la distinction ${achievement.name}.`}
      onClose={() => setNotifications((current) => current.slice(1))}
    />
  )
}
