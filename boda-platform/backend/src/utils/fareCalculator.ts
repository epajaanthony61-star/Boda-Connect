/**
 * Dynamic Fare Calculation Algorithm
 * 
 * Designed for East African Boda Boda operations with consideration for:
 * - Variable terrain (urban vs rural, hilly areas like Kampala/Kigali)
 * - Peak hour demand surges
 * - Fuel price fluctuations
 * - Distance-based fair pricing
 * 
 * Formula: Total Fare = Base Fare + (Distance × Rate/km) + Terrain Surcharge + Peak Surcharge
 */

export interface FareCalculationInput {
  distanceKm: number;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  timestamp: Date;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hourOfDay: number; // 0-23
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  terrainSurcharge: number;
  peakSurcharge: number;
  surgeMultiplier: number;
  totalFare: number;
  riderEarnings: number;
  platformCommission: number;
  currency: string;
  breakdown: {
    baseFareDescription: string;
    distanceDescription: string;
    terrainDescription: string;
    peakDescription: string;
  };
}

export interface FareConfig {
  baseFare: number;
  ratePerKm: number;
  platformCommissionRate: number; // e.g., 0.10 for 10%
  
  // Terrain multipliers (based on region characteristics)
  terrainMultipliers: {
    flat_urban: number;      // Nairobi CBD, Kampala center
    hilly_urban: number;     // Kampala hills, Kigali
    rural: number;           // Rural roads with poor conditions
    highway: number;         // Major highways (faster, less wear)
  };
  
  // Peak hour configurations (East African traffic patterns)
  peakHours: {
    morning_peak: { start: number; end: number; multiplier: number };
    evening_peak: { start: number; end: number; multiplier: number };
    weekend_night: { start: number; end: number; multiplier: number };
  };
  
  // Minimum and maximum fare bounds
  minFare: number;
  maxFare: number;
}

/**
 * Default fare configuration for Kenya (Nairobi)
 * Can be overridden per region/city
 */
const DEFAULT_FARE_CONFIG_KENYA: FareConfig = {
  baseFare: 80, // KES - covers first 1-2 km
  ratePerKm: 40, // KES per km after base distance
  platformCommissionRate: 0.10, // 10% platform fee
  
  terrainMultipliers: {
    flat_urban: 1.0,
    hilly_urban: 1.15, // 15% extra for hilly terrain
    rural: 1.25,       // 25% extra for rough rural roads
    highway: 0.90,     // 10% discount for highway (less fuel consumption)
  },
  
  peakHours: {
    morning_peak: { start: 6, end: 9, multiplier: 1.3 },   // 6-9 AM rush hour
    evening_peak: { start: 17, end: 20, multiplier: 1.4 }, // 5-8 PM rush hour
    weekend_night: { start: 22, end: 2, multiplier: 1.5 }, // Weekend nightlife (Fri/Sat)
  },
  
  minFare: 80,  // Minimum fare regardless of distance
  maxFare: 2000, // Maximum fare cap for safety
};

/**
 * Fare configuration for Uganda (Kampala)
 */
const DEFAULT_FARE_CONFIG_UGANDA: FareConfig = {
  baseFare: 3000, // UGX
  ratePerKm: 1500, // UGX per km
  platformCommissionRate: 0.10,
  
  terrainMultipliers: {
    flat_urban: 1.0,
    hilly_urban: 1.20, // Kampala is very hilly
    rural: 1.30,
    highway: 0.90,
  },
  
  peakHours: {
    morning_peak: { start: 6, end: 9, multiplier: 1.3 },
    evening_peak: { start: 17, end: 20, multiplier: 1.4 },
    weekend_night: { start: 22, end: 2, multiplier: 1.5 },
  },
  
  minFare: 3000,
  maxFare: 50000,
};

/**
 * Determine terrain type based on coordinates
 * 
 * In production, this would use:
 * - Elevation data (SRTM/ASTER)
 * - Road surface data (OpenStreetMap)
 * - Historical traffic patterns
 * - Local knowledge database
 * 
 * For now, uses simplified logic based on known regions
 */
function determineTerrainType(
  lat: number,
  lon: number,
  countryCode: string = 'KE'
): 'flat_urban' | 'hilly_urban' | 'rural' | 'highway' {
  // Simplified examples - in production, use detailed geospatial analysis
  
  if (countryCode === 'KE') {
    // Nairobi CBD - relatively flat urban
    if (lat > -1.31 && lat < -1.25 && lon > 36.78 && lon < 36.88) {
      return 'flat_urban';
    }
    // Thika Road - major highway
    if (lat > -1.25 && lat < -1.0 && lon > 36.8 && lon < 37.1) {
      return 'highway';
    }
    // Rural areas outside Nairobi
    return 'rural';
  }
  
  if (countryCode === 'UG') {
    // Kampala is famously hilly
    if (lat > 0.28 && lat < 0.38 && lon > 32.5 && lon < 32.65) {
      return 'hilly_urban';
    }
    return 'rural';
  }
  
  if (countryCode === 'RW') {
    // Kigali - land of thousand hills
    return 'hilly_urban';
  }
  
  // Default to flat urban
  return 'flat_urban';
}

/**
 * Check if current time falls within peak hours
 */
function getPeakMultiplier(
  hourOfDay: number,
  dayOfWeek: number,
  peakConfig: FareConfig['peakHours']
): { multiplier: number; reason: string } {
  const { morning_peak, evening_peak, weekend_night } = peakConfig;
  
  // Morning peak (Mon-Sat)
  if (dayOfWeek >= 1 && dayOfWeek <= 6) {
    if (hourOfDay >= morning_peak.start && hourOfDay < morning_peak.end) {
      return {
        multiplier: morning_peak.multiplier,
        reason: 'Morning rush hour (6-9 AM)',
      };
    }
  }
  
  // Evening peak (Mon-Sat)
  if (dayOfWeek >= 1 && dayOfWeek <= 6) {
    if (hourOfDay >= evening_peak.start || hourOfDay < evening_peak.end) {
      if (hourOfDay >= evening_peak.start || hourOfDay < 3) {
        return {
          multiplier: evening_peak.multiplier,
          reason: 'Evening rush hour (5-8 PM)',
        };
      }
    }
  }
  
  // Weekend night (Friday & Saturday)
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    if (hourOfDay >= weekend_night.start || hourOfDay < weekend_night.end) {
      return {
        multiplier: weekend_night.multiplier,
        reason: 'Weekend night surge',
      };
    }
  }
  
  return {
    multiplier: 1.0,
    reason: 'Standard rate',
  };
}

/**
 * Main fare calculation function
 * 
 * @param input - Trip details and context
 * @param config - Fare configuration (defaults to Kenya)
 * @returns Detailed fare breakdown
 */
export function calculateFare(
  input: FareCalculationInput,
  config: FareConfig = DEFAULT_FARE_CONFIG_KENYA
): FareBreakdown {
  const {
    distanceKm,
    pickupLatitude,
    pickupLongitude,
    timestamp,
    dayOfWeek,
    hourOfDay,
  } = input;
  
  // Validate input
  if (distanceKm <= 0) {
    throw new Error('Distance must be greater than 0');
  }
  
  // 1. Calculate base fare
  const baseFare = config.baseFare;
  
  // 2. Calculate distance-based fare
  // First 2km covered by base fare, then charge per km
  const chargeableDistance = Math.max(0, distanceKm - 2);
  const distanceFare = chargeableDistance * config.ratePerKm;
  
  // 3. Determine terrain type and apply surcharge
  const terrainType = determineTerrainType(pickupLatitude, pickupLongitude);
  const terrainMultiplier = config.terrainMultipliers[terrainType];
  const terrainSurcharge = (baseFare + distanceFare) * (terrainMultiplier - 1);
  
  // 4. Calculate peak hour surge
  const { multiplier: peakMultiplier, reason: peakReason } = getPeakMultiplier(
    hourOfDay,
    dayOfWeek,
    config.peakHours
  );
  const peakSurcharge = (baseFare + distanceFare + terrainSurcharge) * (peakMultiplier - 1);
  
  // 5. Calculate total before commission
  let totalFare = baseFare + distanceFare + terrainSurcharge + peakSurcharge;
  
  // Apply surge multiplier (dynamic demand-based pricing)
  const surgeMultiplier = 1.0; // Can be increased based on real-time demand
  totalFare *= surgeMultiplier;
  
  // Enforce min/max fare bounds
  totalFare = Math.max(config.minFare, Math.min(config.maxFare, totalFare));
  
  // 6. Calculate platform commission and rider earnings
  const platformCommission = totalFare * config.platformCommissionRate;
  const riderEarnings = totalFare - platformCommission;
  
  // Round to 2 decimal places
  const round = (n: number) => Math.round(n * 100) / 100;
  
  return {
    baseFare: round(baseFare),
    distanceFare: round(distanceFare),
    terrainSurcharge: round(terrainSurcharge),
    peakSurcharge: round(peakSurcharge),
    surgeMultiplier: round(surgeMultiplier),
    totalFare: round(totalFare),
    riderEarnings: round(riderEarnings),
    platformCommission: round(platformCommission),
    currency: config === DEFAULT_FARE_CONFIG_UGANDA ? 'UGX' : 'KES',
    breakdown: {
      baseFareDescription: `Base fare (first 2km)`,
      distanceDescription: `${chargeableDistance.toFixed(2)} km × ${config.ratePerKm}/km`,
      terrainDescription: `${terrainType.replace('_', ' ')} terrain (${((terrainMultiplier - 1) * 100).toFixed(0)}% surcharge)`,
      peakDescription: peakReason,
    },
  };
}

/**
 * Estimate fare for a route (used in passenger app before booking)
 */
export function estimateFare(
  distanceKm: number,
  pickupLat: number,
  pickupLon: number,
  config?: FareConfig
): FareBreakdown {
  const now = new Date();
  return calculateFare(
    {
      distanceKm,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLon,
      dropoffLatitude: 0, // Not needed for estimation
      dropoffLongitude: 0,
      timestamp: now,
      dayOfWeek: now.getDay(),
      hourOfDay: now.getHours(),
    },
    config
  );
}

/**
 * Get fare configuration for a specific country/region
 */
export function getFareConfigForRegion(countryCode: string): FareConfig {
  switch (countryCode.toUpperCase()) {
    case 'UG':
      return DEFAULT_FARE_CONFIG_UGANDA;
    case 'KE':
    default:
      return DEFAULT_FARE_CONFIG_KENYA;
  }
}

// Export configs for customization via admin panel
export { DEFAULT_FARE_CONFIG_KENYA, DEFAULT_FARE_CONFIG_UGANDA };
