export interface PlaytimeGrant {
  moduleId: string
  profileId: string
  minutes: number
  startedAt: number // epoch ms
}

/**
 * TODO(Fase 2): start een echte countdown voor deze grant. Bij het verlopen
 * ervan moet het draaiende spel-onderdeel hierover ingelicht worden zodat het
 * kan afronden op zijn eigen natuurlijk stoppunt (huidig rondje/game-over)
 * voor de app forceert met onExit(). Vereist kleine samenwerking in elk van
 * de spelmodules onder src/modules/spelen/**. Voorlopig enkel een naad: geen
 * countdown, geen geforceerde afsluiting.
 */
export function startPlaytimeGrant(_grant: PlaytimeGrant): void {
  // no-op in Fase 1
}
