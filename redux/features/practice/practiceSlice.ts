import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { AudioSegment } from "../audio/audioSlice"

interface PracticeSession {
  segmentIndex: number
  attempts: number
  completed: boolean
  timeSpent: number
}

interface PracticeState {
  currentSession: PracticeSession[]
  activeSegment: number
  practiceMode: "sequential" | "random" | "focused"
  showTranscript: boolean
  sessionStats: {
    totalTime: number
    completedSegments: number
    currentStreak: number
  }
  savedSegments: AudioSegment[]
}

const initialState: PracticeState = {
  currentSession: [],
  activeSegment: -1,
  practiceMode: "sequential",
  showTranscript: false,
  sessionStats: {
    totalTime: 0,
    completedSegments: 0,
    currentStreak: 0,
  },
  savedSegments: [],
}

const practiceSlice = createSlice({
  name: "practice",
  initialState,
  reducers: {
    initializePracticeSession: (state, action: PayloadAction<AudioSegment[]>) => {
      state.savedSegments = action.payload
      state.currentSession = action.payload.map((_, index) => ({
        segmentIndex: index,
        attempts: 0,
        completed: false,
        timeSpent: 0,
      }))
    },
    setActiveSegment: (state, action: PayloadAction<number>) => {
      state.activeSegment = action.payload
    },
    setPracticeMode: (state, action: PayloadAction<"sequential" | "random" | "focused">) => {
      state.practiceMode = action.payload
    },
    setShowTranscript: (state, action: PayloadAction<boolean>) => {
      state.showTranscript = action.payload
    },
    incrementAttempts: (state, action: PayloadAction<number>) => {
      const segmentIndex = action.payload
      const session = state.currentSession.find((s) => s.segmentIndex === segmentIndex)
      if (session) {
        session.attempts += 1
      }
    },
    markSegmentCompleted: (state, action: PayloadAction<number>) => {
      const segmentIndex = action.payload
      const session = state.currentSession.find((s) => s.segmentIndex === segmentIndex)
      if (session && !session.completed) {
        session.completed = true
        session.timeSpent = Date.now()
        state.sessionStats.completedSegments += 1
        state.sessionStats.currentStreak += 1
      }
    },
    toggleSegmentCompleted: (state, action: PayloadAction<number>) => {
      const segmentIndex = action.payload
      const session = state.currentSession.find((s) => s.segmentIndex === segmentIndex)
      if (session) {
        if (session.completed) {
          // Mark as incomplete
          session.completed = false
          session.timeSpent = 0
          state.sessionStats.completedSegments = Math.max(0, state.sessionStats.completedSegments - 1)
          state.sessionStats.currentStreak = 0
        } else {
          // Mark as completed
          session.completed = true
          session.timeSpent = Date.now()
          state.sessionStats.completedSegments += 1
          state.sessionStats.currentStreak += 1
        }
      }
    },
    updateSessionStats: (state, action: PayloadAction<Partial<PracticeState["sessionStats"]>>) => {
      state.sessionStats = { ...state.sessionStats, ...action.payload }
    },
    resetPracticeSession: (state) => {
      state.currentSession = []
      state.activeSegment = -1
      state.sessionStats = {
        totalTime: 0,
        completedSegments: 0,
        currentStreak: 0,
      }
    },
    
  },
})

export const {
  initializePracticeSession,
  setActiveSegment,
  setPracticeMode,
  setShowTranscript,
  incrementAttempts,
  markSegmentCompleted,
  toggleSegmentCompleted,
  updateSessionStats,
  resetPracticeSession,
} = practiceSlice.actions

export default practiceSlice.reducer
