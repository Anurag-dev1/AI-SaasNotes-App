import { create } from 'zustand';

const useNotesStore = create((set) => ({
  selectedTag: null,
  viewMode: 'grid', // 'grid' | 'list'
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));

export default useNotesStore;
