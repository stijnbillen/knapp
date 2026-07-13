import { useEffect, useState } from 'react'

/**
 * Korte steranimatie over het hele scherm. Render met een oplopende `trigger`
 * (bv. teller van juiste antwoorden); elke wijziging speelt de animatie af.
 */
export function StarBurst({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 900)
    return () => clearTimeout(timer)
  }, [trigger])

  if (!visible) return null
  return (
    <div className="star-burst" aria-hidden="true">
      <span className="star-burst__star" key={trigger}>
        ⭐
      </span>
    </div>
  )
}
