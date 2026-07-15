// Voorleesfunctie via de Web Speech API. Standaard Nederlands (voorkeur
// nl-BE, valt terug op nl-NL of een andere Nederlandse stem); voor andere
// talen (bv. 'en') wordt de eerste stem met die taalprefix gebruikt. Doet
// niets als de API ontbreekt.

// Voorkeursvolgorde van specifieke taal/regio-varianten per taalcode: sommige
// toestellen registreren hun stem als "es-ES", andere als "es-MX" of "es-419".
// We proberen ze op volgorde en vallen pas als laatste terug op eender welke
// stem die met de taalcode begint.
const VOICE_VOORKEUR: Record<string, string[]> = {
  nl: ['nl-be', 'nl-nl'],
  en: ['en-gb', 'en-us'],
  es: ['es-es', 'es-419', 'es-mx', 'es-us'],
  fr: ['fr-fr', 'fr-be'],
}

const cachedVoices: Record<string, SpeechSynthesisVoice | null | undefined> = {}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (cachedVoices[lang] !== undefined) return cachedVoices[lang]!
  if (typeof speechSynthesis === 'undefined') {
    cachedVoices[lang] = null
    return null
  }
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null // nog niet geladen; niet cachen
  const voorkeur = VOICE_VOORKEUR[lang] ?? []
  let found: SpeechSynthesisVoice | null = null
  for (const prefix of voorkeur) {
    found = voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null
    if (found) break
  }
  if (!found) found = voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null
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

/** Volledige BCP-47-code (bv. "es-ES") als fallback wanneer er geen stem gevonden is. */
function volledigeTaalcode(lang: string): string {
  const voorkeur = VOICE_VOORKEUR[lang]?.[0]
  if (!voorkeur) return lang
  const [taal, regio] = voorkeur.split('-')
  return regio ? `${taal}-${regio.toUpperCase()}` : taal
}

export function speak(text: string, lang: string = 'nl'): void {
  if (!speechAvailable()) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(lang)
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? volledigeTaalcode(lang)
  utterance.rate = 0.9 // iets trager voor kinderen
  speechSynthesis.speak(utterance)
}
