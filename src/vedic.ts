import { VedicAstrologyData } from './types';

// Use require because vedic-astrology is CommonJS
const vedicAstrology = require('vedic-astrology');

/**
 * Validate input parameters for astrology calculations
 */
function validateAstrologyInput(dateString: string, timeString: string, lat: number, lng: number, timezone: number) {
  const errors: string[] = [];
  
  // Validate date string
  if (!dateString || typeof dateString !== 'string') {
    errors.push('Date string is required');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      errors.push('Date must be in YYYY-MM-DD format');
    } else {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date provided');
      }
      
      // Check if date is reasonable (not too far in past/future)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        errors.push('Date must be between 1900 and 2100');
      }
    }
  }
  
  // Validate time string
  if (!timeString || typeof timeString !== 'string') {
    errors.push('Time string is required');
  } else {
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(timeString)) {
      errors.push('Time must be in HH:MM:SS format');
    } else {
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      if (hours < 0 || hours > 23) {
        errors.push('Hours must be between 00 and 23');
      }
      if (minutes < 0 || minutes > 59) {
        errors.push('Minutes must be between 00 and 59');
      }
      if (seconds < 0 || seconds > 59) {
        errors.push('Seconds must be between 00 and 59');
      }
    }
  }
  
  // Validate coordinates
  if (typeof lat !== 'number' || isNaN(lat)) {
    errors.push('Latitude must be a valid number');
  } else if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90');
  }
  
  if (typeof lng !== 'number' || isNaN(lng)) {
    errors.push('Longitude must be a valid number');
  } else if (lng < -180 || lng > 180) {
    errors.push('Longitude must be between -180 and 180');
  }
  
  // Validate timezone
  if (typeof timezone !== 'number' || isNaN(timezone)) {
    errors.push('Timezone must be a valid number');
  } else if (timezone < -12 || timezone > 14) {
    errors.push('Timezone must be between -12 and 14');
  }
  
  return errors;
}

/**
 * Calculate the Atmakarak (soul planet) from birth chart with better error handling
 */
function calculateAtmakarak(birthChart: Record<string, any>): string {
  try {
    // Check if birth chart has required structure
    if (!birthChart || typeof birthChart !== 'object') {
      console.warn('Invalid birth chart structure, using default Atmakarak');
      return 'Sun';
    }
    
    if (!birthChart.meta || typeof birthChart.meta !== 'object') {
      console.warn('Birth chart missing meta data, using default Atmakarak');
      return 'Sun';
    }
    
    const planets = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa']; // Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
    let maxDegrees = 0;
    let atmakarak = 'Su'; // Default to Sun
    
    const meta = birthChart.meta as Record<string, { degree?: number }>;
    
    // Track which planets have valid degrees
    const validPlanets: string[] = [];
    
    for (const planet of planets) {
      if (meta[planet] && typeof meta[planet].degree === 'number') {
        const degree = parseFloat(String(meta[planet].degree));
        
        if (!isNaN(degree) && degree >= 0 && degree <= 360) {
          validPlanets.push(planet);
          
          if (degree > maxDegrees) {
            maxDegrees = degree;
            atmakarak = planet;
          }
        } else {
          console.warn(`warning: Invalid degree for planet ${planet}: ${meta[planet].degree}`);
        }
      } else {
        console.warn(`warning: Missing or invalid degree data for planet ${planet}`);
      }
    }
    
    if (validPlanets.length === 0) {
      console.warn('warning: No valid planet degrees found, using default Atmakarak that is Sun');
      return 'Sun';
    }
    
    console.log(`Calculated Atmakarak: ${atmakarak} with ${maxDegrees} degrees (from ${validPlanets.length} valid planets)`);
    
    // Convert planet codes to names
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
  } catch (error) {
    console.error('Error calculating Atmakarak:', error);
    return 'Sun'; // Safe fallback
  }
}

/**
 * Get Vedic astrology birth chart data with comprehensive error handling
 */
export async function getVedicAstrologyData(
  dateString: string,
  timeString: string,
  lat: number,
  lng: number,
  timezone: number = 5.5
): Promise<VedicAstrologyData> {
  console.log(`[${new Date().toISOString()}] Starting astrology calculation for ${dateString} ${timeString} at ${lat}, ${lng}`);
  
  try {
    // Validate all inputs
    const validationErrors = validateAstrologyInput(dateString, timeString, lat, lng, timezone);
    if (validationErrors.length > 0) {
      throw new Error(`Input validation failed: ${validationErrors.join(', ')}`);
    }
    
    // Check if vedic-astrology package is available
    if (!vedicAstrology || !vedicAstrology.positioner || !vedicAstrology.positioner.getBirthChart) {
      throw new Error('Vedic astrology package not properly loaded or missing required methods');
    }
    
    console.log(`[${new Date().toISOString()}] Calling vedic-astrology package...`);
    
    // Call the vedic astrology package
    const birthChart = vedicAstrology.positioner.getBirthChart(
      dateString,
      timeString,
      lat,
      lng,
      timezone
    );
    
    // Validate the birth chart response
    if (!birthChart) {
      throw new Error('Vedic astrology package returned null/undefined birth chart');
    }
    
    if (!birthChart.meta || typeof birthChart.meta !== 'object') {
      throw new Error('Birth chart missing required meta data');
    }
    
    console.log(`[${new Date().toISOString()}] Birth chart calculated successfully`);
    
    // Extract key astrological data with fallbacks
    const moonSign = birthChart.meta.Mo?.rashi || 'Unknown';
    const sunSign = birthChart.meta.Su?.rashi || 'Unknown';
    const ascendant = birthChart.meta.As?.rashi || 'Unknown';
    
    // Calculate Atmakarak with error handling
    const atmakarak = calculateAtmakarak(birthChart);
    
    // Log the results
    console.log(`[${new Date().toISOString()}] Astrology results: Moon=${moonSign}, Sun=${sunSign}, Ascendant=${ascendant}, Atmakarak=${atmakarak}`);
    
    // Validate that we got meaningful results
    if (moonSign === 'Unknown' && sunSign === 'Unknown' && ascendant === 'Unknown') {
      console.warn('All major signs returned as Unknown - birth chart may be invalid');
    }
    
    return {
      moonSign,
      sunSign,
      ascendant,
      atmakarak,
      birthChart,
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Vedic astrology calculation error:`, error);
    
    // Provide more specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('Input validation failed')) {
        throw new Error(`Invalid input parameters: ${error.message}`);
      }
      
      if (error.message.includes('vedic-astrology') || error.message.includes('package')) {
        throw new Error('Astrology calculation service is currently unavailable');
      }
      
      if (error.message.includes('birth chart') || error.message.includes('meta')) {
        throw new Error('Failed to generate valid birth chart data');
      }
      
      // Re-throw with more context
      throw new Error(`Astrology calculation failed: ${error.message}`);
    }
    
    // Unknown error type
    throw new Error('Unknown error occurred during astrology calculation');
  }
}