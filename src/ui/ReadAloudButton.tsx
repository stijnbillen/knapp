import { speak, speechAvailable } from '../core/speech'
import { BigButton } from './BigButton'

/** Voorleesknop: leest de tekst voor via de Web Speech API (nl-BE/nl-NL). */
export function ReadAloudButton({ text }: { text: string }) {
  if (!speechAvailable()) return null
  return (
    <BigButton variant="soft" onClick={() => speak(text)} aria-label="Lees voor">
      🔊
    </BigButton>
  )
}
