import fs from 'fs';
import path from 'path';

export default function handler(req: any, res: any) {
    const filePath = path.join(process.cwd(), 'data', 'alMatches.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to read data' });
            return;
        }
        res.status(200).json(JSON.parse(data));
    });
}