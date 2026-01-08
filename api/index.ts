/**
 * EPG Sports API - Hono Application
 *
 * Endpoints:
 * - GET /api          - API info
 * - GET /api/health   - Health check
 * - GET /api/matches  - Partidos sin enlaces
 * - GET /api/events   - Partidos con enlaces de streaming
 * - GET /api/channels - Canales con logos y enlaces AceStream
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import { getLogoPath } from "../src/logoMap";

// Tipos
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

// Importar datos
// @ts-ignore - JSON imports
import allMatchesData from "../data/allMatches.json";
// @ts-ignore - JSON imports  
import updatedMatchesData from "../data/updatedMatches.json";
// @ts-ignore - JSON imports
import channelsData from "../data/updatedChannels.json";

const allMatches = allMatchesData as AllMatchesData;
const updatedMatches = updatedMatchesData as Match[];
const channels = channelsData as ChannelsData;

// Crear app Hono
const app = new Hono().basePath("/api");

// CORS middleware
app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "OPTIONS"],
  allowHeaders: ["Content-Type", "Accept"],
}));

// GET /api - API info
app.get("/", (c) => {
  return c.json({
    name: "EPG Sports API",
    version: "1.0.0",
    description: "API de programacion deportiva con enlaces AceStream",
    endpoints: {
      "GET /api": "Informacion de la API",
      "GET /api/health": "Estado del servicio",
      "GET /api/matches": "Partidos programados (sin enlaces)",
      "GET /api/events": "Eventos con enlaces de streaming",
      "GET /api/channels": "Canales con logos y enlaces AceStream",
    },
    source: "futbolenlatv.es",
    repository: "https://github.com/usuario/epg-sports",
    lastUpdated: channels.lastUpdated,
  });
});

// GET /api/health - Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    data: {
      totalMatches: allMatches.matches?.length ?? 0,
      totalEvents: Array.isArray(updatedMatches) ? updatedMatches.length : 0,
      totalChannels: channels.totalChannels,
    },
  });
});

// GET /api/matches - Partidos sin enlaces
app.get("/matches", (c) => {
  return c.json(allMatches);
});

// GET /api/events - Partidos con enlaces de streaming
app.get("/events", (c) => {
  return c.json({
    events: updatedMatches,
    totalEvents: Array.isArray(updatedMatches) ? updatedMatches.length : 0,
    lastUpdated: channels.lastUpdated,
  });
});

// GET /api/channels - Canales con logos
app.get("/channels", (c) => {
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
      error: "Not Found",
      message: `Endpoint ${c.req.path} not found`,
      availableEndpoints: ["/api", "/api/health", "/api/matches", "/api/events", "/api/channels"],
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
    },
    500
  );
});

// Export para Vercel
export default handle(app);

// Export para desarrollo local con Bun
export { app };
