import fs from "fs";

// Interface para links organizados por calidad
interface QualityLinks {
  "4k": string[];
  "1080p": string[];
  "720p": string[];
  "sd": string[];
  "unknown": string[];
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

// API response interface
interface ApiChannelResponse {
  channels: Array<{
    name: string;
    logo: string | null;
    logoExternal: string | null;
    links: QualityLinks;
  }>;
  totalChannels: number;
  lastUpdated: string;
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

// Main function to fetch channels directly from elplan API
export async function enrichChannels(): Promise<void> {
  try {
    console.log("Fetching channel data from elplan API...");

    // Fetch directly from elplan API (source of truth for per-channel links)
    const response = await fetch("https://elplan.vercel.app/api/channels");
    if (!response.ok) {
      throw new Error(`Failed to fetch from API: ${response.status} ${response.statusText}`);
    }

    const apiData = await response.json() as ApiChannelResponse;
    console.log(`Successfully fetched ${apiData.totalChannels} channels from elplan API`);

    // Filter to only channels that have links and format output
    const channelsWithLinks: Channel[] = apiData.channels
      .filter(ch => hasAnyLinks(ch.links))
      .map(ch => ({
        name: ch.name,
        links: {
          "4k": [...ch.links["4k"]].sort(),
          "1080p": [...ch.links["1080p"]].sort(),
          "720p": [...ch.links["720p"]].sort(),
          "sd": [...ch.links["sd"]].sort(),
          "unknown": [...ch.links["unknown"]].sort(),
        }
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const output: ChannelsOutput = {
      channels: channelsWithLinks,
      totalChannels: channelsWithLinks.length,
      lastUpdated: new Date().toISOString(),
    };

    // Save to file
    const outputPath = "./data/updatedChannels.json";
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

    console.log(`Successfully processed ${output.totalChannels} channels with links`);
    console.log(`Updated channels saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error enriching channels:", error);
    throw error;
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
