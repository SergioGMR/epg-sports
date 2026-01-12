/**
 * Mapeo de nombres de canales a archivos de logos
 *
 * Este archivo es usado tanto por api/index.ts (Vercel) como por dev-server.ts (local).
 *
 * IMPORTANTE: El array `availableLogos` se actualiza automáticamente por
 * scripts/download-logos.ts cuando se descargan nuevos logos.
 *
 * primary: Path relativo en tv-logo/tv-logos repo
 * fallback: URL alternativa si primary no está disponible
 * local: Nombre del archivo local (sin extensión .webp)
 */

export interface LogoSource {
  primary: string | null;
  fallback?: string;
  local: string;
}

export const logoMap: Record<string, LogoSource> = {
  // ============ DAZN ============
  DAZN: {
    primary: 'countries/spain/dazn-es.png',
    local: 'dazn',
  },
  'DAZN 1': {
    primary: 'countries/spain/dazn-1-es.png',
    local: 'dazn-1',
  },
  'DAZN 1 Bar': {
    primary: 'countries/spain/dazn-1-es.png',
    local: 'dazn-1',
  },
  'DAZN 2': {
    primary: 'countries/spain/dazn-2-es.png',
    local: 'dazn-2',
  },
  'DAZN App Gratis': {
    primary: 'countries/spain/dazn-es.png',
    local: 'dazn',
  },
  'DAZN Baloncesto': {
    primary: 'countries/spain/dazn-es.png',
    local: 'dazn',
  },
  'DAZN Baloncesto 2': {
    primary: 'countries/spain/dazn-es.png',
    local: 'dazn',
  },
  'DAZN Baloncesto 3': {
    primary: 'countries/spain/dazn-3-es.png',
    local: 'dazn-3',
  },
  'DAZN LaLiga': {
    primary: 'countries/spain/dazn-laliga-es.png',
    local: 'dazn-laliga',
  },

  // ============ MOVISTAR+ ============
  'M+ Deportes': {
    primary: 'countries/spain/deportes-por-movistar-plus-es.png',
    local: 'movistar-deportes',
  },
  'M+ Deportes 2': {
    primary: 'countries/spain/deportes-2-por-movistar-plus-es.png',
    local: 'movistar-deportes-2',
  },
  'M+ Liga de Campeones': {
    primary: 'countries/spain/liga-de-campeones-por-movistar-plus-es.png',
    local: 'movistar-champions',
  },
  'M+ Vamos': {
    primary: 'countries/spain/vamos-por-movistar-plus-es.png',
    local: 'movistar-vamos',
  },
  'M+ Vamos 2': {
    primary: 'countries/spain/vamos-por-movistar-plus-es.png',
    local: 'movistar-vamos',
  },
  'M+ #Vamos Bar': {
    primary: 'countries/spain/vamos-por-movistar-plus-es.png',
    local: 'movistar-vamos',
  },
  'M+ #Vamos Bar 2': {
    primary: 'countries/spain/vamos-por-movistar-plus-es.png',
    local: 'movistar-vamos',
  },
  'M+ LALIGA': {
    primary: 'countries/spain/laliga-tv-por-movistar-plus-es.png',
    local: 'movistar-laliga',
  },
  'M+ LALIGA HDR': {
    primary: 'countries/spain/laliga-hdr-por-movistar-plus-es.png',
    local: 'movistar-laliga-hdr',
  },
  'Movistar Plus+ : VER PARTIDO': {
    primary: 'countries/spain/movistar-plus-es.png',
    local: 'movistar-plus',
  },
  'Movistar+ Lite': {
    primary: 'countries/spain/movistar-plus-es.png',
    local: 'movistar-plus',
  },
  'M+ Golf': {
    primary: 'countries/spain/golf-por-movistar-plus-es.png',
    local: 'movistar-golf',
  },

  // ============ LALIGA ============
  'LaLiga TV Bar': {
    primary: 'countries/spain/laliga-tv-por-movistar-plus-es.png',
    local: 'laliga-tv',
  },
  'LaLiga TV M2': {
    primary: 'countries/spain/laliga-tv-2-por-movistar-plus-es.png',
    local: 'laliga-tv-2',
  },
  'LaLiga TV M3': {
    primary: 'countries/spain/laliga-tv-3-por-movistar-plus-es.png',
    local: 'laliga-tv-3',
  },
  'LALIGA TV Hypermotion : VER PARTIDO': {
    primary: 'countries/spain/laliga-tv-hypermotion-es.png',
    local: 'laliga-tv-hypermotion',
  },
  'LaLiga+ Plus': {
    primary: null,
    fallback: 'https://assets.laliga.com/assets/logos/laliga-v/laliga-v-300x300.png',
    local: 'laliga-plus',
  },

  // ============ NBA ============
  'NBA League Pass': {
    primary: 'countries/united-states/nba-league-pass-us.png',
    local: 'nba-league-pass',
  },

  // ============ RTVE ============
  'RTVE Play': {
    primary: 'countries/spain/tve-1-es.png',
    local: 'rtve',
  },
  Teledeporte: {
    primary: 'countries/spain/tdp-es.png',
    fallback: 'https://img2.rtve.es/css/rtve.commons/rtve.header.footer/i/logoTDP.png',
    local: 'teledeporte',
  },

  // ============ GENERALISTAS ============
  Cuatro: {
    primary: 'countries/spain/cuatro-es.png',
    local: 'cuatro',
  },

  // ============ EUROSPORT ============
  'Eurosport 1': {
    primary: 'countries/spain/eurosport-1-es.png',
    local: 'eurosport-1',
  },
  'Eurosport 2': {
    primary: 'countries/spain/eurosport-2-es.png',
    local: 'eurosport-2',
  },

  // ============ REGIONALES ============
  'Navarra TV': {
    primary: 'countries/spain/navarra-television-es.png',
    local: 'navarra-tv',
  },

  // ============ CANALES SIN LOGO EN TV-LOGOS ============
  'Courtside 1891': {
    primary: null,
    fallback:
      'https://www.courtside1891.basketball/resources/v1.28.1/i/elements/pwa/manifest-icon-512.png',
    local: 'courtside-1891',
  },
  'FIFA+': {
    primary: null,
    fallback: 'https://www.plus.fifa.com/favicon/apple-touch-icon.png',
    local: 'fifa-plus',
  },
  Hellotickets: {
    primary: null,
    fallback: 'https://static.hellotickets.com/logo/hellotickets-logo.svg',
    local: 'hellotickets',
  },
  'Mediaset Infinity': {
    primary: null,
    fallback:
      'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/aHR0cHM6Ly9kYW0uY2xvdWQubWVkaWFzZXQubmV0L20vN2NjZGZhZTY1ZDVlMzE0Mi9vcmlnaW5hbC9hcHBsZS10b3VjaC1pY29uLnBuZw/-/192/192',
    local: 'mediaset-infinity',
  },
  OneFootball: {
    primary: null,
    fallback:
      'https://play-lh.googleusercontent.com/mXog2BuRhYPqKITgx29PpfjFoqAESP3PXF96dc0UEQPz4CxD35xL3cyfw-OECqA2baiR',
    local: 'onefootball',
  },
  'OneFootball PPV': {
    primary: null,
    fallback:
      'https://play-lh.googleusercontent.com/mXog2BuRhYPqKITgx29PpfjFoqAESP3PXF96dc0UEQPz4CxD35xL3cyfw-OECqA2baiR',
    local: 'onefootball',
  },
  'RFEF.es': {
    primary: null,
    fallback:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Royal_Spanish_Football_Federation_logo.svg/330px-Royal_Spanish_Football_Federation_logo.svg.png',
    local: 'rfef',
  },
};

/**
 * URL base del repositorio tv-logo/tv-logos en GitHub
 */
export const TV_LOGOS_BASE = 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/';

/**
 * Lista de logos disponibles localmente.
 * GENERADO AUTOMATICAMENTE por scripts/download-logos.ts - NO EDITAR MANUALMENTE
 */
// AVAILABLE_LOGOS_START
const availableLogos: string[] = [
  'cuatro',
  'dazn',
  'dazn-2',
  'dazn-3',
  'fifa-plus',
  'hellotickets',
  'laliga-tv',
  'laliga-tv-hypermotion',
  'laliga-tv-2',
  'laliga-tv-3',
  'movistar-vamos',
  'movistar-laliga',
  'movistar-laliga-hdr',
  'mediaset-infinity',
  'movistar-plus',
  'nba-league-pass',
  'onefootball',
  'rfef',
  'rtve',
  'teledeporte',
];
// AVAILABLE_LOGOS_END

const availableSet = new Set<string>(availableLogos);

/**
 * Obtiene el nombre del archivo de logo para un canal
 * @param channelName Nombre del canal
 * @returns Nombre del archivo local (sin extensión) o null si no hay mapeo
 */
export function getLogoFilename(channelName: string): string | null {
  const mapping = logoMap[channelName];
  return mapping?.local ?? null;
}

/**
 * Obtiene la URL externa del logo para un canal (tv-logos o fallback).
 * @param channelName Nombre del canal
 * @returns URL externa del logo o null
 */
export function getLogoExternalPath(channelName: string): string | null {
  const mapping = logoMap[channelName];
  if (!mapping) return null;

  if (mapping.primary) {
    return `${TV_LOGOS_BASE}${mapping.primary}`;
  }

  return mapping.fallback ?? null;
}

/**
 * Obtiene la URL del logo para un canal.
 * Usa el archivo local si existe; si no, devuelve una URL externa.
 * @param channelName Nombre del canal
 * @returns Path relativo al logo (/logos/nombre.webp), URL externa o null
 */
export function getLogoPath(channelName: string): string | null {
  const mapping = logoMap[channelName];
  if (!mapping) return null;

  if (availableSet.has(mapping.local)) {
    return `/logos/${mapping.local}.webp`;
  }

  return getLogoExternalPath(channelName);
}

/**
 * Exporta la lista de logos disponibles (para uso en scripts)
 */
export function getAvailableLogos(): string[] {
  return [...availableLogos];
}
