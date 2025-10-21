import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Obtener __dirname equivalente en módulos ES
const __dirname = dirname(fileURLToPath(import.meta.url));

// Define la ruta a la carpeta 'preData'
const preDataFolder = path.join(__dirname, "preData");

// Lee todos los archivos JSON en la carpeta
const files = fs
  .readdirSync(preDataFolder)
  .filter((file) => path.extname(file) === ".json");

// Función para transformar un partido
function transformMatch(match: any): any {
  const transformed = { ...match };

  // 1. Quitar /32 de las URLs de imágenes para obtener 100x100px
  if (transformed.teams && typeof transformed.teams === 'object') {
    if (transformed.teams.local?.image) {
      transformed.teams.local.image = transformed.teams.local.image.replace('/img/32/', '/img/');
    }
    if (transformed.teams.visitor?.image) {
      transformed.teams.visitor.image = transformed.teams.visitor.image.replace('/img/32/', '/img/');
    }

    // 2. Cambiar teams a null si ambos equipos están vacíos o tienen name: null
    const localEmpty = !transformed.teams.local?.name || Object.keys(transformed.teams.local).length === 0;
    const visitorEmpty = !transformed.teams.visitor?.name || Object.keys(transformed.teams.visitor).length === 0;

    if (localEmpty && visitorEmpty) {
      transformed.teams = null;
    }
  }

  return transformed;
}

// Inicializa un array para almacenar todos los encuentros deportivos
let allMatches: any[] = [];

// Itera sobre cada archivo, lee y parsea su contenido, y agrega los encuentros al array
files.forEach((file) => {
  const filePath = path.join(preDataFolder, file);
  const data = fs.readFileSync(filePath, "utf8");
  const jsonData = JSON.parse(data);

  // Verifica si el archivo tiene la propiedad 'matches' y es un array
  if (jsonData.matches && Array.isArray(jsonData.matches)) {
    // Aplica transformaciones a cada partido
    const transformedMatches = jsonData.matches.map(transformMatch);
    allMatches = allMatches.concat(transformedMatches);
  }
});

// Función para parsear la fecha y hora de cada encuentro
function parseMatchDate(matchDate: {
  day: string;
  hour: string;
  zone: string;
}): Date {
  const [day, month, year] = matchDate.day.split("/");
  const time = matchDate.hour;

  // Crea una cadena de fecha en formato ISO
  const dateString = `${year}-${month}-${day}T${time}:00`;

  // Si necesitas manejar zonas horarias específicas, puedes utilizar librerías como 'date-fns-tz' o 'moment-timezone'
  return new Date(dateString);
}

// Ordena el array 'allMatches' por fecha y hora en orden ascendente
allMatches.sort((a, b) => {
  const dateA = parseMatchDate(a.date);
  const dateB = parseMatchDate(b.date);
  return dateA.getTime() - dateB.getTime();
});

// Asegúrate de que la carpeta "data" existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Escribe los encuentros ordenados en un nuevo archivo JSON
const outputData = { matches: allMatches };
const outputFilePath = path.join(dataDir, 'allMatches.json');

fs.writeFileSync(
  outputFilePath,
  JSON.stringify(outputData, null, 2),
  'utf8'
);
console.log('Archivo allMatches.json guardado correctamente.');