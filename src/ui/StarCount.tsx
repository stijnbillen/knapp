import { useSyncExternalStore } from 'react'
import { getProgress, subscribeProgress } from '../core/progress'

export function useStars(profileId: string): number {
  return useSyncExternalStore(subscribeProgress, () => getProgress(profileId).stars)
}

export function StarCount({ profileId }: { profileId: string }) {
  const stars = useStars(profileId)
  return (
    <span className="star-count" aria-label={`${stars} sterren`}>
      ⭐ {stars}
    </span>
  )
}
