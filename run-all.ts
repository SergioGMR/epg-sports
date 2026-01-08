import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function runScript(script: string, description: string): Promise<void> {
  try {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${description}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Ejecutando: ${script}\n`);
    
    const { stdout, stderr } = await execPromise(script, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log(`\n${description} - Completado`);
  } catch (error) {
    console.error(`Error al ejecutar ${script}:`, error);
    process.exit(1);
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║           EPG Sports - Pipeline Completo           ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`\nInicio: ${new Date().toISOString()}\n`);

  try {
    // 1. Scraping de datos deportivos
    await runScript('bun index.js', '1/5 - Scraping datos deportivos');

    // 2. Combinar archivos JSON
    await runScript('bun run combine.ts', '2/5 - Combinando archivos JSON');

    // 3. Añadir enlaces AceStream
    await runScript('bun run shuffle.ts', '3/5 - Añadiendo enlaces AceStream');

    // 4. Extraer canales únicos
    await runScript('bun run enrichChannels.ts', '4/5 - Extrayendo canales');

    // 5. Descargar y optimizar logos
    await runScript('bun run scripts/download-logos.ts', '5/5 - Descargando logos');

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║              Pipeline Completado                   ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\nFin: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('\nError en el proceso:', error);
    process.exit(1);
  }
}

main();
