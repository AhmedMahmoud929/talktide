import { configureStore } from '@reduxjs/toolkit';
import audioSlice from './features/audio/audioSlice';
import practiceSlice from './features/practice/practiceSlice';

export const store = configureStore({
  reducer: {
    audio: audioSlice,
    practice: practiceSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;