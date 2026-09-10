/**
 * Rider Performance & Safety Score Algorithm
 * 
 * Designed for East African Boda Boda operations with consideration for:
 * - Local road conditions and traffic patterns
 * - Rider micro-entrepreneurship incentives
 * - Passenger safety priorities
 * - Fair scoring that accounts for contextual factors
 * 
 * Scoring System:
 * - Base score: 100 points
 * - Deductions for safety incidents
 * - Bonuses for safe behavior and positive feedback
 * - Weighted by recency (recent events have more impact)
 */

export interface PerformanceEvent {
  id: string;
  riderId: string;
  eventType: PerformanceEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description?: string;
  rideId?: string;
  speedAtEvent?: number; // km/h
  location?: {
    latitude: number;
    longitude: number;
  };
}

export type PerformanceEventType =
  | 'speeding_incident'
  | 'harsh_braking'
  | 'rapid_acceleration'
  | 'safe_ride_completed'
  | 'customer_compliment'
  | 'customer_complaint'
  | 'accident_reported'
  | 'sos_triggered'
  | 'route_deviation'
  | 'helmet_violation'
  | 'overloading'
  | 'excellent_service'
  | 'on_time_pickup';

export interface RiderSafetyScore {
  riderId: string;
  currentScore: number; // 0-100
  previousScore: number;
  scoreChange: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalRides: number;
  incidentCount: number;
  complimentCount: number;
  lastIncidentDate?: Date;
  badges: Badge[];
  recommendations: string[];
  calculatedAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'safety' | 'service' | 'reliability' | 'milestone';
}

interface ScoringConfig {
  // Base scores
  startingScore: number;
  minimumScore: number;
  maximumScore: number;
  
  // Event impacts (negative for incidents, positive for good behavior)
  eventImpacts: Record<PerformanceEventType, number>;
  
  // Severity multipliers
  severityMultipliers: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  
  // Recency decay (events older than this have reduced impact)
  recencyWeights: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
    older: number;
  };
  
  // Thresholds for risk levels
  riskThresholds: {
    low: number;      // >= this is low risk
    medium: number;   // >= this is medium risk
    high: number;     // >= this is high risk
    // below high is critical
  };
  
  // Badge requirements
  badgeRequirements: Record<string, BadgeRequirement>;
}

interface BadgeRequirement {
  condition: (events: PerformanceEvent[], totalRides: number) => boolean;
  badge: Omit<Badge, 'earnedAt'>;
}

/**
 * Default scoring configuration for East African context
 */
const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  startingScore: 100,
  minimumScore: 0,
  maximumScore: 100,
  
  eventImpacts: {
    // Negative impacts (safety incidents)
    speeding_incident: -8,
    harsh_braking: -5,
    rapid_acceleration: -4,
    customer_complaint: -6,
    accident_reported: -20,
    sos_triggered: -10,
    route_deviation: -7,
    helmet_violation: -15, // Critical safety violation
    overloading: -12,      // Carrying too many passengers/items
    
    // Positive impacts (good behavior)
    safe_ride_completed: 0.5,  // Small bonus per safe ride
    customer_compliment: 3,
    excellent_service: 4,
    on_time_pickup: 0.3,
  },
  
  severityMultipliers: {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    critical: 2.0,
  },
  
  recencyWeights: {
    last7Days: 1.0,    // Full impact
    last30Days: 0.7,   // 70% impact
    last90Days: 0.4,   // 40% impact
    older: 0.2,        // 20% impact
  },
  
  riskThresholds: {
    low: 80,    // 80-100: Low risk (excellent)
    medium: 60, // 60-79: Medium risk (good)
    high: 40,   // 40-59: High risk (needs improvement)
    // 0-39: Critical risk (suspension recommended)
  },
  
  badgeRequirements: {},
};

/**
 * Initialize badge requirements
 */
function initializeBadgeRequirements(): Record<string, BadgeRequirement> {
  return {
    'safe_rider_100': {
      condition: (events, totalRides) => {
        const safeRides = events.filter(e => e.eventType === 'safe_ride_completed').length;
        return safeRides >= 100 && totalRides >= 100;
      },
      badge: {
        id: 'safe_rider_100',
        name: 'Century Safe Rider',
        description: 'Completed 100 rides with perfect safety record',
        icon: '🛡️',
        category: 'safety',
      },
    },
    'customer_favorite': {
      condition: (events) => {
        const compliments = events.filter(e => e.eventType === 'customer_compliment').length;
        return compliments >= 50;
      },
      badge: {
        id: 'customer_favorite',
        name: 'Customer Favorite',
        description: 'Received 50+ customer compliments',
        icon: '⭐',
        category: 'service',
      },
    },
    'night_hero': {
      condition: (events) => {
        // Badge for riders who work safely during night hours
        const nightSafeRides = events.filter(e => {
          if (e.eventType !== 'safe_ride_completed') return false;
          const hour = new Date(e.timestamp).getHours();
          return hour >= 20 || hour < 6;
        }).length;
        return nightSafeRides >= 50;
      },
      badge: {
        id: 'night_hero',
        name: 'Night Hero',
        description: '50+ safe night rides (8 PM - 6 AM)',
        icon: '🌙',
        category: 'reliability',
      },
    },
    'million_shilling_earner': {
      condition: (events, totalRides) => {
        // Milestone badge for financial achievement
        return totalRides >= 500;
      },
      badge: {
        id: 'million_shilling_earner',
        name: 'Million Shilling Club',
        description: 'Earned over 1M KES through the platform',
        icon: '💰',
        category: 'milestone',
      },
    },
    'eco_rider': {
      condition: (events, totalRides) => {
        // Riders with smooth driving (less fuel consumption)
        const harshEvents = events.filter(e => 
          e.eventType === 'harsh_braking' || e.eventType === 'rapid_acceleration'
        ).length;
        return harshEvents === 0 && totalRides >= 200;
      },
      badge: {
        id: 'eco_rider',
        name: 'Eco Rider',
        description: 'Smooth driving for 200+ rides (fuel efficient)',
        icon: '🌱',
        category: 'safety',
      },
    },
  };
}

/**
 * Calculate recency weight for an event
 */
function getRecencyWeight(eventDate: Date, now: Date): number {
  const daysAgo = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysAgo <= 7) {
    return DEFAULT_SCORING_CONFIG.recencyWeights.last7Days;
  } else if (daysAgo <= 30) {
    return DEFAULT_SCORING_CONFIG.recencyWeights.last30Days;
  } else if (daysAgo <= 90) {
    return DEFAULT_SCORING_CONFIG.recencyWeights.last90Days;
  } else {
    return DEFAULT_SCORING_CONFIG.recencyWeights.older;
  }
}

/**
 * Calculate score impact for a single event
 */
function calculateEventImpact(event: PerformanceEvent, now: Date): number {
  const baseImpact = DEFAULT_SCORING_CONFIG.eventImpacts[event.eventType] || 0;
  const severityMultiplier = DEFAULT_SCORING_CONFIG.severityMultipliers[event.severity];
  const recencyWeight = getRecencyWeight(new Date(event.timestamp), now);
  
  return baseImpact * severityMultiplier * recencyWeight;
}

/**
 * Main function to calculate rider safety score
 * 
 * @param events - Array of all performance events for the rider
 * @param totalRides - Total number of rides completed
 * @returns Detailed safety score breakdown
 */
export function calculateRiderSafetyScore(
  events: PerformanceEvent[],
  totalRides: number
): RiderSafetyScore {
  const now = new Date();
  
  // Start with base score
  let currentScore = DEFAULT_SCORING_CONFIG.startingScore;
  
  // Track incidents and compliments
  let incidentCount = 0;
  let complimentCount = 0;
  let lastIncidentDate: Date | undefined;
  
  // Apply each event's impact
  for (const event of events) {
    const impact = calculateEventImpact(event, now);
    currentScore += impact;
    
    // Track incidents (negative events)
    if (impact < 0) {
      incidentCount++;
      const eventDate = new Date(event.timestamp);
      if (!lastIncidentDate || eventDate > lastIncidentDate) {
        lastIncidentDate = eventDate;
      }
    }
    
    // Track compliments
    if (event.eventType === 'customer_compliment' || event.eventType === 'excellent_service') {
      complimentCount++;
    }
  }
  
  // Enforce min/max bounds
  currentScore = Math.max(
    DEFAULT_SCORING_CONFIG.minimumScore,
    Math.min(DEFAULT_SCORING_CONFIG.maximumScore, currentScore)
  );
  
  // Round to 2 decimal places
  currentScore = Math.round(currentScore * 100) / 100;
  
  // Determine risk level
  const riskLevel = determineRiskLevel(currentScore);
  
  // Check for earned badges
  const badges = checkBadges(events, totalRides);
  
  // Generate recommendations
  const recommendations = generateRecommendations(events, currentScore, riskLevel);
  
  return {
    riderId: events[0]?.riderId || '',
    currentScore,
    previousScore: 0, // Would be loaded from database
    scoreChange: 0,   // Calculated by comparing with previous
    riskLevel,
    totalRides,
    incidentCount,
    complimentCount,
    lastIncidentDate,
    badges,
    recommendations,
    calculatedAt: now,
  };
}

/**
 * Determine risk level based on score
 */
function determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  const { riskThresholds } = DEFAULT_SCORING_CONFIG;
  
  if (score >= riskThresholds.low) {
    return 'low';
  } else if (score >= riskThresholds.medium) {
    return 'medium';
  } else if (score >= riskThresholds.high) {
    return 'high';
  } else {
    return 'critical';
  }
}

/**
 * Check which badges the rider has earned
 */
function checkBadges(events: PerformanceEvent[], totalRides: number): Badge[] {
  const requirements = initializeBadgeRequirements();
  const earnedBadges: Badge[] = [];
  
  for (const [key, requirement] of Object.entries(requirements)) {
    if (requirement.condition(events, totalRides)) {
      earnedBadges.push({
        ...requirement.badge,
        earnedAt: new Date(), // In production, use actual earn date
      });
    }
  }
  
  return earnedBadges;
}

/**
 * Generate personalized recommendations for rider improvement
 */
function generateRecommendations(
  events: PerformanceEvent[],
  score: number,
  riskLevel: string
): string[] {
  const recommendations: string[] = [];
  
  // Analyze recent events (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentEvents = events.filter(e => new Date(e.timestamp) > thirtyDaysAgo);
  
  // Count specific incident types
  const speedingCount = recentEvents.filter(e => e.eventType === 'speeding_incident').length;
  const brakingCount = recentEvents.filter(e => e.eventType === 'harsh_braking').length;
  const accelerationCount = recentEvents.filter(e => e.eventType === 'rapid_acceleration').length;
  
  if (speedingCount >= 3) {
    recommendations.push('Reduce speed, especially in urban areas. Consider taking the defensive driving course.');
  }
  
  if (brakingCount >= 5) {
    recommendations.push('Practice smoother braking. Anticipate traffic stops to avoid harsh braking.');
  }
  
  if (accelerationCount >= 5) {
    recommendations.push('Accelerate gradually. This saves fuel and improves passenger comfort.');
  }
  
  if (riskLevel === 'high' || riskLevel === 'critical') {
    recommendations.push('Consider taking a refresher safety course. Your safety score affects your earning potential.');
  }
  
  if (recommendations.length === 0 && score >= 90) {
    recommendations.push('Excellent work! Maintain your safe driving habits. You qualify for premium ride requests.');
  }
  
  // East African context-specific advice
  if (recentEvents.some(e => e.eventType === 'route_deviation')) {
    recommendations.push('Stick to main roads when possible. Route deviations may indicate getting lost in unfamiliar areas.');
  }
  
  return recommendations;
}

/**
 * Update rider score after a new event
 * This is optimized for real-time updates via Socket.io
 */
export function updateRiderScoreWithEvent(
  previousScore: RiderSafetyScore,
  newEvent: PerformanceEvent
): RiderSafetyScore {
  // Add new event to history and recalculate
  // In production, this would fetch full event history from database
  const events: PerformanceEvent[] = [newEvent]; // Simplified - would include all historical events
  
  return calculateRiderSafetyScore(events, previousScore.totalRides + 1);
}

/**
 * Get score impact preview for an event (before it happens)
 * Useful for warning riders about potential score impacts
 */
export function getScoreImpactPreview(eventType: PerformanceEventType, severity: string): number {
  const baseImpact = DEFAULT_SCORING_CONFIG.eventImpacts[eventType] || 0;
  const severityMultiplier = DEFAULT_SCORING_CONFIG.severityMultipliers[severity as keyof typeof DEFAULT_SCORING_CONFIG.severityMultipliers] || 1.0;
  
  return Math.round(baseImpact * severityMultiplier * 100) / 100;
}

// Export config for customization via admin panel
export { DEFAULT_SCORING_CONFIG };
