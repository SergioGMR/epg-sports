import data from "./data/allMatches.json" assert { type: "json" };
import fs from "fs";

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
  };
  channels: string[];
  event?: {
    name?: string;
    description?: string;
    startDate?: string;
    duration?: string;
  };
  links?: string[];
}

// Interfaces para la nueva estructura de API
interface Channel {
  name: string;
  id: string;
  url: string;
  quality?: string;
  category?: string;
  groupTitle?: string;
  tags: string[];
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

// Función para actualizar los partidos con los links correspondientes
function updateMatchesWithLinks(
  matches: Match[],
  channelData: ChannelApiResponse
): Match[] {
  if (!Array.isArray(matches) || !channelData || !channelData.groups) {
    throw new Error('Invalid input: matches must be an array and channelData must be a valid response object');
  }

  // Extract all channels from all groups
  const allChannels: Channel[] = [];
  channelData.groups.forEach(group => {
    if (group.channels && Array.isArray(group.channels)) {
      allChannels.push(...group.channels);
    }
  });

  return matches.map((match) => {
    const collectedLinks: string[] = [];

    match.channels.forEach((matchChannel) => {
      let bestScore = 0;
      let bestLinks: string[] = [];

      channels.forEach((channel) => {
        const candidateScore = [channel.nombre, ...channel.tags].reduce(
          (score, candidateName) =>
            Math.max(score, matchScore(matchChannel, candidateName)),
          0
        );

        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestLinks = channel.links;
        }
      });

      const MATCH_THRESHOLD = 0.45;
      if (bestScore >= MATCH_THRESHOLD) {
        collectedLinks.push(...bestLinks);
      }
    });

    const uniqueLinks = Array.from(new Set(collectedLinks));

    if (uniqueLinks.length === 0) {
      return match;
    }

    return {
      ...match,
      links: uniqueLinks,
    };
  });
}

// Main function with error handling
export async function processMatches(): Promise<void> {
  try {
    // Fetch channel data from the new API
    let response;
    let channelsData: ChannelApiResponse;
    
    try {
      console.log("Attempting to fetch channel data from new API...");
      response = await fetch("https://the-clerk-project.vercel.app/api/channels", {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from new API: ${response.status} ${response.statusText}`);
      }
      
      channelsData = await response.json() as ChannelApiResponse;
      console.log("Successfully fetched data from new API");
    } catch (error: any) {
      console.log(`Error with new API: ${error.message}. Falling back to original API...`);
      
      // Fallback to original API
      response = await fetch("https://elplan.vercel.app/api/getData");
      if (!response.ok) {
        throw new Error(`Failed to fetch from fallback API: ${response.status} ${response.statusText}`);
      }
      
      const oldFormatData = await response.json();
      // Convert old format to new format if necessary
      if (oldFormatData && Array.isArray(oldFormatData)) {
        channelsData = {
          lastUpdated: new Date().toISOString(),
          groups: [{
            id: "legacy-group",
            name: "legacy",
            displayName: "Legacy Channels",
            tags: [],
            channels: oldFormatData
          }]
        };
      } else {
        channelsData = oldFormatData as ChannelApiResponse;
      }
      console.log("Successfully fetched data from fallback API");
    }

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
