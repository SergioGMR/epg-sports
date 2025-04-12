import data from "./data/allMatches.json" assert { type: "json" };
import fs from 'fs';
import { z } from 'zod';

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
  event?: {
    name?: string;
    description?: string;
    startDate?: string;
    duration?: string;
  };
  links?: string[];
}

interface Channel {
  nombre: string;
  links: string[];
  tags: string[];
}

// Zod schemas for type validation
const channelSchema = z.object({
  nombre: z.string(),
  links: z.array(z.string()),
  tags: z.array(z.string())
});

const matchSchema = z.object({
  date: z.object({
    hour: z.string(),
    day: z.string(),
    zone: z.string()
  }),
  details: z.object({
    competition: z.string().optional(),
    round: z.string().optional()
  }),
  teams: z.object({
    local: z.object({
      name: z.string().optional(),
      image: z.string().optional()
    }),
    visitor: z.object({
      name: z.string().optional(),
      image: z.string().optional()
    })
  }),
  channels: z.array(z.string()),
  event: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    duration: z.string().optional()
  }).optional(),
  links: z.array(z.string()).optional()
});

// Function to update matches with links
export function updateMatchesWithLinks(
  matches: Match[],
  channels: Channel[]
): Match[] {
  if (!Array.isArray(matches) || !Array.isArray(channels)) {
    throw new Error('Both matches and channels must be arrays');
  }

  return matches.map((match) => {
    // Validate match structure
    if (!match.channels || !Array.isArray(match.channels)) {
      throw new Error('Match must have a valid channels array');
    }

    // Create a new match object to avoid mutating the original
    const newMatch = { ...match };
    
    // Normalize channels (trim and lowercase) for comparison
    const normalizedChannels = match.channels
      .map(c => (c || '').trim().toLowerCase())
      .filter(Boolean); // Remove empty strings

    // Create a set of all possible channel tags for efficient lookup
    const channelTags = new Set<string>();
    channels.forEach(channel => {
      if (!channel.tags || !Array.isArray(channel.tags)) return;
      
      channel.tags
        .map(tag => (tag || '').trim().toLowerCase())
        .filter(Boolean)
        .forEach(tag => channelTags.add(tag));
    });

    // Find matching channels and accumulate their links
    const accumulatedLinks = channels
      .filter(channel => {
        if (!channel.tags || !Array.isArray(channel.tags)) return false;
        
        // Check if any of this channel's tags matches any of our normalized channels
        return channel.tags.some(tag => {
          const normalizedTag = (tag || '').trim().toLowerCase();
          return normalizedChannels.includes(normalizedTag);
        });
      })
      .flatMap(channel => {
        if (!channel.links || !Array.isArray(channel.links)) return [];
        return channel.links
          .map(link => (link || '').trim())
          .filter(Boolean);
      });

    // Only add links if there are any
    if (accumulatedLinks.length > 0) {
      newMatch.links = [...new Set(accumulatedLinks)]; // Remove duplicates
    }

    return newMatch;
  });
}

// Main function with error handling
export async function processMatches(): Promise<void> {
  try {
    // Validate data structure
    const validatedData = matchSchema.array().parse(data.matches);
    
    // Fetch and validate channel data
    const response = await fetch("https://elplan.vercel.app/api/getData");
    if (!response.ok) {
      throw new Error(`Failed to fetch channel data: ${response.status} ${response.statusText}`);
    }
    
    const channelsData = await response.json();
    const validatedChannels = channelSchema.array().parse(channelsData);

    // Update matches with links
    const updatedMatches = updateMatchesWithLinks(validatedData, validatedChannels);

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
