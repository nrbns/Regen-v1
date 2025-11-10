export interface BatteryProjectionPoint {
  level: number;
  minutes: number | null;
  label: string;
}

export interface BatteryForecast {
  currentPct: number | null;
  charging: boolean | null;
  slopePerMinute: number | null;
  slopePerHour: number | null;
  minutesToEmpty: number | null;
  minutesToFull: number | null;
  projections: BatteryProjectionPoint[];
  samples: Array<{ timestamp: number; pct: number }>;
}

export interface CarbonForecast {
  currentIntensity: number | null;
  region: string | null;
  slopePerHour: number | null;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  forecastIntensity: number | null;
  confidence: number;
  samples: Array<{ timestamp: number; intensity: number }>;
}

export interface EcoImpactRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'battery' | 'carbon' | 'system';
}

export interface EcoImpactForecast {
  generatedAt: number;
  horizonMinutes: number;
  battery: BatteryForecast;
  carbon: CarbonForecast;
  recommendations: EcoImpactRecommendation[];
  summary: string;
}
