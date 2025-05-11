// index.js

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseUrl = 'https://www.futbolenlatv.es/deporte/';
const sports = [
    'automovilismo',
    'baloncesto',
    'balonmano',
    'beisbol',
    'boxeo',
    'futbol',
    'futbol-americano',
    'futbol-sala',
    'golf',
    'hockey-patines',
    'mma',
    'motociclismo',
    'padel',
    'rugby',
    'tenis'
];

const selectors = {
    adButton: '#dismiss-button',
    cookieButton: '#ez-accept-all',
    tabla: 'table.tablaPrincipal',
    head: 'tr.cabeceraTabla > td',
    rows: 'tr:nth-child(n+2)',
    hour: 'td.hora',
    details: {
        selector: 'td.detalles > ul > li > div > span.ajusteDoslineas',
        competition: 'label',
        round: 'span'
    },
    teams: {
        local: {
            name: 'td.local > a',
            image: 'td.local > img',
            imgAlt: 'td.local img'
        },
        visitor: {
            name: 'td.visitante > a',
            image: 'td.visitante > img',
            imgAlt: 'td.visitante img'
        },
        // Para eventos que solo tienen una columna para ambos equipos
        singleColumn: {
            selector: 'td.eventoUnaColumna',
            content: 'span.eventoUnico'
        }
    },
    channels: {
        selector: 'td.canales > ul.listaCanales',
        channel: 'li'
    },
    event: {
        selector: 'div[itemtype="https://schema.org/Event"]',
        name: 'meta[itemprop="name"]',
        description: 'meta[itemprop="description"]',
        startDate: 'meta[itemprop="startDate"]',
        duration: 'meta[itemprop="duration"]',
    }
};

async function scrapeMatches(sport) {
    const waitTimeout = 5 * 60 * 1000; // 6 minutos
    const browser = await chromium.launch({
        headless: true, // Ejecutar en modo no headless
        ignoreHTTPSErrors: true,
        args: [
            '--disable-blink-features=AutomationControlled', // Desactivar características de automatización
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    try {
        const url = `${baseUrl}${sport}`;
        console.log(`Scraping ${url}...`);
        await page.goto(url, { timeout: waitTimeout, waitUntil: 'domcontentloaded' });
        console.log('Página cargada');

        // Intentar aceptar cookies
        try {
            await page.click(selectors.cookieButton);
            console.log('Botón de cookies encontrado y pulsado');
        } catch (error) {
            console.error('Botón de cookies no encontrado');
        }

        console.log('Empezamos con la tabla de deporte...');
        const table = await page.waitForSelector(selectors.tabla, { timeout: waitTimeout, waitUntil: 'domcontentloaded' });
        const rawDay = await table.$eval(selectors.head, el => el.innerText);
        const day = rawDay.split(', ')[1].trim();

        // await page.pause(); // Línea comentada después de la depuración

        const rows = await table.$$(selectors.rows);
        const matches = await Promise.all(rows.map(row => scrapeMatch(row, day, sport)));

        await browser.close();
        return matches;
    } catch (error) {
        console.error(`Error al procesar ${sport}:`, error.stack);
        await browser.close();
        throw error; // Re-lanzar el error para detener la ejecución
    }
}

async function scrapeMatch(row, day, sport) {
    // Crear un objeto limpio para el evento deportivo
    const match = {
        sport: sport,
        date: {},
        details: {},
        teams: {
            local: {},
            visitor: {}
        },
        channels: [],
        event: {},
        eventType: 'match' // 'match' por defecto para eventos normal equipo vs equipo, 'tournament' para eventos de una columna
    };

    // Extraer información de fecha y hora solo una vez
    const horaElement = await row.$(selectors.hour);
    if (horaElement) {
        const horaText = await horaElement.innerText();
        // Limpiar y asegurar que no hay duplicaciones
        if (!match.date.hour) match.date.hour = horaText;
        if (!match.date.day) match.date.day = day;
        if (!match.date.zone) match.date.zone = 'Europe/Madrid';
    }

    // Extraer detalles de competición y ronda
    const detailsElement = await row.$(selectors.details.selector);
    if (detailsElement) {
        const competitionElement = await detailsElement.$(selectors.details.competition);
        if (competitionElement) {
            const competitionText = await competitionElement.innerText();
            // Comprobar que no es nulo o vacío y que no existe ya
            if (competitionText && competitionText.trim() !== '' && !match.details.competition) {
                match.details.competition = competitionText;
            }
        }

        const roundElement = await detailsElement.$(selectors.details.round);
        if (roundElement) {
            const roundText = await roundElement.innerText();
            // Comprobar que no es nulo o vacío y que no existe ya
            if (roundText && roundText.trim() !== '' && !match.details.round) {
                match.details.round = roundText;
            }
        }
    }

    // Intentar detectar primero si es un evento de una columna
    const singleColumnElement = await row.$(selectors.teams.singleColumn.selector);
    if (singleColumnElement) {
        // Es un evento que tiene una sola columna en lugar de equipos separados
        match.eventType = 'tournament';
        const singleColumnContentElement = await singleColumnElement.$(selectors.teams.singleColumn.content);
        if (singleColumnContentElement) {
            const eventText = await singleColumnContentElement.innerText();
            // Intentar dividir el texto por <br> que en HTML se renderiza como nueva línea
            const eventParts = eventText.split('\n');
            if (eventParts.length >= 1) {
                match.details.round = eventParts[0].trim();
            }
            if (eventParts.length >= 2) {
                match.details.tournamentName = eventParts[1].trim();
            }
            // También guardamos el texto completo para referencia
            match.details.fullEventText = eventText;
        }
    } else {
        // Es un evento normal con equipos local y visitante
        // Intentamos varias estrategias para obtener los nombres de los equipos

        // 1. Primero probamos con el elemento imgAlt que tiene el atributo alt
        const localImgAlt = await row.$(selectors.teams.local.imgAlt);
        if (localImgAlt) {
            match.teams.local.name = await localImgAlt.getAttribute('alt');
        }

        // 2. Si aún no tenemos nombre, intentamos con el texto del enlace
        if (!match.teams.local.name) {
            const localElement = await row.$(selectors.teams.local.name);
            if (localElement) {
                match.teams.local.name = await localElement.innerText();
            }
        }

        // Obtenemos la imagen del equipo local
        const localImageElement = await row.$(selectors.teams.local.image);
        if (localImageElement) {
            let imageUrl = await localImageElement.getAttribute('src');
            // Modificar la URL para obtener imágenes más grandes (eliminar el segmento "32/")
            if (imageUrl && imageUrl.includes('/img/32/')) {
                imageUrl = imageUrl.replace('/img/32/', '/img/');
            }
            match.teams.local.image = imageUrl;
        }

        // Mismo proceso para el equipo visitante
        const visitorImgAlt = await row.$(selectors.teams.visitor.imgAlt);
        if (visitorImgAlt) {
            match.teams.visitor.name = await visitorImgAlt.getAttribute('alt');
        }

        if (!match.teams.visitor.name) {
            const visitorElement = await row.$(selectors.teams.visitor.name);
            if (visitorElement) {
                match.teams.visitor.name = await visitorElement.innerText();
            }
        }

        const visitorImageElement = await row.$(selectors.teams.visitor.image);
        if (visitorImageElement) {
            let imageUrl = await visitorImageElement.getAttribute('src');
            // Modificar la URL para obtener imágenes más grandes (eliminar el segmento "32/")
            if (imageUrl && imageUrl.includes('/img/32/')) {
                imageUrl = imageUrl.replace('/img/32/', '/img/');
            }
            match.teams.visitor.image = imageUrl;
        }

        // Fin de la extracción de datos de equipos - los nombres se mejorarán con Schema.org más adelante
    }

    const channelsElements = await row.$$(selectors.channels.selector + ' > ' + selectors.channels.channel);
    for (const channelElement of channelsElements) {
        const channelText = await channelElement.innerText();
        const cleanedChannelText = channelText.replace(/\(.*?\)/g, '').trim();
        match.channels.push(cleanedChannelText);
    }

    const eventElement = await row.$(selectors.event.selector);
    if (eventElement) {
        const nameElement = await eventElement.$(selectors.event.name);
        if (nameElement) {
            const nameContent = await nameElement.getAttribute('content');
            match.event.name = nameContent;

            // Usamos el nombre del evento para mejorar los nombres de los equipos si estamos en un partido (no torneo)
            if (match.eventType === 'match' && nameContent && nameContent.includes(' - ')) {
                const parts = nameContent.split(' - ');
                if (parts.length === 2) {
                    // Solo sobreescribimos si no tenemos ya nombres válidos
                    if (!match.teams.local.name || match.teams.local.name === 'null') {
                        match.teams.local.name = parts[0].trim();
                    }
                    if (!match.teams.visitor.name || match.teams.visitor.name === 'null') {
                        match.teams.visitor.name = parts[1].trim();
                    }
                }
            }
        }

        const descriptionElement = await eventElement.$(selectors.event.description);
        if (descriptionElement) {
            match.event.description = await descriptionElement.getAttribute('content');
        }
        const startDateElement = await eventElement.$(selectors.event.startDate);
        if (startDateElement) {
            match.event.startDate = await startDateElement.getAttribute('content');
        }
        const durationElement = await eventElement.$(selectors.event.duration);
        if (durationElement) {
            match.event.duration = await durationElement.getAttribute('content');
        }
    }

    return match;
}

async function saveMatchesToFile(matches, fileName) {
    // Filtrar partidos válidos y limpiar cualquier posible estructura duplicada
    matches = matches.filter(match => match.date && Object.keys(match.date).length > 0)
        .map(match => {
            // Crear un objeto limpio con estructura definida para evitar duplicaciones
            return {
                sport: match.sport,
                date: {
                    hour: match.date.hour || "",
                    day: match.date.day || "",
                    zone: match.date.zone || "Europe/Madrid"
                },
                details: {
                    competition: match.details?.competition || null,
                    round: match.details?.round || null
                },
                teams: {
                    local: {
                        name: match.teams?.local?.name || null,
                        image: match.teams?.local?.image || null
                    },
                    visitor: {
                        name: match.teams?.visitor?.name || null,
                        image: match.teams?.visitor?.image || null
                    }
                },
                channels: Array.isArray(match.channels) ? match.channels : [],
                event: match.event || {},
                eventType: match.eventType || 'match'
            };
        });

    const data = {
        matches: matches,
        updated: new Date().toISOString()
    };

    // Validar que el JSON sea correcto antes de guardarlo
    try {
        const jsonData = JSON.stringify(data, null, 2);
        // Verificar que podemos parsear el JSON de nuevo (sanity check)
        JSON.parse(jsonData);

        const dirPath = path.join(__dirname, 'preData');
        const filePath = path.join(dirPath, `${fileName}.json`);

        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, jsonData, 'utf8');
        console.log(`El archivo ${fileName}.json ha sido guardado.`);
    } catch (err) {
        console.error(`Error al procesar o escribir el archivo ${fileName}.json:`, err);
    }
}

(async () => {
    try {
        const scrapeTasks = sports.map(async (sport) => {
            const matches = await scrapeMatches(sport);
            await saveMatchesToFile(matches, sport);
        });
        await Promise.all(scrapeTasks);
        console.log('Todos los deportes han sido procesados y los datos guardados.');
    } catch (error) {
        console.error('Ocurrió un error durante el proceso de scraping:', error.stack);
    }
})();
