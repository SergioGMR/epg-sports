/**
 * Script para descargar logos de canales y optimizarlos a WebP
 * 
 * Fuentes:
 * - Primaria: tv-logo/tv-logos en GitHub
 * - Fallback: URLs alternativas definidas en logoMap
 * 
 * Salida: public/logos/*.webp (256x256 max, calidad 80)
 */

import sharp from "sharp";
import { existsSync } from "fs";
import { logoMap, TV_LOGOS_BASE, type LogoSource } from "../src/logoMap";

const LOGOS_DIR = "./public/logos";
const WEBP_QUALITY = 80;
const MAX_SIZE = 256;

interface DownloadResult {
  channel: string;
  success: boolean;
  source?: "primary" | "fallback";
  error?: string;
}

/**
 * Descarga una imagen desde una URL y la convierte a WebP optimizado
 */
async function downloadAndOptimize(
  url: string,
  outputPath: string
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EPG-Sports/1.0)",
      },
    });

    if (!response.ok) {
      console.error(`  HTTP ${response.status} for ${url}`);
      return false;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image") && !url.endsWith(".png") && !url.endsWith(".svg")) {
      console.error(`  Not an image: ${contentType}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Convertir SVG a PNG primero si es necesario
    let imageBuffer = buffer;
    if (url.endsWith(".svg") || contentType.includes("svg")) {
      imageBuffer = await sharp(buffer).png().toBuffer();
    }

    await sharp(imageBuffer)
      .resize(MAX_SIZE, MAX_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  Error: ${message}`);
    return false;
  }
}

/**
 * Procesa un canal: intenta descargar de primary, luego fallback
 */
async function processChannel(
  channelName: string,
  mapping: LogoSource
): Promise<DownloadResult> {
  const outputPath = `${LOGOS_DIR}/${mapping.local}.webp`;

  // Si ya existe, saltar (para evitar re-descargas innecesarias)
  // Comentar esta línea para forzar re-descarga
  if (existsSync(outputPath)) {
    return { channel: channelName, success: true, source: "primary" };
  }

  // Intentar fuente primaria (tv-logos)
  if (mapping.primary) {
    const url = `${TV_LOGOS_BASE}${mapping.primary}`;
    console.log(`  Trying primary: ${mapping.primary}`);
    if (await downloadAndOptimize(url, outputPath)) {
      return { channel: channelName, success: true, source: "primary" };
    }
  }

  // Intentar fallback
  if (mapping.fallback) {
    console.log(`  Trying fallback: ${mapping.fallback}`);
    if (await downloadAndOptimize(mapping.fallback, outputPath)) {
      return { channel: channelName, success: true, source: "fallback" };
    }
  }

  return {
    channel: channelName,
    success: false,
    error: "No source available or all sources failed",
  };
}

async function main() {
  console.log("===========================================");
  console.log("  EPG Sports - Logo Downloader");
  console.log("===========================================\n");

  // Verificar que existe el directorio de logos
  if (!existsSync(LOGOS_DIR)) {
    console.log(`Creating directory: ${LOGOS_DIR}`);
    await Bun.write(`${LOGOS_DIR}/.gitkeep`, "");
  }

  // Leer canales actuales
  let channelNames: string[] = [];
  try {
    const channelsFile = Bun.file("./data/updatedChannels.json");
    if (await channelsFile.exists()) {
      const channelsData = await channelsFile.json();
      channelNames = channelsData.channels.map((c: { name: string }) => c.name);
      console.log(`Found ${channelNames.length} channels in updatedChannels.json\n`);
    }
  } catch (error) {
    console.warn("Could not read updatedChannels.json, using logoMap keys");
  }

  // Si no hay canales en el JSON, usar todos los del mapa
  if (channelNames.length === 0) {
    channelNames = Object.keys(logoMap);
    console.log(`Using ${channelNames.length} channels from logoMap\n`);
  }

  // Procesar logos únicos (evitar duplicados por el campo 'local')
  const processedLocals = new Set<string>();
  const results: DownloadResult[] = [];

  for (const name of channelNames) {
    const mapping = logoMap[name];

    if (!mapping) {
      console.log(`[SKIP] ${name} - No mapping defined`);
      results.push({ channel: name, success: false, error: "No mapping" });
      continue;
    }

    // Evitar descargar el mismo logo múltiples veces
    if (processedLocals.has(mapping.local)) {
      continue;
    }
    processedLocals.add(mapping.local);

    const outputPath = `${LOGOS_DIR}/${mapping.local}.webp`;
    if (existsSync(outputPath)) {
      console.log(`[OK] ${mapping.local}.webp (cached)`);
      results.push({ channel: name, success: true, source: "primary" });
      continue;
    }

    console.log(`[DOWNLOAD] ${name} -> ${mapping.local}.webp`);
    const result = await processChannel(name, mapping);
    results.push(result);

    if (result.success) {
      console.log(`  [OK] Downloaded from ${result.source}\n`);
    } else {
      console.log(`  [FAIL] ${result.error}\n`);
    }
  }

  // Resumen
  console.log("\n===========================================");
  console.log("  Summary");
  console.log("===========================================");

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed channels:");
    for (const f of failed) {
      console.log(`  - ${f.channel}: ${f.error}`);
    }
  }

  // Generar archivo de logos disponibles
  const availableLogos = [...processedLocals].filter((local) =>
    existsSync(`${LOGOS_DIR}/${local}.webp`)
  );
  
  await Bun.write(
    `${LOGOS_DIR}/available.json`,
    JSON.stringify(availableLogos, null, 2)
  );
  console.log(`\nGenerated: ${LOGOS_DIR}/available.json (${availableLogos.length} logos)`);

  console.log("\nLogo download complete!");
}

main().catch(console.error);
