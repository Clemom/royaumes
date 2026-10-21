'use client'

interface NotificationProps {
  title: string
  message: string
  onClose: () => void
}

/** Petite notification affichée dans le jeu. */
export function Notification({ title, message, onClose }: NotificationProps) {
  return (
    <div
      className="panel"
      role="status"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 10,
        maxWidth: 320,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>{title}</strong>
        <button type="button" onClick={onClose} aria-label="Fermer la notification">
          ×
        </button>
      </div>
      <p>{message}</p>
    </div>
  )
}
