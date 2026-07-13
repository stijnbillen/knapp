// Voorleesfunctie via de Web Speech API. Voorkeur voor nl-BE, valt terug op
// nl-NL of een andere Nederlandse stem. Doet niets als de API ontbreekt.

let cachedVoice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice
  if (typeof speechSynthesis === 'undefined') {
    cachedVoice = null
    return null
  }
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null // nog niet geladen; niet cachen
  cachedVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith('nl-be')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('nl-nl')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('nl')) ??
    null
  return cachedVoice
}

// Stemmen laden vaak asynchroon; cache verversen zodra ze binnenkomen.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = undefined
  })
}

export function speechAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined'
}

export function speak(text: string): void {
  if (!speechAvailable()) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'nl-BE'
  utterance.rate = 0.9 // iets trager voor kinderen
  speechSynthesis.speak(utterance)
}
