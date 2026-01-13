import data from "./data/allMatches.json" assert { type: "json" };
import fs from "fs";

// Interface para links organizados por calidad
interface QualityLinks {
  "4k": string[];
  "1080p": string[];
  "720p": string[];
  "sd": string[];
  "unknown": string[];
}

interface Match {
  sport: string;
  date: {
    hour: string;
    day: string;
    zone: string;
  };
  details: {
    competition?: string;
    round?: string;
  };
  teams: {
    local: {
      name?: string | null;
      image?: string | null;
    };
    visitor: {
      name?: string | null;
      image?: string | null;
    };
  } | null;
  channels: string[];
  event?: {
    name?: string;
    description?: string;
    startDate?: string;
    duration?: string;
  };
  links?: QualityLinks;
}

// Interfaces para la nueva estructura de API (elplan.vercel.app/api/channels)
interface ApiChannel {
  name: string;
  logo: string | null;
  logoExternal: string | null;
  links: QualityLinks;
}

interface ChannelApiResponse {
  channels: ApiChannel[];
  totalChannels: number;
  lastUpdated: string;
}

const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "en",
  "con",
  "por",
  "para",
  "the",
  "tv",
  "canal",
]);

function preprocessValue(value: string): string {
  return value
    .replace(/\bm\+\b/gi, "movistar plus")
    .replace(/\bm plus\b/gi, "movistar plus")
    .replace(/\bm\b/gi, "movistar")
    .replace(/\bplus\b/gi, "plus")
    .replace(/\bmovistarplus\b/gi, "movistar plus")
    .replace(/\brtve\b/gi, "rtve")
    .replace(/\bmitele\b/gi, "mitele");
}

function normalizeValue(value: string): string {
  return preprocessValue(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function canonicalizeToken(token: string): string {
  const replacements: Record<string, string> = {
    movistarplus: "movistar",
    movistar: "movistar",
    plus: "plus",
    mplus: "movistar",
    mitele: "mitele",
  };

  return replacements[token] ?? token;
}

function tokenize(value: string): string[] {
  return normalizeValue(value)
    .split(" ")
    .map(canonicalizeToken)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

function isNumeric(token: string): boolean {
  return /^[0-9]+$/.test(token);
}

function matchScore(matchChannel: string, candidateName: string): number {
  const normalizedMatch = normalizeValue(matchChannel);
  const normalizedCandidate = normalizeValue(candidateName);

  if (!normalizedMatch || !normalizedCandidate) {
    return 0;
  }

  if (normalizedMatch === normalizedCandidate) {
    return 1;
  }

  let score = 0;

  if (
    normalizedMatch.length >= 5 &&
    normalizedCandidate.includes(normalizedMatch)
  ) {
    const ratio = normalizedMatch.length / normalizedCandidate.length;
    score = Math.max(score, 0.8 * ratio + 0.2);
  }

  if (
    normalizedCandidate.length >= 5 &&
    normalizedMatch.includes(normalizedCandidate)
  ) {
    const ratio = normalizedCandidate.length / normalizedMatch.length;
    score = Math.max(score, 0.8 * ratio + 0.2);
  }

  const matchTokens = tokenize(matchChannel);
  const candidateTokens = tokenize(candidateName);

  if (matchTokens.length === 0 || candidateTokens.length === 0) {
    return score;
  }

  const matchNumbers = matchTokens.filter(isNumeric);
  const candidateNumbers = candidateTokens.filter(isNumeric);
  if (matchNumbers.length && candidateNumbers.length) {
    const hasNumberOverlap = matchNumbers.some((num) =>
      candidateNumbers.includes(num)
    );
    if (!hasNumberOverlap) {
      return 0;
    }
  }

  const intersection = matchTokens.filter((token) =>
    candidateTokens.includes(token)
  );
  const unionSize = new Set([...matchTokens, ...candidateTokens]).size;
  const intersectionSize = intersection.length;

  if (unionSize > 0) {
    const jaccard = intersectionSize / unionSize;
    score = Math.max(score, jaccard);
  }

  const containment =
    intersectionSize / Math.min(matchTokens.length, candidateTokens.length);
  score = Math.max(score, containment);

  if (matchNumbers.length || candidateNumbers.length) {
    score = Math.max(score, score + 0.05);
  }

  return Math.min(score, 1);
}

// Función auxiliar para crear un objeto QualityLinks vacío
function createEmptyQualityLinks(): QualityLinks {
  return {
    "4k": [],
    "1080p": [],
    "720p": [],
    "sd": [],
    "unknown": [],
  };
}

// Función auxiliar para fusionar dos objetos QualityLinks
function mergeQualityLinks(target: QualityLinks, source: QualityLinks): void {
  const qualities: (keyof QualityLinks)[] = ["4k", "1080p", "720p", "sd", "unknown"];
  for (const quality of qualities) {
    for (const link of source[quality]) {
      if (!target[quality].includes(link)) {
        target[quality].push(link);
      }
    }
  }
}

// Función auxiliar para verificar si un QualityLinks tiene algún link
function hasAnyLinks(links: QualityLinks): boolean {
  return (
    links["4k"].length > 0 ||
    links["1080p"].length > 0 ||
    links["720p"].length > 0 ||
    links["sd"].length > 0 ||
    links["unknown"].length > 0
  );
}

// Función para actualizar los partidos con los links correspondientes
function updateMatchesWithLinks(
  matches: Match[],
  channelData: ChannelApiResponse
): Match[] {
  if (!Array.isArray(matches) || !channelData || !channelData.channels) {
    throw new Error('Invalid input: matches must be an array and channelData must be a valid response object');
  }

  const allChannels = channelData.channels;

  return matches.map((match) => {
    const collectedLinks = createEmptyQualityLinks();

    match.channels.forEach((matchChannel) => {
      let bestScore = 0;
      let bestLinks: QualityLinks | null = null;

      allChannels.forEach((channel) => {
        const channelName = channel.name || '';
        const candidateScore = matchScore(matchChannel, channelName);

        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestLinks = channel.links;
        }
      });

      const MATCH_THRESHOLD = 0.45;
      if (bestScore >= MATCH_THRESHOLD && bestLinks) {
        mergeQualityLinks(collectedLinks, bestLinks);
      }
    });

    if (!hasAnyLinks(collectedLinks)) {
      return match;
    }

    return {
      ...match,
      links: collectedLinks,
    };
  });
}

// Main function with error handling
export async function processMatches(): Promise<void> {
  try {
    // Fetch channel data from elplan API (nueva API con links por calidad)
    console.log("Fetching channel data from elplan API...");
    const response = await fetch("https://elplan.vercel.app/api/channels");

    if (!response.ok) {
      throw new Error(`Failed to fetch from API: ${response.status} ${response.statusText}`);
    }

    const channelsData = await response.json() as ChannelApiResponse;
    console.log(`Successfully fetched ${channelsData.totalChannels} channels from elplan API`);

    // Validar que data.matches exista y sea un array
    if (!data || !data.matches || !Array.isArray(data.matches)) {
      throw new Error('Invalid data: data.matches must be a valid array');
    }

    // Limpiar array de partidos para evitar errores y asegurar el tipo Match
    const validMatches = data.matches.filter(match => 
      match && 
      typeof match === 'object' && 
      match.sport && 
      match.date && 
      match.teams
    ) as Match[];

    console.log(`Processing ${validMatches.length} valid matches out of ${data.matches.length} total`);

    // Update matches with links
    const updatedMatches = updateMatchesWithLinks(validMatches, channelsData);

    // Save to file
    const outputPath = "./data/updatedMatches.json";
    fs.writeFileSync(
      outputPath,
      JSON.stringify(updatedMatches, null, 2),
      "utf-8"
    );
    
    console.log(`Successfully processed ${updatedMatches.length} matches`);
    console.log(`Updated matches saved to: ${outputPath}`);

  } catch (error) {
    console.error('Error processing matches:', error);
    throw error; // Re-throw to allow external handling
  }
}

// Run the main function
(async () => {
  try {
    await processMatches();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
