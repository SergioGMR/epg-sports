import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

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
    cookieButton: '#ez-accept-all',
    hourInput: '#hora',
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
    const url = `${baseUrl}${sport}`;
    console.log(`Scraping ${url}...`);
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto(url);

    try {
        await page.waitForSelector(selectors.cookieButton, { timeout: 5000 });
        await page.click(selectors.cookieButton);
        console.log('Botón de cookies encontrado y pulsado');
    } catch (error) {
        console.error('Cookie button not found');
    }

    try {
        await page.waitForSelector(selectors.hourInput, { timeout: 5000 });
        await page.click(selectors.hourInput);
        console.log('Botón de hora encontrado y pulsado');
    } catch (error) {
        console.error('Hour input not found');
    }

    console.log('Empezamos con la tabla de deporte...');
    const table = await page.waitForSelector(selectors.tabla);
    const rawDay = await table.$eval(selectors.head, el => el.innerText);
    const day = rawDay.split(', ')[1].trim();

    const matches = [];
    const rows = await table.$$(selectors.rows);

    for (const row of rows) {
        let matchSkeleton = {
            date: {},
            details: {},
            teams: {
                local: {},
                visitor: {}
            },
            channels: [],
            event: {}
        };
        const match = await scrapeMatch(row, day, matchSkeleton);
        matches.push(match);
    }

    await browser.close();

    return matches;
}

async function scrapeMatch(row, day, match) {
    const horaElement = await row.$(selectors.hour);
    if (horaElement) {
        const horaText = await horaElement.evaluate(el => el.innerText);
        match.date.hour = horaText;
        match.date.day = day;
        match.date.zone = 'Europe/Madrid';
    }

    const detailsElement = await row.$(selectors.details.selector);
    if (detailsElement) {
        const competitionElement = await detailsElement.$(selectors.details.competition);
        if (competitionElement) {
            match.details.competition = await competitionElement.evaluate(el => el.innerText);
        }
        const roundElement = await detailsElement.$(selectors.details.round);
        if (roundElement) {
            match.details.round = await roundElement.evaluate(el => el.innerText);
        }
    }

    const localElement = await row.$(selectors.teams.local.name);
    if (localElement) {
        match.teams.local.name = await localElement.evaluate(el => el.innerText);
    }
    const localImageElement = await row.$(selectors.teams.local.image);
    if (localImageElement) {
        match.teams.local.image = await localImageElement.evaluate(el => el.getAttribute('src'));
    }

    const visitorElement = await row.$(selectors.teams.visitor.name);
    if (visitorElement) {
        match.teams.visitor.name = await visitorElement.evaluate(el => el.innerText);
    }
    const visitorImageElement = await row.$(selectors.teams.visitor.image);
    if (visitorImageElement) {
        match.teams.visitor.image = await visitorImageElement.evaluate(el => el.getAttribute('src'));
    }

    const channelsElements = await row.$$(selectors.channels.selector + ' > ' + selectors.channels.channel);
    for (const channelElement of channelsElements) {
        const channelText = await channelElement.evaluate(el => el.innerText);
        const cleanedChannelText = channelText.replace(/\(.*?\)/g, '').trim();
        match.channels.push(cleanedChannelText);
    }

    const eventElement = await row.$(selectors.event.selector);
    if (eventElement) {
        const nameElement = await eventElement.$(selectors.event.name);
        if (nameElement) {
            match.event.name = await nameElement.evaluate(el => el.getAttribute('content'));
        }
        const descriptionElement = await eventElement.$(selectors.event.description);
        if (descriptionElement) {
            match.event.description = await descriptionElement.evaluate(el => el.getAttribute('content'));
        }
        const startDateElement = await eventElement.$(selectors.event.startDate);
        if (startDateElement) {
            match.event.startDate = await startDateElement.evaluate(el => el.getAttribute('content'));
        }
        const durationElement = await eventElement.$(selectors.event.duration);
        if (durationElement) {
            match.event.duration = await durationElement.evaluate(el => el.getAttribute('content'));
        }
    }

    return match;
}

function saveMatchesToFile(matches, fileName) {
    matches = matches.filter(match => match.date && Object.keys(match.date).length > 0);
    const data = {
        matches: matches,
        updated: new Date().toISOString()
    };

    const jsonData = JSON.stringify(data, null, 2);
    const filePath = path.join(__dirname, `./preData/${fileName}.json`);

    fs.writeFile(filePath, jsonData, 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('File has been saved.');
        }
    });
}

(async () => {
    for (const sport of sports) {
        const matches = await scrapeMatches(sport);
        saveMatchesToFile(matches, sport);
    }
})();
