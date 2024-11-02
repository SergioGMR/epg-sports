import fs from 'fs';
const url = 'https://wosti-futbol-tv-spain.p.rapidapi.com/api/Events';
const options = {
    method: 'GET',
    headers: {
        'x-rapidapi-key': 'YOUR_API_KEY',
        'x-rapidapi-host': 'wosti-futbol-tv-spain.p.rapidapi.com'
    }
};

try {
    const response = await fetch(url, options);
    const result = await response.json();
    fs.writeFileSync(
        "./data/apiResult.json",
        JSON.stringify(result, null, 2),
        "utf-8"
    );
} catch (error) {
    console.error(error);
}