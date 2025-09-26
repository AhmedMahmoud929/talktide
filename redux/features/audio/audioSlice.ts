import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AudioSegment {
  start: number;
  end: number;
  text?: string;
  loopCount: number;
  maxLoops: number;
  isLooping: boolean;
}

export interface AudioBook {
  id: string;
  title: string;
  description: string;
  color: string;
  files: string[];
  units: number;
  totalDuration: string;
  paddingPreUnits?: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  category: "Vocabulary" | "Grammar" | "Listening" | "Speaking";
}

interface AudioState {
  audioBooks: AudioBook[];
  selectedBook: string;
  selectedFile: string;
  audioSegments: AudioSegment[];
  isAnalyzing: boolean;
  currentSegment: number;
  isPlaying: boolean;
  playMode: "single" | "continue";
  volume: number;
  playbackSpeed: number;
  loopCount: number; // Add this
  silenceThreshold: number;
  minSilenceDuration: number;
  minSegmentDuration: number;
  selectedSegments: number[];
}

const initialState: AudioState = {
  audioBooks: [
    {
      id: "cambridge-vocab-advanced",
      title: "Cambridge Vocabulary Advanced in Use",
      description:
        "Advanced vocabulary building exercises with comprehensive audio content",
      color: "blue",
      files: [
        "U_001.A.mp3",
        "U_001.B.mp3",
        "U_001.C.mp3",
        "U_002.A.mp3",
        "U_002.B.mp3",
      ],
      units: 2,
      paddingPreUnits: 9,
      totalDuration: "10:00",
      difficulty: "Advanced",
      category: "Vocabulary",
    },
    {
      id: "cambridge-grammar-intermediate",
      title: "Cambridge Grammar Intermediate in Use",
      description: "Intermediate grammar exercises and practice",
      color: "green",
      files: ["G_001.A.mp3", "G_001.B.mp3", "G_002.A.mp3"],
      units: 2,
      totalDuration: "8:30",
      difficulty: "Intermediate",
      category: "Grammar",
    },
    {
      id: "cambridge-listening-advanced",
      title: "Cambridge Listening Advanced Skills",
      description: "Advanced listening comprehension and skills development",
      color: "purple",
      files: ["L_001.A.mp3", "L_001.B.mp3", "L_002.A.mp3"],
      units: 2,
      totalDuration: "12:15",
      difficulty: "Advanced",
      category: "Listening",
    },
  ],
  selectedBook: "",
  selectedFile: "",
  audioSegments: [],
  isAnalyzing: false,
  currentSegment: -1,
  isPlaying: false,
  playMode: "single",
  volume: 1,
  playbackSpeed: 1,
  loopCount: 1, // Add this
  silenceThreshold: 0.01,
  minSilenceDuration: 0.5,
  minSegmentDuration: 1.0,
  selectedSegments: [],
};

const audioSlice = createSlice({
  name: "audio",
  initialState,
  reducers: {
    setSelectedBook: (state, action: PayloadAction<string>) => {
      state.selectedBook = action.payload;
      state.selectedFile = "";
      state.audioSegments = [];
      state.currentSegment = -1;
      state.selectedSegments = [];
    },

    setSelectedFile: (state, action: PayloadAction<string>) => {
      // Clear related state when file changes to ensure fresh analysis
      if (state.selectedFile !== action.payload) {
        state.selectedFile = action.payload;
        state.audioSegments = [];
        state.currentSegment = -1;
        state.isPlaying = false;
        state.isAnalyzing = false;
        state.selectedSegments = [];
      }
    },
    setAudioSegments: (state, action: PayloadAction<AudioSegment[]>) => {
      state.audioSegments = action.payload;
    },
    setIsAnalyzing: (state, action: PayloadAction<boolean>) => {
      state.isAnalyzing = action.payload;
    },
    setCurrentSegment: (state, action: PayloadAction<number>) => {
      state.currentSegment = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setPlayMode: (state, action: PayloadAction<"single" | "continue">) => {
      state.playMode = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
    setLoopCount: (state, action: PayloadAction<number>) => {
      state.loopCount = action.payload;
    },
    setSilenceThreshold: (state, action: PayloadAction<number>) => {
      state.silenceThreshold = action.payload;
    },
    setMinSilenceDuration: (state, action: PayloadAction<number>) => {
      state.minSilenceDuration = action.payload;
    },
    setMinSegmentDuration: (state, action: PayloadAction<number>) => {
      state.minSegmentDuration = action.payload;
    },
    updateSegmentLoops: (
      state,
      action: PayloadAction<{ segmentIndex: number; maxLoops: number }>
    ) => {
      const { segmentIndex, maxLoops } = action.payload;
      if (state.audioSegments[segmentIndex]) {
        state.audioSegments[segmentIndex].maxLoops = Math.max(1, maxLoops);
      }
    },
    updateAllSegmentLoops: (state, action: PayloadAction<number>) => {
      state.audioSegments.forEach((segment) => {
        segment.maxLoops = Math.max(1, action.payload);
      });
    },
    toggleSegmentSelection: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      const currentIndex = state.selectedSegments.indexOf(index);
      if (currentIndex >= 0) {
        state.selectedSegments.splice(currentIndex, 1);
      } else {
        state.selectedSegments.push(index);
      }
    },
    selectAllSegments: (state) => {
      state.selectedSegments = state.audioSegments.map((_, index) => index);
    },
    clearSelection: (state) => {
      state.selectedSegments = [];
    },
    resetAudioState: (state) => {
      state.selectedFile = "";
      state.audioSegments = [];
      state.currentSegment = -1;
      state.selectedSegments = [];
      state.isPlaying = false;
      state.isAnalyzing = false;
      state.selectedSegments = [];
    },
    forceReanalysis: (state) => {
      state.audioSegments = [];
      state.currentSegment = -1;
      state.isPlaying = false;
      state.isAnalyzing = false;
      state.selectedSegments = [];
    },
  },
});

export const {
  setSelectedBook,
  setSelectedFile,
  setAudioSegments,
  setIsAnalyzing,
  setCurrentSegment,
  setIsPlaying,
  setPlayMode,
  setVolume,
  setPlaybackSpeed,
  setLoopCount,
  setSilenceThreshold,
  setMinSilenceDuration,
  setMinSegmentDuration,
  updateSegmentLoops,
  updateAllSegmentLoops,
  toggleSegmentSelection,
  selectAllSegments,
  clearSelection,
  resetAudioState,
  forceReanalysis,
} = audioSlice.actions;

export default audioSlice.reducer;
