/**
 * EPG Sports API - Hono Application for Vercel
 *
 * Este archivo es AUTO-CONTENIDO para el despliegue en Vercel.
 * No importa otros archivos .ts del proyecto para evitar problemas de módulos.
 *
 * Endpoints:
 * - GET /api          - API info
 * - GET /api/health   - Health check
 * - GET /api/matches  - Partidos sin enlaces
 * - GET /api/events   - Partidos con enlaces de streaming
 * - GET /api/channels - Canales con logos y enlaces AceStream
 */

import { handle } from '@hono/node-server/vercel';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ============================================================
// LOGO MAPPING (inline para evitar problemas de módulos en Vercel)
// ============================================================

/**
 * Lista de logos disponibles localmente.
 * SINCRONIZADO con api/logoMap.ts por scripts/download-logos.ts
 */
const availableLogos = new Set([
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
]);

/**
 * URL base del repositorio tv-logo/tv-logos en GitHub
 */
const TV_LOGOS_BASE = 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/';

interface LogoSource {
  primary: string | null;
  fallback?: string;
  local: string;
}

/**
 * Mapeo de nombres de canales a fuentes de logo
 */
const logoMap: Record<string, LogoSource> = {
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

function getLogoExternalPath(channelName: string): string | null {
  const mapping = logoMap[channelName];
  if (!mapping) return null;

  if (mapping.primary) {
    return `${TV_LOGOS_BASE}${mapping.primary}`;
  }

  return mapping.fallback ?? null;
}

function getLogoPath(channelName: string): string | null {
  const mapping = logoMap[channelName];
  if (!mapping) return null;

  if (availableLogos.has(mapping.local)) {
    return `/logos/${mapping.local}.webp`;
  }

  return getLogoExternalPath(channelName);
}

// ============================================================
// TYPES
// ============================================================

interface Channel {
  name: string;
  links: string[];
}

interface ChannelsData {
  channels: Channel[];
  totalChannels: number;
  lastUpdated: string;
}

interface Match {
  sport: string;
  date: {
    hour: string;
    day: string;
    zone: string;
  };
  details: {
    competition: string | null;
    round: string | null;
  };
  teams: {
    local: { name: string; image: string };
    visitor: { name: string; image: string };
  } | null;
  channels: string[];
  event: Record<string, unknown>;
  eventType: string;
}

interface AllMatchesData {
  matches: Match[];
}

// ============================================================
// DATA IMPORTS
// ============================================================

import allMatchesData from '../data/allMatches.json' with { type: 'json' };
import updatedMatchesData from '../data/updatedMatches.json' with { type: 'json' };
import channelsData from '../data/updatedChannels.json' with { type: 'json' };

const allMatches = allMatchesData as AllMatchesData;
const updatedMatches = updatedMatchesData as Match[];
const channels = channelsData as ChannelsData;

// ============================================================
// APP
// ============================================================

const app = new Hono().basePath('/api');

// CORS middleware
app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Accept'],
  })
);

// GET /api - API info
app.get('/', (c) => {
  return c.json({
    name: 'EPG Sports API',
    version: '1.0.0',
    description: 'API de programacion deportiva con enlaces AceStream',
    endpoints: {
      'GET /api': 'Informacion de la API',
      'GET /api/health': 'Estado del servicio',
      'GET /api/matches': 'Partidos programados (sin enlaces)',
      'GET /api/events': 'Eventos con enlaces de streaming',
      'GET /api/channels': 'Canales con logos y enlaces AceStream',
    },
    source: 'futbolenlatv.es',
    repository: 'https://github.com/usuario/epg-sports',
    lastUpdated: channels.lastUpdated,
  });
});

// GET /api/health - Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    data: {
      totalMatches: allMatches.matches?.length ?? 0,
      totalEvents: Array.isArray(updatedMatches) ? updatedMatches.length : 0,
      totalChannels: channels.totalChannels,
    },
  });
});

// GET /api/matches - Partidos sin enlaces
app.get('/matches', (c) => {
  return c.json(allMatches);
});

// GET /api/events - Partidos con enlaces de streaming
app.get('/events', (c) => {
  return c.json({
    events: updatedMatches,
    totalEvents: Array.isArray(updatedMatches) ? updatedMatches.length : 0,
    lastUpdated: channels.lastUpdated,
  });
});

// GET /api/channels - Canales con logos
app.get('/channels', (c) => {
  const channelsWithLogos = channels.channels.map((channel) => ({
    name: channel.name,
    logo: getLogoPath(channel.name),
    logoExternal: getLogoExternalPath(channel.name),
    links: channel.links,
  }));

  return c.json({
    channels: channelsWithLogos,
    totalChannels: channels.totalChannels,
    lastUpdated: channels.lastUpdated,
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Endpoint ${c.req.path} not found`,
      availableEndpoints: ['/api', '/api/health', '/api/matches', '/api/events', '/api/channels'],
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

// Export para Vercel
export default handle(app);
