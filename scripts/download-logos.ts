/**
 * Script para descargar logos de canales y optimizarlos a WebP
 *
 * Fuentes:
 * - Primaria: tv-logo/tv-logos en GitHub
 * - Fallback: URLs alternativas definidas en logoMap
 *
 * Salida:
 * - public/logos/*.webp (256x256 max, calidad 80)
 * - public/logos/available.json (lista de logos disponibles)
 * - Actualiza api/logoMap.ts y api/index.ts con la lista de logos
 */

import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { logoMap, TV_LOGOS_BASE, type LogoSource } from '../api/logoMap';

const LOGOS_DIR = './public/logos';
const WEBP_QUALITY = 80;
const MAX_SIZE = 256;

// Archivos a sincronizar
const LOGO_MAP_FILE = './api/logoMap.ts';
const API_INDEX_FILE = './api/index.ts';

interface DownloadResult {
  channel: string;
  success: boolean;
  source?: 'primary' | 'fallback';
  error?: string;
}

/**
 * Descarga una imagen desde una URL y la convierte a WebP optimizado
 */
async function downloadAndOptimize(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EPG-Sports/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`  HTTP ${response.status} for ${url}`);
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image') && !url.endsWith('.png') && !url.endsWith('.svg')) {
      console.error(`  Not an image: ${contentType}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Convertir SVG a PNG primero si es necesario
    let imageBuffer = buffer;
    if (url.endsWith('.svg') || contentType.includes('svg')) {
      imageBuffer = await sharp(buffer).png().toBuffer();
    }

    await sharp(imageBuffer)
      .resize(MAX_SIZE, MAX_SIZE, {
        fit: 'inside',
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
async function processChannel(channelName: string, mapping: LogoSource): Promise<DownloadResult> {
  const outputPath = `${LOGOS_DIR}/${mapping.local}.webp`;

  // Intentar fuente primaria (tv-logos)
  if (mapping.primary) {
    const url = `${TV_LOGOS_BASE}${mapping.primary}`;
    console.log(`  Trying primary: ${mapping.primary}`);
    if (await downloadAndOptimize(url, outputPath)) {
      return { channel: channelName, success: true, source: 'primary' };
    }
  }

  // Intentar fallback
  if (mapping.fallback) {
    console.log(`  Trying fallback: ${mapping.fallback}`);
    if (await downloadAndOptimize(mapping.fallback, outputPath)) {
      return { channel: channelName, success: true, source: 'fallback' };
    }
  }

  return {
    channel: channelName,
    success: false,
    error: 'No source available or all sources failed',
  };
}

/**
 * Actualiza el array de logos disponibles en un archivo TypeScript
 * Busca el marcador AVAILABLE_LOGOS_START/END o el Set de availableLogos
 */
function updateAvailableLogosInFile(filePath: string, logos: string[]): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const logosArrayStr = logos.map((l) => `  '${l}',`).join('\n');

    // Patrón para api/logoMap.ts (usa marcadores de comentario)
    const markerPattern = /(\/\/ AVAILABLE_LOGOS_START\nconst availableLogos: string\[\] = \[\n)([\s\S]*?)(\n\];?\n\/\/ AVAILABLE_LOGOS_END)/;

    // Patrón para api/index.ts (usa Set inline)
    const setPattern = /(const availableLogos = new Set\(\[\n)([\s\S]*?)(\n\]\);)/;

    let newContent: string;
    let updated = false;

    if (markerPattern.test(content)) {
      // api/logoMap.ts style
      newContent = content.replace(markerPattern, `$1${logosArrayStr}$3`);
      updated = true;
    } else if (setPattern.test(content)) {
      // api/index.ts style
      newContent = content.replace(setPattern, `$1${logosArrayStr}$3`);
      updated = true;
    } else {
      console.warn(`  Could not find logo array pattern in ${filePath}`);
      return false;
    }

    if (updated && newContent !== content) {
      writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  Updated: ${filePath}`);
      return true;
    } else if (updated) {
      console.log(`  No changes needed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`  Error updating ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('===========================================');
  console.log('  EPG Sports - Logo Downloader');
  console.log('===========================================\n');

  // Verificar que existe el directorio de logos
  if (!existsSync(LOGOS_DIR)) {
    console.log(`Creating directory: ${LOGOS_DIR}`);
    await Bun.write(`${LOGOS_DIR}/.gitkeep`, '');
  }

  // Leer canales actuales
  let channelNames: string[] = [];
  try {
    const channelsFile = Bun.file('./data/updatedChannels.json');
    if (await channelsFile.exists()) {
      const channelsData = await channelsFile.json();
      channelNames = channelsData.channels.map((c: { name: string }) => c.name);
      console.log(`Found ${channelNames.length} channels in updatedChannels.json\n`);
    }
  } catch (error) {
    console.warn('Could not read updatedChannels.json, using logoMap keys');
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
      results.push({ channel: name, success: false, error: 'No mapping' });
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
      results.push({ channel: name, success: true, source: 'primary' });
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
  console.log('\n===========================================');
  console.log('  Summary');
  console.log('===========================================');

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed channels:');
    for (const f of failed) {
      console.log(`  - ${f.channel}: ${f.error}`);
    }
  }

  // Generar lista de logos disponibles (solo los que existen)
  const availableLogos = [...processedLocals].filter((local) => existsSync(`${LOGOS_DIR}/${local}.webp`));

  // Guardar available.json
  await Bun.write(`${LOGOS_DIR}/available.json`, JSON.stringify(availableLogos, null, 2));
  console.log(`\nGenerated: ${LOGOS_DIR}/available.json (${availableLogos.length} logos)`);

  // Sincronizar archivos TypeScript
  console.log('\n===========================================');
  console.log('  Syncing TypeScript files');
  console.log('===========================================');

  updateAvailableLogosInFile(LOGO_MAP_FILE, availableLogos);
  updateAvailableLogosInFile(API_INDEX_FILE, availableLogos);

  console.log('\nLogo download complete!');
}

main().catch(console.error);
