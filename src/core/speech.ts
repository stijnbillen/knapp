// Voorleesfunctie via de Web Speech API. Standaard Nederlands (voorkeur
// nl-BE, valt terug op nl-NL of een andere Nederlandse stem); voor andere
// talen (bv. 'en') wordt de eerste stem met die taalprefix gebruikt. Doet
// niets als de API ontbreekt.

const cachedVoices: Record<string, SpeechSynthesisVoice | null | undefined> = {}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (cachedVoices[lang] !== undefined) return cachedVoices[lang]!
  if (typeof speechSynthesis === 'undefined') {
    cachedVoices[lang] = null
    return null
  }
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null // nog niet geladen; niet cachen
  const found =
    lang === 'nl'
      ? (voices.find((v) => v.lang.toLowerCase().startsWith('nl-be')) ??
        voices.find((v) => v.lang.toLowerCase().startsWith('nl-nl')) ??
        voices.find((v) => v.lang.toLowerCase().startsWith('nl')) ??
        null)
      : (voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null)
  cachedVoices[lang] = found
  return found
}

// Stemmen laden vaak asynchroon; cache verversen zodra ze binnenkomen.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    for (const key of Object.keys(cachedVoices)) delete cachedVoices[key]
  })
}

export function speechAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined'
}

export function speak(text: string, lang: string = 'nl'): void {
  if (!speechAvailable()) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(lang)
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? (lang === 'nl' ? 'nl-BE' : lang)
  utterance.rate = 0.9 // iets trager voor kinderen
  speechSynthesis.speak(utterance)
}
