import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function runScript(script: string): Promise<void> {
  try {
    console.log(`\nEjecutando: ${script}`);
    await execPromise(script);
    console.log(`\n${script} completado exitosamente\n`);
  } catch (error) {
    console.error(`Error al ejecutar ${script}:`, error);
    process.exit(1);
  }
}

async function main() {
  try {
    // Ejecutar index.js
    await runScript('bun index.js');

    // Ejecutar combine.ts
    await runScript('bun run combine.ts');

    // Ejecutar shuffle.ts
    await runScript('bun run shuffle.ts');

    // Ejecutar enrichChannels.ts
    await runScript('bun run enrichChannels.ts');

    console.log('Todos los scripts se han ejecutado exitosamente');
  } catch (error) {
    console.error('Error en el proceso:', error);
    process.exit(1);
  }
}

main();
