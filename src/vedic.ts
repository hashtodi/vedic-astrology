import { VedicAstrologyData } from './types';

// Use require because vedic-astrology is CommonJS
const vedicAstrology = require('vedic-astrology');

export async function getVedicAstrologyData(
  dateString: string,
  timeString: string,
  lat: number,
  lng: number,
  timezone: number = 5.5
): Promise<VedicAstrologyData> {
  try {
    const birthChart = vedicAstrology.positioner.getBirthChart(
      dateString,
      timeString,
      lat,
      lng,
      timezone
    );

    const moonSign = birthChart.meta.Mo?.rashi || 'Unknown';
    const sunSign = birthChart.meta.Su?.rashi || 'Unknown';
    const ascendant = birthChart.meta.As?.rashi || 'Unknown';
    const atmakarak = calculateAtmakarak(birthChart);

    return {
      moonSign,
      sunSign,
      ascendant,
      atmakarak,
      birthChart,
    };
  } catch (error) {
    console.error('Vedic astrology calculation error:', error);
    throw new Error(`Failed to calculate vedic astrology data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function calculateAtmakarak(birthChart: Record<string, any>): string {
  const planets = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];
  let maxDegrees = 0;
  let atmakarak = 'Su';

  const meta = birthChart.meta as Record<string, { degree?: number }>;

  for (const planet of planets) {
    const degree = parseFloat(String(meta[planet]?.degree ?? '0'));
    if (degree > maxDegrees) {
      maxDegrees = degree;
      atmakarak = planet;
    }
  }

  const planetNames: Record<string, string> = {
    Su: 'Sun',
    Mo: 'Moon',
    Ma: 'Mars',
    Me: 'Mercury',
    Ju: 'Jupiter',
    Ve: 'Venus',
    Sa: 'Saturn',
  };

  return planetNames[atmakarak] || 'Sun';
}
