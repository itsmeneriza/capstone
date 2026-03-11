/**
 * Forecast Calculations Utility
 * Uses historical data to predict future reservation patterns
 */

export interface Historicalreservation {
  id: string;
  roomId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  purpose: string;
  paymentStatus: string;
}

export interface ForecastResult {
  date: string;
  predictedreservations: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  peakHours: string[];
  avgAttendees: number;
  utilizationRate: number;
}

export interface ForecastStats {
  totalreservations: number;
  avgreservationsPerWeek: number;
  avgreservationsPerDay: number;
  avgDuration: number;
  avgAttendees: number;
  peakDays: string[];
  peakHours: string[];
  mostCommonPurposes: { purpose: string; count: number }[];
  utilizationRate: number;
}

/**
 * Calculate forecast statistics from historical data
 */
export function calculateHistoricalStats(
  historicalData: Historicalreservation[],
  roomId?: string
): ForecastStats {
  // Filter by room if specified
  const relevantreservations = roomId
    ? historicalData.filter((b) => b.roomId === roomId)
    : historicalData;

  if (relevantreservations.length === 0) {
    return {
      totalreservations: 0,
      avgreservationsPerWeek: 0,
      avgreservationsPerDay: 0,
      avgDuration: 0,
      avgAttendees: 0,
      peakDays: [],
      peakHours: [],
      mostCommonPurposes: [],
      utilizationRate: 0,
    };
  }

  // Calculate total reservations
  const totalreservations = relevantreservations.length;

  // Calculate date range
  const dates = relevantreservations.map((b) => new Date(b.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const daysDiff = Math.ceil(
    (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weeksDiff = daysDiff / 7;

  // Calculate averages
  const avgreservationsPerWeek = weeksDiff > 0 ? totalreservations / weeksDiff : 0;
  const avgreservationsPerDay = daysDiff > 0 ? totalreservations / daysDiff : 0;

  // Calculate average duration
  const totalDuration = relevantreservations.reduce((sum, b) => {
    const start = parseTime(b.startTime);
    const end = parseTime(b.endTime);
    return sum + (end - start);
  }, 0);
  const avgDuration = totalDuration / totalreservations;

  // Calculate average attendees
  const totalAttendees = relevantreservations.reduce(
    (sum, b) => sum + b.attendees,
    0
  );
  const avgAttendees = totalAttendees / totalreservations;

  // Find peak days (day of week)
  const dayCount: { [key: string]: number } = {};
  relevantreservations.forEach((b) => {
    const date = new Date(b.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    dayCount[dayName] = (dayCount[dayName] || 0) + 1;
  });
  const peakDays = Object.entries(dayCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);

  // Find peak hours
  const hourCount: { [key: string]: number } = {};
  relevantreservations.forEach((b) => {
    const hour = parseInt(b.startTime.split(':')[0]);
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const timeSlot = `${displayHour}:00 ${period}`;
    hourCount[timeSlot] = (hourCount[timeSlot] || 0) + 1;
  });
  const peakHours = Object.entries(hourCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  // Find most common purposes
  const purposeCount: { [key: string]: number } = {};
  relevantreservations.forEach((b) => {
    const purpose = b.purpose.split(' ').slice(0, 3).join(' '); // First 3 words
    purposeCount[purpose] = (purposeCount[purpose] || 0) + 1;
  });
  const mostCommonPurposes = Object.entries(purposeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([purpose, count]) => ({ purpose, count }));

  // Calculate utilization rate (assuming 12 hours available per day, 7 AM - 7 PM)
  const totalAvailableHours = daysDiff * 12;
  const totalUsedHours = totalDuration;
  const utilizationRate = (totalUsedHours / totalAvailableHours) * 100;

  return {
    totalreservations,
    avgreservationsPerWeek,
    avgreservationsPerDay,
    avgDuration,
    avgAttendees,
    peakDays,
    peakHours,
    mostCommonPurposes,
    utilizationRate,
  };
}

/**
 * Generate 7-day forecast based on historical data
 */
export function generateForecast(
  historicalData: Historicalreservation[],
  roomId: string,
  startDate: Date = new Date()
): ForecastResult[] {
  const stats = calculateHistoricalStats(historicalData, roomId);
  const forecasts: ForecastResult[] = [];

  // Get day-of-week patterns from historical data
  const dayOfWeekPattern = getDayOfWeekPattern(historicalData, roomId);

  for (let i = 1; i <= 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    // Base prediction on historical average
    const basereservations = stats.avgreservationsPerDay;

    // Adjust for day of week pattern
    const dayMultiplier = dayOfWeekPattern[dayOfWeek] || 1;
    const predictedreservations = Math.max(
      0,
      Math.round(basereservations * dayMultiplier)
    );

    // Calculate confidence based on data volume
    // More historical data = higher confidence
    const dataVolumeConfidence = Math.min(95, 60 + stats.totalreservations * 0.5);
    
    // Reduce confidence for predictions further in the future
    const timeDecay = 1 - (i * 0.03); // 3% reduction per day
    const confidence = Math.round(dataVolumeConfidence * timeDecay);

    // Determine trend
    const previousDayPattern = dayOfWeekPattern[(dayOfWeek + 6) % 7] || 1;
    let trend: 'up' | 'down' | 'stable';
    if (dayMultiplier > previousDayPattern * 1.1) {
      trend = 'up';
    } else if (dayMultiplier < previousDayPattern * 0.9) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    // Predict peak hours for this day
    const peakHours = stats.peakHours.slice(0, 2);

    forecasts.push({
      date: date.toISOString().split('T')[0],
      predictedreservations,
      confidence,
      trend,
      peakHours,
      avgAttendees: Math.round(stats.avgAttendees),
      utilizationRate: Math.round(stats.utilizationRate),
    });
  }

  return forecasts;
}

/**
 * Get reservation pattern by day of week
 */
function getDayOfWeekPattern(
  historicalData: Historicalreservation[],
  roomId: string
): { [day: number]: number } {
  const roomreservations = historicalData.filter((b) => b.roomId === roomId);
  
  if (roomreservations.length === 0) {
    return { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
  }

  // Count reservations per day of week
  const dayCount: { [day: number]: number } = {};
  const dayOccurrences: { [day: number]: number } = {};

  roomreservations.forEach((b) => {
    const date = new Date(b.date);
    const day = date.getDay();
    dayCount[day] = (dayCount[day] || 0) + 1;
  });

  // Count how many times each day appears in the date range
  const dates = roomreservations.map((b) => new Date(b.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  
  for (
    let d = new Date(minDate);
    d <= maxDate;
    d.setDate(d.getDate() + 1)
  ) {
    const day = d.getDay();
    dayOccurrences[day] = (dayOccurrences[day] || 0) + 1;
  }

  // Calculate average reservations per day of week
  const avgPerDay: { [day: number]: number } = {};
  for (let day = 0; day < 7; day++) {
    const count = dayCount[day] || 0;
    const occurrences = dayOccurrences[day] || 1;
    avgPerDay[day] = count / occurrences;
  }

  // Calculate overall average
  const overallAvg =
    Object.values(avgPerDay).reduce((sum, val) => sum + val, 0) / 7;

  // Create multiplier pattern (relative to overall average)
  const pattern: { [day: number]: number } = {};
  for (let day = 0; day < 7; day++) {
    pattern[day] = overallAvg > 0 ? avgPerDay[day] / overallAvg : 1;
  }

  return pattern;
}

/**
 * Parse time string to hours (decimal)
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes || 0) / 60;
}

/**
 * Get optimization suggestions based on historical data
 */
export function getOptimizationSuggestions(
  historicalData: Historicalreservation[],
  roomId: string
): string[] {
  const stats = calculateHistoricalStats(historicalData, roomId);
  const suggestions: string[] = [];

  // Peak hours suggestion
  if (stats.peakHours.length > 0) {
    suggestions.push(
      `Best times to book: ${stats.peakHours.join(', ')} have historically been the most popular time slots.`
    );
  }

  // Duration suggestion
  if (stats.avgDuration > 0) {
    suggestions.push(
      `Optimal reservation duration: Most reservations last ${stats.avgDuration.toFixed(1)} hours on average. Plan accordingly for best results.`
    );
  }

  // Utilization suggestion
  if (stats.utilizationRate < 50) {
    suggestions.push(
      `Low utilization (${stats.utilizationRate.toFixed(0)}%): Consider promoting this space during off-peak hours to increase reservations.`
    );
  } else if (stats.utilizationRate > 75) {
    suggestions.push(
      `High demand (${stats.utilizationRate.toFixed(0)}% utilization): Book early to secure your preferred time slots. Alternative rooms may be needed during peak times.`
    );
  }

  // Day of week suggestion
  if (stats.peakDays.length > 0) {
    suggestions.push(
      `Peak days: ${stats.peakDays.join(', ')} see the highest reservation rates. Book alternative days for more flexibility.`
    );
  }

  return suggestions;
}
