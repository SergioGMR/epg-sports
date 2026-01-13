import data from "./data/updatedMatches.json" assert { type: "json" };
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

interface Channel {
  name: string;
  links: QualityLinks;
}

interface ChannelsOutput {
  channels: Channel[];
  totalChannels: number;
  lastUpdated: string;
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

// Función auxiliar para fusionar links por calidad (sin duplicados)
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

// Función auxiliar para contar todos los links en un QualityLinks
function countAllLinks(links: QualityLinks): number {
  return (
    links["4k"].length +
    links["1080p"].length +
    links["720p"].length +
    links["sd"].length +
    links["unknown"].length
  );
}

// Main function to extract and deduplicate channels with links
export async function enrichChannels(): Promise<void> {
  try {
    console.log("Starting channel enrichment process...");

    // Validate input data
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid data: expected an array of matches");
    }

    const validMatches = data.filter(
      (match) =>
        match &&
        typeof match === "object" &&
        match.channels &&
        Array.isArray(match.channels) &&
        match.links &&
        typeof match.links === "object" &&
        hasAnyLinks(match.links as QualityLinks)
    ) as Match[];

    console.log(
      `Processing ${validMatches.length} matches with links out of ${data.length} total`
    );

    // Create a map to aggregate channels and their links by quality
    const channelMap = new Map<string, QualityLinks>();

    // Process each match
    validMatches.forEach((match) => {
      const { channels, links } = match;

      // Associate each channel in the match with all the links
      channels.forEach((channelName) => {
        if (!channelMap.has(channelName)) {
          channelMap.set(channelName, createEmptyQualityLinks());
        }

        const channelLinks = channelMap.get(channelName)!;
        mergeQualityLinks(channelLinks, links!);
      });
    });

    // Convert map to array format
    const channelsArray: Channel[] = Array.from(channelMap.entries())
      .map(([name, links]) => {
        // Sort links within each quality for consistency
        const sortedLinks: QualityLinks = {
          "4k": [...links["4k"]].sort(),
          "1080p": [...links["1080p"]].sort(),
          "720p": [...links["720p"]].sort(),
          "sd": [...links["sd"]].sort(),
          "unknown": [...links["unknown"]].sort(),
        };
        return { name, links: sortedLinks };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort channels alphabetically

    // Create output object
    const output: ChannelsOutput = {
      channels: channelsArray,
      totalChannels: channelsArray.length,
      lastUpdated: new Date().toISOString(),
    };

    // Save to file
    const outputPath = "./data/updatedChannels.json";
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

    console.log(`Successfully processed ${output.totalChannels} unique channels`);
    console.log(
      `Total unique links across all channels: ${channelsArray.reduce(
        (sum, ch) => sum + countAllLinks(ch.links),
        0
      )}`
    );
    console.log(`Updated channels saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error enriching channels:", error);
    throw error; // Re-throw to allow external handling
  }
}

// Run the main function
(async () => {
  try {
    await enrichChannels();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();
