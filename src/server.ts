import express from 'express';
import cors from 'cors';
import { getVedicAstrologyData } from './vedic.js';

const app = express();
app.use(express.json());
app.use(cors());

app.post('/astrology-data', async (req, res) => {
  const { dateOfBirth, timeOfBirth, lat, lng } = req.body;

  if (!dateOfBirth || !timeOfBirth || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await getVedicAstrologyData(dateOfBirth, timeOfBirth, lat, lng);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Unknown server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
