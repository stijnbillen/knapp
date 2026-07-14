import { speak, speechAvailable } from '../core/speech'
import { BigButton } from './BigButton'

/** Voorleesknop: leest de tekst voor via de Web Speech API (standaard nl-BE/nl-NL). */
export function ReadAloudButton({ text, lang }: { text: string; lang?: string }) {
  if (!speechAvailable()) return null
  return (
    <BigButton variant="soft" onClick={() => speak(text, lang)} aria-label="Lees voor">
      🔊
    </BigButton>
  )
}
