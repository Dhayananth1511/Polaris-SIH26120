import { create } from 'zustand';
import { replayApi, type ReplayState, type ReplayReading, type ReplayWellReading } from '../services/api';

interface ReplayStore {
  replayState: ReplayState | null;
  isPlaying: boolean;
  speed: number;
  activeWellId: string;
  currentIndex: number;
  totalFrames: number;
  currentReading: ReplayReading | null;
  allWellsReadings: Record<string, ReplayWellReading>;
  isPolling: boolean;

  // Actions
  fetchStatus: () => Promise<void>;
  start: (speed?: number) => Promise<void>;
  pause: () => Promise<void>;
  reset: () => Promise<void>;
  step: (steps?: number) => Promise<void>;
  seek: (frameIndex: number) => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  selectWell: (wellId: string) => Promise<void>;
  initPolling: () => () => void;
}

let pollingInterval: any = null;
let subscriberCount = 0;

export const useReplayStore = create<ReplayStore>((set, get) => ({
  replayState: null,
  isPlaying: false,
  speed: 1.0,
  activeWellId: 'BGW-001',
  currentIndex: 0,
  totalFrames: 400,
  currentReading: null,
  allWellsReadings: {},
  isPolling: false,

  fetchStatus: async () => {
    try {
      const res = await replayApi.getStatus();
      if (res.success && res.data) {
        set({
          replayState: res.data,
          isPlaying: res.data.isPlaying,
          speed: res.data.speed,
          activeWellId: res.data.activeWellId || 'BGW-001',
          currentIndex: res.data.currentIndex,
          totalFrames: res.data.totalFrames || 400,
          currentReading: res.data.currentReading,
          allWellsReadings: res.data.allWellsReadings || {},
        });
      }
    } catch {
      // Backend offline or unreachable
    }
  },

  start: async (speed?: number) => {
    try {
      const res = await replayApi.start(speed);
      if (res.success && res.data) {
        set({
          replayState: res.data,
          isPlaying: true,
          speed: res.data.speed,
          currentIndex: res.data.currentIndex,
          currentReading: res.data.currentReading,
          allWellsReadings: res.data.allWellsReadings || {},
        });
      }
    } catch (err) {
      console.error('Failed to start replay', err);
    }
  },

  pause: async () => {
    try {
      const res = await replayApi.pause();
      if (res.success && res.data) {
        set({
          replayState: res.data,
          isPlaying: false,
          currentIndex: res.data.currentIndex,
          currentReading: res.data.currentReading,
          allWellsReadings: res.data.allWellsReadings || {},
        });
      }
    } catch (err) {
      console.error('Failed to pause replay', err);
    }
  },

  reset: async () => {
    try {
      const res = await replayApi.reset();
      if (res.success && res.data) {
        set({
          replayState: res.data,
          isPlaying: false,
          currentIndex: 0,
          currentReading: res.data.currentReading,
          allWellsReadings: res.data.allWellsReadings || {},
        });
      }
    } catch (err) {
      console.error('Failed to reset replay', err);
    }
  },

  step: async (steps: number = 1) => {
    try {
      const res = await replayApi.step(steps);
      if (res.success && res.data) {
        set({
          replayState: res.data,
          currentIndex: res.data.currentIndex,
          currentReading: res.data.currentReading,
          allWellsReadings: res.data.allWellsReadings || {},
        });
      }
    } catch (err) {
      console.error('Failed to step replay', err);
    }
  },

  seek: async (frameIndex: number) => {
    try {
      const res = await replayApi.seek(frameIndex);
      if (res.success && res.data) {
        set({
          replayState: res.data,
          currentIndex: res.data.currentIndex,
          currentReading: res.data.currentReading,
          allWellsReadings: res.data.allWellsReadings || {},
        });
      }
    } catch (err) {
      console.error('Failed to seek replay', err);
    }
  },

  setSpeed: async (speed: number) => {
    try {
      const res = await replayApi.setSpeed(speed);
      if (res.success && res.data) {
        set({
          replayState: res.data,
          speed: res.data.speed,
        });
      }
    } catch (err) {
      console.error('Failed to set speed', err);
    }
  },

  selectWell: async (wellId: string) => {
    try {
      const res = await replayApi.selectWell(wellId);
      if (res.success && res.data) {
        set({
          replayState: res.data,
          activeWellId: wellId,
          currentReading: res.data.currentReading,
          allWellsReadings: res.data.allWellsReadings || {},
        });
      }
    } catch (err) {
      console.error('Failed to select well', err);
    }
  },

  initPolling: () => {
    subscriberCount++;
    if (!pollingInterval) {
      get().fetchStatus();
      pollingInterval = setInterval(() => {
        get().fetchStatus();
      }, 1500); // 1.5s interval to ensure smooth live telemetry updates
      set({ isPolling: true });
    }

    return () => {
      subscriberCount--;
      if (subscriberCount <= 0 && pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        set({ isPolling: false });
      }
    };
  },
}));
