/**
 * WeatherSystem — Time-of-day and weather state machine for hub zones.
 *
 * A simple cyclic state machine:
 *   Weather: clear → cloudy → rain → storm → rain → cloudy → clear (with randomness)
 *   Time: dawn → morning → midday → afternoon → dusk → night → dawn
 *
 * Used by the Refuge (debug hub) and faction strongholds.
 * GDD §2.1 — Weather and atmosphere
 */

import {
  type WeatherState,
  type TimeOfDay,
  type WeatherSnapshot,
  WEATHER_TRANSITIONS,
  TIME_CYCLE,
  WEATHER_CHECK_INTERVAL,
  TIME_PERIOD_TICKS,
} from '@ellmud/shared';

export interface WeatherConfig {
  /** Ticks between weather transition checks. */
  weatherCheckInterval: number;
  /** Ticks per time-of-day period. */
  timePeriodTicks: number;
  /** Probability (0–1) of transitioning weather on each check. */
  transitionChance: number;
}

const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  weatherCheckInterval: WEATHER_CHECK_INTERVAL,
  timePeriodTicks: TIME_PERIOD_TICKS,
  transitionChance: 0.3,
};

export class WeatherSystem {
  private weather: WeatherState = 'clear';
  private timeOfDay: TimeOfDay = 'morning';
  private timeIndex = 1; // index into TIME_CYCLE
  private tickCount = 0;
  private ticksInWeather = 0;
  private ticksInTime = 0;
  private readonly config: WeatherConfig;
  private readonly rng: () => number;

  constructor(config?: Partial<WeatherConfig>, rng?: () => number) {
    this.config = { ...DEFAULT_WEATHER_CONFIG, ...config };
    this.rng = rng ?? Math.random;
  }

  /** Get current weather snapshot. */
  getSnapshot(): WeatherSnapshot {
    return {
      weather: this.weather,
      timeOfDay: this.timeOfDay,
      ticksInState: this.ticksInWeather,
    };
  }

  getWeather(): WeatherState {
    return this.weather;
  }

  getTimeOfDay(): TimeOfDay {
    return this.timeOfDay;
  }

  /**
   * Advance one tick. Returns events that occurred.
   */
  tick(): { weatherChanged: boolean; timeChanged: boolean; oldWeather?: WeatherState; oldTime?: TimeOfDay } {
    this.tickCount++;
    this.ticksInWeather++;
    this.ticksInTime++;

    const result: { weatherChanged: boolean; timeChanged: boolean; oldWeather?: WeatherState; oldTime?: TimeOfDay } = {
      weatherChanged: false,
      timeChanged: false,
    };

    // Weather transition check
    if (this.tickCount % this.config.weatherCheckInterval === 0) {
      const oldWeather = this.weather;
      this.tryWeatherTransition();
      if (this.weather !== oldWeather) {
        result.weatherChanged = true;
        result.oldWeather = oldWeather;
        this.ticksInWeather = 0;
      }
    }

    // Time-of-day transition
    if (this.ticksInTime >= this.config.timePeriodTicks) {
      const oldTime = this.timeOfDay;
      this.advanceTime();
      result.timeChanged = true;
      result.oldTime = oldTime;
      this.ticksInTime = 0;
    }

    return result;
  }

  /** Force a weather state (for testing or event triggers). */
  setWeather(weather: WeatherState): void {
    this.weather = weather;
    this.ticksInWeather = 0;
  }

  /** Force a time of day (for testing). */
  setTimeOfDay(time: TimeOfDay): void {
    const index = TIME_CYCLE.indexOf(time);
    if (index >= 0) {
      this.timeOfDay = time;
      this.timeIndex = index;
      this.ticksInTime = 0;
    }
  }

  private tryWeatherTransition(): void {
    if (this.rng() > this.config.transitionChance) return;

    const candidates = WEATHER_TRANSITIONS[this.weather];
    const nextStates = candidates.filter(s => s !== this.weather);
    if (nextStates.length === 0) return;

    this.weather = nextStates[Math.floor(this.rng() * nextStates.length)]!;
  }

  private advanceTime(): void {
    this.timeIndex = (this.timeIndex + 1) % TIME_CYCLE.length;
    this.timeOfDay = TIME_CYCLE[this.timeIndex]!;
  }
}
