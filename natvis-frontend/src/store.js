import { create } from 'zustand';

const useStore = create((set) => ({
  // Modal state
  identifyOpen: false,
  speciesModalName: null,
  chatDrawerName: null,

  // Results from identification
  identifyResults: null,
  identifyQuery: {},

  // Scroll progress (0-1)
  scrollProgress: 0,

  // Actions
  openIdentify: () => set({ identifyOpen: true }),
  closeIdentify: () => set({ identifyOpen: false }),

  openSpecies: (name) => set({ speciesModalName: name }),
  closeSpecies: () => set({ speciesModalName: null }),

  openChat: (name) => set({ chatDrawerName: name ?? '__general__' }),
  closeChat: () => set({ chatDrawerName: null }),

  setIdentifyResults: (results, query) => set({ identifyResults: results, identifyQuery: query }),
  clearIdentifyResults: () => set({ identifyResults: null, identifyQuery: {} }),

  setScrollProgress: (p) => set({ scrollProgress: p }),
}));

export default useStore;
