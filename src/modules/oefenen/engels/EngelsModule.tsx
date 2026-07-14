import type { ModuleProps } from '../../../core/registry'
import { TaalModule } from '../taal/TaalModule'
import type { WoordPaar } from '../taal/TaalModule'
import WOORDEN from './engels-woorden.json'

const woorden: WoordPaar[] = (WOORDEN as { nl: string; en: string; emoji: string }[]).map((w) => ({
  nl: w.nl,
  doel: w.en,
  emoji: w.emoji,
}))

export function EngelsModule({ profile, onExit }: ModuleProps) {
  return (
    <TaalModule
      profile={profile}
      onExit={onExit}
      moduleId="engels"
      lang="en"
      title="Eerste les Engels"
      taalNaam="Engels"
      woorden={woorden}
    />
  )
}
