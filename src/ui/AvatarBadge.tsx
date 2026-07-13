import type { Profile } from '../core/profiles'
import { accentColor } from '../core/profiles'

export function AvatarBadge({ profile }: { profile: Profile }) {
  const color = accentColor(profile)
  return (
    <span
      className="avatar-badge"
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} 15%, white)` }}
    >
      {profile.avatar}
    </span>
  )
}
