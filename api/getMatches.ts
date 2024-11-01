import alMatches from "../data/allMatches.json";

export default function handler(_req: any, res: any) {
    try {
        res.status(200).json(alMatches);
    } catch (e) {
        res.status(500).json({ error: e });
    }
}
