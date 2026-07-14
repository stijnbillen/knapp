import type { ModuleProps } from '../../../core/registry'
import { TaalModule } from '../taal/TaalModule'
import type { WoordPaar } from '../taal/TaalModule'
import WOORDEN from './spaans-woorden.json'

const woorden: WoordPaar[] = (WOORDEN as { nl: string; es: string; emoji: string }[]).map((w) => ({
  nl: w.nl,
  doel: w.es,
  emoji: w.emoji,
}))

export function SpaansModule({ profile, onExit }: ModuleProps) {
  return (
    <TaalModule
      profile={profile}
      onExit={onExit}
      moduleId="spaans"
      lang="es"
      title="Eerste les Spaans"
      taalNaam="Spaans"
      woorden={woorden}
    />
  )
}
