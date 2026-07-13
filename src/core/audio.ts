import { getSettings } from './settings'

// Alle geluidjes worden gesynthetiseerd met WebAudio: geen audiobestanden
// nodig, dus ook niets te downloaden of te precachen.

let ctx: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOptions {
  freq: number
  duration: number // seconden
  delay?: number // seconden na nu
  type?: OscillatorType
  volume?: number
}

function tone({ freq, duration, delay = 0, type = 'sine', volume = 0.15 }: ToneOptions): void {
  if (!getSettings().soundOn) return
  const ac = audioContext()
  if (!ac) return
  const start = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration)
}

/** Vrolijk stijgend deuntje bij een juist antwoord. */
export function playCorrect(): void {
  tone({ freq: 523.25, duration: 0.15 }) // C5
  tone({ freq: 659.25, duration: 0.15, delay: 0.1 }) // E5
  tone({ freq: 783.99, duration: 0.25, delay: 0.2 }) // G5
}

/** Zacht, niet-straffend geluidje bij een fout antwoord. */
export function playWrong(): void {
  tone({ freq: 330, duration: 0.2, type: 'triangle', volume: 0.1 })
  tone({ freq: 294, duration: 0.3, delay: 0.15, type: 'triangle', volume: 0.1 })
}

/** Kort "pop"-geluidje (bubbels, tikken). */
export function playPop(): void {
  tone({ freq: 880, duration: 0.08, type: 'square', volume: 0.08 })
}

/** Extra feestelijk geluidje (ster verdiend, spel gewonnen). */
export function playStar(): void {
  tone({ freq: 659.25, duration: 0.12 })
  tone({ freq: 783.99, duration: 0.12, delay: 0.08 })
  tone({ freq: 987.77, duration: 0.12, delay: 0.16 })
  tone({ freq: 1318.5, duration: 0.3, delay: 0.24 })
}

/** Kort klikje voor knoppen/zetten. */
export function playClick(): void {
  tone({ freq: 600, duration: 0.05, type: 'square', volume: 0.05 })
}
