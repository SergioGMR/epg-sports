# EPG Sports

EPG Sports automatiza la captura, normalización y enriquecimiento de la guía deportiva publicada en [futbolenlatv.es](https://www.futbolenlatv.es/deporte/). El proyecto genera ficheros JSON listos para ser consumidos por aplicaciones web, bots o integraciones serverless.

## Características principales
- Rastrea múltiples deportes en paralelo con Playwright y genera un histórico homogéneo.
- Limpia y estructura la información de horarios, competiciones, equipos y canales de TV.
- Consolida todos los eventos en un único fichero y los enriquece con enlaces externos de emisión.
- **API unificada con Hono** para consumir datos de partidos, eventos y canales.
- **Logos de canales optimizados** en formato WebP, servidos como assets estáticos.

## Tecnologías y dependencias
- Bun 1.1+ o Node.js 18+ (el proyecto está configurado como módulo ES).
- Playwright para la automatización del navegador (Chromium headless).
- **Hono** como framework web para la API.
- **Sharp** para optimización de imágenes a WebP.
- TypeScript para los scripts auxiliares.

## Requisitos previos
1. Instalar las dependencias del proyecto.
   ```bash
   bun install
   ```
2. Instalar los binarios de Playwright la primera vez.
   ```bash
   bunx playwright install chromium
   ```

## Flujo de trabajo (Pipeline)

Ejecutar todo el pipeline con un solo comando:
```bash
bun run run-all
```

Este comando ejecuta secuencialmente:
1. **Scraping** (`index.js`): Genera `preData/<deporte>.json`
2. **Unificación** (`combine.ts`): Consolida en `data/allMatches.json`
3. **Enriquecimiento** (`shuffle.ts`): Añade enlaces AceStream en `data/updatedMatches.json`
4. **Extracción de canales** (`enrichChannels.ts`): Genera `data/updatedChannels.json`
5. **Descarga de logos** (`scripts/download-logos.ts`): Descarga y optimiza logos en `public/logos/`

## API Endpoints

La API está construida con [Hono](https://hono.dev/) y desplegada en Vercel.

### `GET /api`
Información general de la API.

```json
{
  "name": "EPG Sports API",
  "version": "1.0.0",
  "description": "API de programacion deportiva con enlaces AceStream",
  "endpoints": {
    "GET /api": "Informacion de la API",
    "GET /api/health": "Estado del servicio",
    "GET /api/matches": "Partidos programados (sin enlaces)",
    "GET /api/events": "Eventos con enlaces de streaming",
    "GET /api/channels": "Canales con logos y enlaces AceStream"
  },
  "source": "futbolenlatv.es",
  "lastUpdated": "2026-01-08T00:14:06.975Z"
}
```

### `GET /api/health`
Estado del servicio y estadísticas.

```json
{
  "status": "ok",
  "timestamp": "2026-01-08T15:00:00.000Z",
  "data": {
    "totalMatches": 79,
    "totalEvents": 69,
    "totalChannels": 24
  }
}
```

### `GET /api/matches`
Partidos programados (sin enlaces de streaming).

### `GET /api/events`
Eventos con enlaces de streaming AceStream.

### `GET /api/channels`
Canales con logos y enlaces AceStream.

```json
{
  "channels": [
    {
      "name": "DAZN",
      "logo": "/logos/dazn.webp",
      "links": ["acestream://..."]
    },
    {
      "name": "Courtside 1891",
      "logo": null,
      "links": ["acestream://..."]
    }
  ],
  "totalChannels": 24,
  "lastUpdated": "2026-01-08T00:14:06.975Z"
}
```

### Logos de canales
Los logos están disponibles como assets estáticos en `/logos/{nombre}.webp`.

Ejemplo: `/logos/dazn.webp`, `/logos/movistar-plus.webp`

Los logos se cachean con `Cache-Control: public, max-age=31536000, immutable`.

## Desarrollo local

```bash
# Iniciar servidor de desarrollo
bun run dev

# El servidor estará disponible en http://localhost:3000
```

## Estructura del proyecto
```text
├─ api/
│  └─ index.ts           # App Hono (endpoints de la API)
├─ data/
│  ├─ allMatches.json    # Partidos consolidados
│  ├─ updatedMatches.json # Partidos con enlaces
│  └─ updatedChannels.json # Canales con enlaces
├─ preData/              # Resultado bruto del scraping por deporte
├─ public/
│  └─ logos/             # Logos de canales (WebP optimizados)
├─ scripts/
│  └─ download-logos.ts  # Script de descarga de logos
├─ src/
│  └─ logoMap.ts         # Mapeo canal -> archivo de logo
├─ index.js              # Script principal de scraping
├─ combine.ts            # Une y ordena partidos
├─ shuffle.ts            # Añade enlaces AceStream
├─ enrichChannels.ts     # Extrae canales únicos
├─ run-all.ts            # Orquestador del pipeline
├─ dev-server.ts         # Servidor de desarrollo local
├─ vercel.json           # Configuración de Vercel
└─ package.json
```

## Formato de los datos

```json
{
  "sport": "futbol",
  "date": { "hour": "21:00", "day": "08/01/2026", "zone": "Europe/Madrid" },
  "details": { "competition": "LaLiga", "round": "Jornada 18" },
  "teams": {
    "local": { "name": "Real Madrid", "image": "https://..." },
    "visitor": { "name": "Barcelona", "image": "https://..." }
  },
  "channels": ["DAZN", "M+ LaLiga"],
  "event": {
    "name": "Real Madrid - Barcelona",
    "startDate": "2026-01-08T20:00:00Z"
  },
  "links": ["acestream://..."]
}
```

## Personalización
- Añade o quita deportes editando la constante `sports` en `index.js`.
- Ajusta selectores o la lógica de limpieza en `index.js` si cambia la estructura de la web origen.
- Añade nuevos canales en `src/logoMap.ts` para incluir sus logos.

## Ejecución automática (GitHub Actions)
El pipeline se ejecuta automáticamente cada día a las 00:00 UTC mediante GitHub Actions.
Los datos actualizados se commitean automáticamente al repositorio.

## Contribuciones
1. Haz un fork del repositorio.
2. Crea una rama descriptiva (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza los cambios y añade pruebas o datos de ejemplo si aplica.
4. Abre un Pull Request explicando el motivo y el impacto de tu aportación.

## Licencia
No se ha definido una licencia para este repositorio. Añade una licencia antes de reutilizar el código en producción.
