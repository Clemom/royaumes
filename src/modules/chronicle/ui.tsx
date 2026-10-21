'use client'

import { hc } from 'hono/client'
import { useEffect, useState } from 'react'
import type { ChronicleApi } from './api'
import { ACHIEVEMENTS, type Achievement } from './contracts'

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
