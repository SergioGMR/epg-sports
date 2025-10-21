import { processMatches } from './shuffle';

async function main() {
  try {
    await processMatches();
    console.log('Proceso completado exitosamente');
  } catch (error) {
    console.error('Error en el proceso:', error);
    process.exit(1);
  }
}

main();
