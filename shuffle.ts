import data from "./data/allMatches.json" assert { type: "json" };
import fs from 'fs';

interface Match {
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

// Función para actualizar los partidos con los links correspondientes
function updateMatchesWithLinks(
  matches: Match[],
  channels: Channel[]
): Match[] {
  return matches.map((match) => {
    // Convertimos los nombres de los canales del partido a minúsculas
    const matchChannels = match.channels.map((c) => c.toLowerCase());

    // Array para almacenar los links que coincidan
    let accumulatedLinks: string[] = [];

    // Recorremos el array de canales
    channels.forEach((channel) => {
      // Convertimos las tags del canal a minúsculas
      const channelTags = channel.tags.map((t) => t.toLowerCase());

      // Verificamos si algún canal del partido coincide con las tags del canal
      const exists = matchChannels.some((mc) => channelTags.includes(mc));

      if (exists) {
        // Si hay coincidencia, acumulamos los links del canal
        accumulatedLinks = accumulatedLinks.concat(channel.links);
      }
    });

    if (accumulatedLinks.length > 0) {
      // Si hay links acumulados, los añadimos al partido
      match.links = accumulatedLinks;
    }

    return match;
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
