import alMatches from "../data/updatedMatches.json" assert { type: "json" };

export default function handler(req: any, res: any) {

  try {
    res.status(200).json(alMatches);
  } catch (e) {
    res.status(500).json({ error: e });
  }
}
