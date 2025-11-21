import alMatches from "../data/allMatches.json" assert { type: "json" };

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://lavatv.vercel.app'
];

export default function handler(req: any, res: any) {
    const origin = req.headers.origin;

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
    }

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        res.status(200).json(alMatches);
    } catch (e) {
        res.status(500).json({ error: e });
    }
}
