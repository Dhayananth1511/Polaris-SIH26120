import { create } from 'zustand';
import type { TwinState, SimulationParams, SimulationResult } from '../types';
import { BGW014_TWIN_STATE } from '../data/mockData';
import { simulationEngine } from '../services/simulationEngine';

interface TwinStore {
  currentState: TwinState;
  simulatedState: TwinState | null;
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  simLog: string[];
  hasSimulation: boolean;

  updateCurrentState: (patch: Partial<TwinState>) => void;
  runSimulation: (params: SimulationParams) => Promise<void>;
  resetSimulation: () => void;
  clearSimLog: () => void;
}

export const useTwinStore = create<TwinStore>((set, get) => ({
  currentState: BGW014_TWIN_STATE,
  simulatedState: null,
  simulationResult: null,
  isSimulating: false,
  simLog: [],
  hasSimulation: false,

  updateCurrentState: (patch) =>
    set((s) => ({ currentState: { ...s.currentState, ...patch } })),

  runSimulation: async (params: SimulationParams) => {
    set({ isSimulating: true, simLog: [], hasSimulation: false });

    const steps = [
      'Initializing Digital Twin model...',
      'Loading reservoir state — BGW-014, Cycle 14...',
      'Calculating thermal response to steam parameters...',
      'Calculating viscosity reduction from temperature...',
      'Calculating fluid mobility index...',
      'Calculating SRP mechanical response...',
      'Calculating production rate response...',
      'Calculating equipment loading and risk...',
      'Running joint optimization assessment...',
      'Validating against operating envelope...',
      'Simulation complete.',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 420));
      set((s) => ({
        simLog: [...s.simLog, steps[i]],
      }));
    }

    const current = get().currentState;
    const result = simulationEngine.run(current, params);

    set({
      simulatedState: result.simulated,
      simulationResult: result,
      isSimulating: false,
      hasSimulation: true,
    });
  },

  resetSimulation: () =>
    set({
      simulatedState: null,
      simulationResult: null,
      isSimulating: false,
      simLog: [],
      hasSimulation: false,
    }),

  clearSimLog: () => set({ simLog: [] }),
}));
