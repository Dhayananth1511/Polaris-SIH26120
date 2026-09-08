import type { TwinState, SimulationParams, SimulationResult } from '../types';

// ─── Physics Constants ────────────────────────────────────────────────────
const PHYSICS = {
  BASE_VISCOSITY: 2400,          // cP at 50°C
  VISCOSITY_REF_TEMP: 50,
  VISCOSITY_EXPONENT: 0.042,
  STEAM_TEMP_FACTOR: 0.018,     // °C per tonne steam (simplified)
  MOBILITY_BASE: 0.15,
  BASE_OIL_RATE: 55,            // BPD at optimal conditions
  EFFICIENCY_ROD_FACTOR: 0.012,
  RISK_EFFICIENCY_FACTOR: 0.008,
  RISK_TEMPERATURE_FACTOR: 0.003,
  RISK_ROD_THRESHOLD: 5.5,      // kN
  MAX_ROD_LOAD: 8.0,
  SOR_BASE: 2.4,
  ENERGY_BASE: 35,              // kWh/bbl
};

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

// ─── Individual Physics Functions ─────────────────────────────────────────
export function calculateTemperature(baseTemp: number, steamVolume: number, soakTime: number): number {
  const steamEffect = steamVolume * PHYSICS.STEAM_TEMP_FACTOR;
  const soakEffect  = (soakTime - 18) * 0.4;
  return clamp(baseTemp + steamEffect + soakEffect, 45, 110);
}

export function calculateViscosity(temperature: number): number {
  // Simplified Arrhenius-like relationship for heavy oil
  const deltaT = temperature - PHYSICS.VISCOSITY_REF_TEMP;
  return clamp(PHYSICS.BASE_VISCOSITY * Math.exp(-PHYSICS.VISCOSITY_EXPONENT * deltaT), 150, 8000);
}

export function calculateMobility(viscosity: number): number {
  // Mobility = k * kr / mu (simplified, k*kr = constant)
  return clamp(PHYSICS.MOBILITY_BASE * (1000 / viscosity), 0.01, 1.5);
}

export function calculateProduction(mobility: number, spm: number, strokeLength: number): number {
  const pumpVolume = (strokeLength / 72) * (spm / 10);
  return clamp(PHYSICS.BASE_OIL_RATE * mobility * pumpVolume, 5, 90);
}

export function calculateRodLoad(viscosity: number, spm: number, depth: number): number {
  const viscFactor = clamp(viscosity / 1500, 0.5, 3.0);
  const spmFactor  = clamp(spm / 10, 0.6, 1.5);
  const depthFactor = depth / 852;
  return clamp(4.2 * viscFactor * spmFactor * depthFactor, 2.0, PHYSICS.MAX_ROD_LOAD);
}

export function calculatePumpEfficiency(viscosity: number, rodLoad: number, vfd: number): number {
  const viscPenalty = clamp((viscosity - 500) / 2000, 0, 0.4);
  const loadPenalty = clamp((rodLoad - 4.0) / 8.0, 0, 0.25);
  const vfdBonus    = clamp((vfd - 35) / 100, 0, 0.05);
  return clamp((0.88 - viscPenalty - loadPenalty + vfdBonus) * 100, 30, 95);
}

export function calculateFailureRisk(rodLoad: number, pumpEfficiency: number, temperature: number): number {
  const loadRisk       = clamp((rodLoad - PHYSICS.RISK_ROD_THRESHOLD) / 4.0, 0, 0.5);
  const efficiencyRisk = clamp((65 - pumpEfficiency) / 100, 0, 0.3);
  const tempRisk       = clamp((75 - temperature) / 200, 0, 0.2);
  return clamp(0.05 + loadRisk + efficiencyRisk + tempRisk, 0.02, 0.95);
}

export function calculateSOR(oilRate: number, steamVolume: number): number {
  // SOR = tonnes steam / BBL oil (simplified monthly)
  const monthlyOil = oilRate * 30;
  return clamp(steamVolume / monthlyOil, 1.5, 8.0);
}

export function calculateEnergyConsumption(oilRate: number, spm: number, vfd: number): number {
  const pumpEnergy = (spm / 10) * (vfd / 38) * 22;
  return clamp(PHYSICS.ENERGY_BASE + pumpEnergy / Math.max(oilRate, 5), 25, 80);
}

// ─── Simulation Engine ─────────────────────────────────────────────────────
class SimulationEngineClass {
  run(current: TwinState, params: SimulationParams): SimulationResult {
    const temperature     = calculateTemperature(current.reservoir.temperature, params.steamVolume, params.soakTime);
    const viscosity       = calculateViscosity(temperature);
    const mobility        = calculateMobility(viscosity);
    const oilRate         = calculateProduction(mobility, params.spm, params.strokeLength);
    const rodLoad         = calculateRodLoad(viscosity, params.spm, current.reservoir.depth);
    const pumpEfficiency  = calculatePumpEfficiency(viscosity, rodLoad, params.vfd);
    const failureRisk     = calculateFailureRisk(rodLoad, pumpEfficiency, temperature);
    const sor             = calculateSOR(oilRate, params.steamVolume);
    const energyConsumption = calculateEnergyConsumption(oilRate, params.spm, params.vfd);
    const steamPenetration = clamp(current.reservoir.steamPenetration + (params.steamVolume - current.css.steamVolume) / 80, 20, 95);

    const simulated: TwinState = {
      ...current,
      timestamp: new Date().toISOString(),
      reservoir: {
        ...current.reservoir,
        temperature,
        viscosity,
        steamPenetration,
        pressure: clamp(current.reservoir.pressure + (params.injectionPressure - current.css.injectionPressure) * 0.1, 15, 50),
      },
      wellbore: {
        ...current.wellbore,
        temperature: temperature * 0.92,
        pressure: clamp(params.injectionPressure * 0.85, 20, 45),
        flowRate: oilRate * 0.18,
      },
      css: {
        ...current.css,
        steamVolume: params.steamVolume,
        injectionPressure: params.injectionPressure,
        soakTime: params.soakTime,
      },
      srp: {
        ...current.srp,
        spm: params.spm,
        strokeLength: params.strokeLength,
        vfd: params.vfd,
        rodLoad,
        pumpEfficiency,
      },
      production: {
        oilRate,
        waterCut: clamp(current.production.waterCut - (oilRate - current.production.oilRate) * 0.3, 20, 75),
        sor,
        grossRate: oilRate / (1 - current.production.waterCut / 100),
        energyConsumption,
      },
      health: {
        failureRisk,
        rodCondition: rodLoad < 5.0 ? 'Good' : rodLoad < 6.5 ? 'Fair' : 'Poor',
        pumpCondition: pumpEfficiency > 70 ? 'Good' : pumpEfficiency > 55 ? 'Degraded' : 'Poor',
        overallHealth: clamp(100 - failureRisk * 60 - (100 - pumpEfficiency) * 0.4, 20, 98),
      },
    };

    const improvements = {
      oilRate:        ((oilRate - current.production.oilRate) / current.production.oilRate) * 100,
      sor:            ((sor - current.production.sor) / current.production.sor) * 100,
      energy:         ((energyConsumption - current.production.energyConsumption) / current.production.energyConsumption) * 100,
      rodLoad:        ((rodLoad - current.srp.rodLoad) / current.srp.rodLoad) * 100,
      pumpEfficiency: ((pumpEfficiency - current.srp.pumpEfficiency) / current.srp.pumpEfficiency) * 100,
      failureRisk:    ((failureRisk - current.health.failureRisk) / current.health.failureRisk) * 100,
    };

    const safetyCheck =
      params.injectionPressure <= 50 &&
      params.spm <= 14 &&
      rodLoad <= PHYSICS.MAX_ROD_LOAD &&
      params.steamVolume <= 1500;

    const confidence = clamp(0.75 + (safetyCheck ? 0.12 : -0.10) - failureRisk * 0.15, 0.5, 0.97);

    return {
      id: `SIM-${Date.now()}`,
      timestamp: new Date().toISOString(),
      wellId: current.wellId,
      params,
      baseline: current,
      simulated,
      improvements,
      confidence,
      safetyCheck,
    };
  }
}

export const simulationEngine = new SimulationEngineClass();
