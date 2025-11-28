import data from "./data/updatedMatches.json" assert { type: "json" };
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
  } | null;
  channels: string[];
  event?: {
    name?: string;
    description?: string;
    startDate?: string;
    duration?: string;
  };
  links?: string[];
}

interface Channel {
  name: string;
  links: string[];
}

interface ChannelsOutput {
  channels: Channel[];
  totalChannels: number;
  lastUpdated: string;
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
        Array.isArray(match.links) &&
        match.links.length > 0
    ) as Match[];

    console.log(
      `Processing ${validMatches.length} matches with links out of ${data.length} total`
    );

    // Create a map to aggregate channels and their links
    const channelMap = new Map<string, Set<string>>();

    // Process each match
    validMatches.forEach((match) => {
      const { channels, links } = match;

      // Associate each channel in the match with all the links
      channels.forEach((channelName) => {
        if (!channelMap.has(channelName)) {
          channelMap.set(channelName, new Set<string>());
        }

        const channelLinks = channelMap.get(channelName)!;
        links!.forEach((link) => channelLinks.add(link));
      });
    });

    // Convert map to array format
    const channelsArray: Channel[] = Array.from(channelMap.entries())
      .map(([name, linksSet]) => ({
        name,
        links: Array.from(linksSet).sort(), // Sort links for consistency
      }))
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
        (sum, ch) => sum + ch.links.length,
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
