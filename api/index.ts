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
  'dazn',
  'dazn-laliga',
  'laliga-tv',
  'laliga-tv-2',
  'laliga-plus',
  'movistar-vamos',
  'movistar-deportes',
  'movistar-deportes-2',
  'movistar-champions',
  'movistar-plus',
  'rtve',
]);

/**
 * Mapeo de nombres de canales a nombres de archivo de logo
 */
const logoMap: Record<string, string> = {
  // DAZN
  DAZN: 'dazn',
  'DAZN 1': 'dazn-1',
  'DAZN 1 Bar': 'dazn-1',
  'DAZN 2': 'dazn-2',
  'DAZN App Gratis': 'dazn',
  'DAZN Baloncesto': 'dazn',
  'DAZN Baloncesto 2': 'dazn',
  'DAZN LaLiga': 'dazn-laliga',
  // MOVISTAR+
  'M+ Deportes': 'movistar-deportes',
  'M+ Deportes 2': 'movistar-deportes-2',
  'M+ Liga de Campeones': 'movistar-champions',
  'M+ Vamos': 'movistar-vamos',
  'M+ Vamos 2': 'movistar-vamos',
  'M+ #Vamos Bar': 'movistar-vamos',
  'M+ #Vamos Bar 2': 'movistar-vamos',
  'M+ LALIGA': 'movistar-laliga',
  'Movistar Plus+ : VER PARTIDO': 'movistar-plus',
  'Movistar+ Lite': 'movistar-plus',
  'M+ Golf': 'movistar-golf',
  // LALIGA
  'LaLiga TV Bar': 'laliga-tv',
  'LaLiga TV M2': 'laliga-tv-2',
  'LaLiga+ Plus': 'laliga-plus',
  // NBA
  'NBA League Pass': 'nba-league-pass',
  // RTVE
  'RTVE Play': 'rtve',
  Teledeporte: 'teledeporte',
  // EUROSPORT
  'Eurosport 1': 'eurosport-1',
  'Eurosport 2': 'eurosport-2',
  // REGIONALES
  'Navarra TV': 'navarra-tv',
  // OTROS
  'Courtside 1891': 'courtside-1891',
  Hellotickets: 'hellotickets',
  OneFootball: 'onefootball',
};

function getLogoPath(channelName: string): string | null {
  const filename = logoMap[channelName];
  if (!filename) return null;
  if (!availableLogos.has(filename)) return null;
  return `/logos/${filename}.webp`;
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
