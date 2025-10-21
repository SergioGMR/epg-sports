# EPG Sports

EPG Sports automatiza la captura, normalización y enriquecimiento de la guía deportiva publicada en [futbolenlatv.es](https://www.futbolenlatv.es/deporte/). El proyecto genera ficheros JSON listos para ser consumidos por aplicaciones web, bots o integraciones serverless.

## Características principales
- Rastrea múltiples deportes en paralelo con Playwright y genera un histórico homogéneo.
- Limpia y estructura la información de horarios, competiciones, equipos y canales de TV.
- Consolida todos los eventos en un único fichero y los enriquece con enlaces externos de emisión.
- Expone endpoints sencillos (`api/getMatches.ts`, `api/getEvents.ts`) para integrarse con plataformas como Vercel o Next.js.

## Tecnologías y dependencias
- Bun 1.1+ o Node.js 18+ (el proyecto está configurado como módulo ES).
- Playwright para la automatización del navegador (Chromium headless).
- TypeScript para los scripts auxiliares (`combine.ts`, `shuffle.ts`).

## Requisitos previos
1. Instalar las dependencias del proyecto.
   ```bash
   # Recomendado
   bun install

   # Alternativa con npm
   npm install
   ```
2. Instalar los binarios de Playwright la primera vez.
   ```bash
   bunx playwright install chromium
   # o
   npx playwright install chromium
   ```

## Flujo de trabajo recomendado
1. **Scraping de cada deporte**  
   Ejecuta `bun index.js` (o `node index.js`) para generar los ficheros `preData/<deporte>.json`. El proceso tarda unos minutos porque navega secuencialmente por todos los deportes definidos en `index.js`.
2. **Unificación de la programación**  
   Lanza `bun run combine.ts` (o `bunx tsx combine.ts`) para consolidar todos los partidos en `data/allMatches.json`, ordenados cronológicamente.
3. **Enriquecimiento con enlaces externos**  
   Ejecuta `bun run shuffle.ts` para descargar los canales externos desde `https://elplan.vercel.app/api/getData` y añadir sus `links` correspondientes en `data/updatedMatches.json`.
4. **Consumir los datos**  
   Reutiliza los ficheros de `data/` directamente o sirve los endpoints `api/getMatches.ts` y `api/getEvents.ts` en tu plataforma preferida.

> Consejo: puedes usar el script `bun start` como atajo para el scraping (corre `bun index.js`).

## Formato de los datos generados
- `preData/<deporte>.json` y `data/allMatches.json` comparten la misma estructura `{ matches: [...] }`.
- `data/updatedMatches.json` contiene un array con los partidos enriquecidos (incluye `links` cuando hay coincidencias).

```json
{
  "sport": "futbol",
  "date": { "hour": "00:00", "day": "03/11/2024", "zone": "Europe/Madrid" },
  "details": { "competition": "Primera Federación Femenina" },
  "teams": {
    "local": { "name": "Cacereño Femenino", "image": "https://..." },
    "visitor": { "name": "At. Baleares Femenino", "image": "https://..." }
  },
  "channels": ["Zapi Teleporte"],
  "event": {
    "name": "Cacereño Femenino - At. Baleares Femenino",
    "description": "Cacereño Femenino - At. Baleares Femenino el domingo, 3 de noviembre de 2024 a las 0:00",
    "startDate": "2024-11-02T23:00:00",
    "duration": "T1H45M"
  },
  "links": ["acestream://..."]  // Solo presente tras ejecutar shuffle.ts
}
```

## Endpoints incluidos
- `api/getMatches.ts`: responde con `data/allMatches.json`. Pensado para exponer la parrilla consolidada.
- `api/getEvents.ts`: responde con `data/updatedMatches.json`, ideal si necesitas los enlaces agregados.

Ambos archivos siguen la convención de los API Routes de Next.js/Vercel (`req`, `res`) y pueden adaptarse con facilidad a otros entornos.

## Estructura del proyecto
```text
├─ api/                 # Endpoints listos para desplegar en serverless
├─ data/                # Datos normalizados y enriquecidos
├─ preData/             # Resultado bruto del scraping por deporte
├─ index.js             # Script principal de scraping con Playwright
├─ combine.ts           # Une y ordena todos los partidos
├─ shuffle.ts           # Añade enlaces según los canales disponibles
└─ index.htm            # Placeholder utilizado durante el desarrollo
```

## Personalización
- Añade o quita deportes editando la constante `sports` en `index.js`.
- Ajusta selectores o la lógica de limpieza en `index.js` si cambia la estructura de la web origen.
- Sustituye la URL de `shuffle.ts` por tu propio servicio de canales si controlas otra fuente de enlaces.

## Contribuciones
1. Haz un fork del repositorio.
2. Crea una rama descriptiva (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza los cambios y añade pruebas o datos de ejemplo si aplica.
4. Abre un Pull Request explicando el motivo y el impacto de tu aportación.

## Licencia
No se ha definido una licencia para este repositorio. Añade una licencia antes de reutilizar el código en producción.
