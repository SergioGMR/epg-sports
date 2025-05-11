import data from "./data/allMatches.json" assert { type: "json" };
import fs from 'fs';

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

interface ChannelGroup {
  id: string;
  name: string;
  displayName: string;
  tags: string[];
  channels: Channel[];
}

interface ChannelApiResponse {
  lastUpdated: string;
  groups: ChannelGroup[];
}

// Function to update matches with links
export function updateMatchesWithLinks(
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
    // Validate match structure
    if (!match.channels || !Array.isArray(match.channels)) {
      throw new Error('Match must have a valid channels array');
    }

    // Create a new match object to avoid mutating the original
    const newMatch = { ...match };
    
    // Process image URLs to remove "32/" segment for larger images
    if (newMatch.teams?.local?.image && typeof newMatch.teams.local.image === 'string' && newMatch.teams.local.image.includes('/img/32/')) {
      newMatch.teams.local.image = newMatch.teams.local.image.replace('/img/32/', '/img/');
    }
    if (newMatch.teams?.visitor?.image && typeof newMatch.teams.visitor.image === 'string' && newMatch.teams.visitor.image.includes('/img/32/')) {
      newMatch.teams.visitor.image = newMatch.teams.visitor.image.replace('/img/32/', '/img/');
    }
    
    // Normalize channels (trim and lowercase) for comparison
    const normalizedChannels = match.channels
      .map(c => (c || '').trim().toLowerCase())
      .filter(Boolean); // Remove empty strings

    // Create a map of display names to help match channels
    const channelDisplayNames = new Map<string, Set<string>>();
    channelData.groups.forEach(group => {
      // Add the group's display name as a possible match
      if (group.displayName) {
        const normalizedDisplayName = group.displayName.toLowerCase();
        if (!channelDisplayNames.has(normalizedDisplayName)) {
          channelDisplayNames.set(normalizedDisplayName, new Set());
        }
        // Associate all channel urls from this group with this display name
        group.channels.forEach(channel => {
          if (channel.url) {
            channelDisplayNames.get(normalizedDisplayName)?.add(channel.url);
          }
        });
      }
      
      // Add each channel's name as a possible match
      group.channels.forEach(channel => {
        if (channel.name) {
          const normalizedName = channel.name.toLowerCase();
          if (!channelDisplayNames.has(normalizedName)) {
            channelDisplayNames.set(normalizedName, new Set());
          }
          if (channel.url) {
            channelDisplayNames.get(normalizedName)?.add(channel.url);
          }
        }
      });
    });

    // Find matching channels and accumulate their links
    const accumulatedLinks = new Set<string>();
    
    // Match based on channel names, group names and tags
    allChannels.forEach(channel => {
      // Try to match by name (e.g., "DAZN" in match.channels matches "DAZN" in channel name or group)
      normalizedChannels.forEach(normalizedChannel => {
        // Check if any channel name contains our normalizedChannel
        if (channel.name && channel.name.toLowerCase().includes(normalizedChannel)) {
          if (channel.url) accumulatedLinks.add(channel.url);
          return;
        }
        
        // Check if any group/display name contains our normalizedChannel
        channelData.groups.forEach(group => {
          if (
            channel.groupTitle && 
            channel.groupTitle.toLowerCase().includes(normalizedChannel)
          ) {
            if (channel.url) accumulatedLinks.add(channel.url);
          }
        });
        
        // Check if any channel tags contain our normalizedChannel
        if (channel.tags && Array.isArray(channel.tags)) {
          const hasMatchingTag = channel.tags.some(tag => 
            tag && tag.toLowerCase().includes(normalizedChannel)
          );
          if (hasMatchingTag && channel.url) {
            accumulatedLinks.add(channel.url);
          }
        }
      });
    });

    // Only add links if there are any
    if (accumulatedLinks.size > 0) {
      newMatch.links = Array.from(accumulatedLinks);
    }

    return newMatch;
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

    // Update matches with links
    const updatedMatches = updateMatchesWithLinks(data.matches, channelsData);

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
