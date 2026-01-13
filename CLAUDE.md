# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EPG Sports is an automated sports event data aggregation system that scrapes live sports schedules from futbolenlatv.es, enriches them with AceStream streaming links, and exposes the data via a REST API deployed on Vercel.

## Common Commands

```bash
# Install dependencies
bun install

# Install Playwright browser (first-time setup)
bunx playwright install chromium

# Run full pipeline (scrape → combine → enrich → logos)
bun run run-all

# Start development server (http://localhost:3000)
bun run dev

# Individual pipeline steps
bun run combine          # Consolidate preData/*.json → data/allMatches.json
bun run shuffle          # Add AceStream links → data/updatedMatches.json
bun run download-logos   # Download/optimize channel logos
```

## Architecture

### Data Pipeline (run-all.ts)

```
1. index.js (Playwright scraper)
   → preData/{sport}.json (15 sport files)

2. combine.ts
   → data/allMatches.json (sorted, cleaned)

3. shuffle.ts (fetches elplan API, fuzzy channel matching)
   → data/updatedMatches.json (with QualityLinks)

4. enrichChannels.ts
   → data/updatedChannels.json (deduplicated channels)

5. scripts/download-logos.ts
   → public/logos/*.webp (optimized images)
```

### API Layer

- **api/index.ts**: Production Hono API (self-contained for Vercel, no TS imports)
- **dev-server.ts**: Local development server with hot reload
- **api/logoMap.ts**: Channel → logo URL mappings (primary/fallback/local)

### Key Data Structures

```typescript
interface QualityLinks {
  "4k": string[];
  "1080p": string[];
  "720p": string[];
  "sd": string[];
  "unknown": string[];
}
```

Links are organized by quality tier and deduplicated when merging.

## Important Patterns

### Channel Matching (shuffle.ts)
Uses fuzzy scoring algorithm with threshold ≥ 0.45:
- Exact match → 1.0
- Substring containment → 0.6-0.9
- Jaccard token similarity
- Stopword filtering ("hd", "tv", numbers)

### Two API Files
- `api/index.ts` must remain self-contained (no imports from other TS files) for Vercel deployment
- `dev-server.ts` can import from local modules

### Logo Sources (api/logoMap.ts)
Priority: local WebP → primary (tv-logo/tv-logos GitHub) → fallback URL

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api | API metadata |
| GET /api/health | Status and stats |
| GET /api/matches | Matches without links |
| GET /api/events | Matches with streaming links |
| GET /api/channels | Channels with logos and links |

## Automation

GitHub Actions runs the pipeline daily at 00:10 UTC and auto-commits results.
