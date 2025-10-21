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
      name?: string;
      image?: string;
    };
    visitor: {
      name?: string;
      image?: string;
    };
  };
  channels: string[];
  event: {
    name?: string;
    description?: string;
    startDate?: string;
    duration?: string;
  };
  links?: string[]; // Propiedad opcional para añadir los links
}

interface Channel {
  nombre: string;
  links: string[];
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
  channels: Channel[]
): Match[] {
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

(async () => {
  try {
    const channelsResponse = await fetch(
      "https://elplan.vercel.app/api/getData"
    );
    const channelsData = await channelsResponse.json();

    // Verify that channelsData is an array
    if (!Array.isArray(channelsData)) {
      throw new Error("The channels data retrieved is not an array.");
    }

    const channels: Channel[] = channelsData;

    // Verify that data.matches is an array
    if (!Array.isArray(data.matches)) {
      throw new Error("data.matches is not an array.");
    }

    const updatedMatches = updateMatchesWithLinks(data.matches, channels);

    // Save the updated matches to a JSON file
    fs.writeFileSync(
      "./data/updatedMatches.json",
      JSON.stringify(updatedMatches, null, 2),
      "utf-8"
    );

    console.log(
      "Updated matches have been saved to './data/updatedMatches.json'."
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
