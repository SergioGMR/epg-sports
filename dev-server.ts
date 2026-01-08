/**
 * Servidor de desarrollo local para la API
 * 
 * Ejecutar con: bun run dev-server.ts
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { getLogoPath } from "./src/logoMap";

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

// Cargar datos
const allMatchesData = await Bun.file("./data/allMatches.json").json();
const updatedMatchesData = await Bun.file("./data/updatedMatches.json").json();
const channelsData = await Bun.file("./data/updatedChannels.json").json() as ChannelsData;

// Crear app
const app = new Hono();

// Servir archivos estáticos (logos)
app.use("/logos/*", serveStatic({ root: "./public" }));

// CORS
app.use("/api/*", cors({
  origin: "*",
  allowMethods: ["GET", "OPTIONS"],
}));

// GET /api
app.get("/api", (c) => {
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
    lastUpdated: channelsData.lastUpdated,
  });
});

// GET /api/health
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    data: {
      totalMatches: allMatchesData.matches?.length ?? 0,
      totalEvents: Array.isArray(updatedMatchesData) ? updatedMatchesData.length : 0,
      totalChannels: channelsData.totalChannels,
    },
  });
});

// GET /api/matches
app.get("/api/matches", (c) => {
  return c.json(allMatchesData);
});

// GET /api/events
app.get("/api/events", (c) => {
  return c.json({
    events: updatedMatchesData,
    totalEvents: Array.isArray(updatedMatchesData) ? updatedMatchesData.length : 0,
    lastUpdated: channelsData.lastUpdated,
  });
});

// GET /api/channels
app.get("/api/channels", (c) => {
  const channelsWithLogos = channelsData.channels.map((channel) => ({
    name: channel.name,
    logo: getLogoPath(channel.name),
    links: channel.links,
  }));

  return c.json({
    channels: channelsWithLogos,
    totalChannels: channelsData.totalChannels,
    lastUpdated: channelsData.lastUpdated,
  });
});

// Root redirect
app.get("/", (c) => c.redirect("/api"));

// Start server
const port = 3000;
console.log(`\nEPG Sports API - Development Server`);
console.log(`===================================`);
console.log(`Server running at http://localhost:${port}`);
console.log(`\nEndpoints:`);
console.log(`  - http://localhost:${port}/api`);
console.log(`  - http://localhost:${port}/api/health`);
console.log(`  - http://localhost:${port}/api/matches`);
console.log(`  - http://localhost:${port}/api/events`);
console.log(`  - http://localhost:${port}/api/channels`);
console.log(`  - http://localhost:${port}/logos/{name}.webp`);
console.log(`\nPress Ctrl+C to stop\n`);

export default {
  port,
  fetch: app.fetch,
};
