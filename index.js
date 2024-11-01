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
            name: 'td.local > a > span',
            image: 'td.local > img'
        },
        visitor: {
            name: 'td.visitante > a > span',
            image: 'td.visitante > img'
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
        const matches = await Promise.all(rows.map(row => scrapeMatch(row, day)));

        await browser.close();
        return matches;
    } catch (error) {
        console.error(`Error al procesar ${sport}:`, error.stack);
        await browser.close();
        throw error; // Re-lanzar el error para detener la ejecución
    }
}

async function scrapeMatch(row, day) {
    const match = {
        date: {},
        details: {},
        teams: {
            local: {},
            visitor: {}
        },
        channels: [],
        event: {}
    };

    const horaElement = await row.$(selectors.hour);
    if (horaElement) {
        const horaText = await horaElement.innerText();
        match.date.hour = horaText;
        match.date.day = day;
        match.date.zone = 'Europe/Madrid';
    }

    const detailsElement = await row.$(selectors.details.selector);
    if (detailsElement) {
        const competitionElement = await detailsElement.$(selectors.details.competition);
        if (competitionElement) {
            match.details.competition = await competitionElement.innerText();
        }
        const roundElement = await detailsElement.$(selectors.details.round);
        if (roundElement) {
            match.details.round = await roundElement.innerText();
        }
    }

    const localElement = await row.$(selectors.teams.local.name);
    if (localElement) {
        match.teams.local.name = await localElement.innerText();
    }
    const localImageElement = await row.$(selectors.teams.local.image);
    if (localImageElement) {
        match.teams.local.image = await localImageElement.getAttribute('src');
    }

    const visitorElement = await row.$(selectors.teams.visitor.name);
    if (visitorElement) {
        match.teams.visitor.name = await visitorElement.innerText();
    }
    const visitorImageElement = await row.$(selectors.teams.visitor.image);
    if (visitorImageElement) {
        match.teams.visitor.image = await visitorImageElement.getAttribute('src');
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
            match.event.name = await nameElement.getAttribute('content');
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
    matches = matches.filter(match => match.date && Object.keys(match.date).length > 0);
    const data = {
        matches: matches,
        updated: new Date().toISOString()
    };

    const jsonData = JSON.stringify(data, null, 2);
    const dirPath = path.join(__dirname, 'preData');
    const filePath = path.join(dirPath, `${fileName}.json`);

    try {
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, jsonData, 'utf8');
        console.log(`El archivo ${fileName}.json ha sido guardado.`);
    } catch (err) {
        console.error('Error al escribir el archivo:', err);
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
