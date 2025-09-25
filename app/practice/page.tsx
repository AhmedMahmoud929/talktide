"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  setSelectedBook,
  setSelectedFile,
  setAudioSegments,
  setIsAnalyzing,
  setCurrentSegment,
  setIsPlaying,
  setSilenceThreshold,
  setMinSilenceDuration,
  setMinSegmentDuration,
} from "@/redux/features/audio/audioSlice";
import {
  initializePracticeSession,
  setActiveSegment,
  setPracticeMode,
  incrementAttempts,
  markSegmentCompleted,
} from "../../redux/features/practice/practiceSlice";

// Import our components
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { KeyboardShortcutsModal } from "@/components/practice/KeyboardShortcutsModal";
import { AudioControls } from "@/components/practice/AudioControls";
import { SegmentList } from "@/components/practice/SegmentList";
import {
  WaveformVisualization,
  WaveformVisualizationRef,
} from "@/components/practice/WaveformVisualization";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";

export default function PracticeMode() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("book");
  const fileId = searchParams.get("file");

  // State management
  const [playContinuously, setPlayContinuously] = useState(false);
  const [loopCount, setLoopCount] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentLoopIndex, setCurrentLoopIndex] = useState(0);
  const [segmentLoopCounts, setSegmentLoopCounts] = useState<{
    [key: number]: number;
  }>({});

  // Custom segment playback states
  const [segmentCustomSettings, setSegmentCustomSettings] = useState<{
    [key: number]: { speed: number; infiniteLoop: boolean };
  }>({});

  // UX enhancement states
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [lastCompletedSegment, setLastCompletedSegment] = useState<
    number | null
  >(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Redux state
  const dispatch = useAppDispatch();
  const {
    audioBooks,
    selectedBook,
    selectedFile,
    audioSegments,
    isAnalyzing,
    currentSegment,
    isPlaying,
    silenceThreshold,
    minSilenceDuration,
    minSegmentDuration,
  } = useAppSelector((state) => state.audio);

  const { currentSession, activeSegment, practiceMode, sessionStats } =
    useAppSelector((state) => state.practice);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<WaveformVisualizationRef>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // Custom hooks
  const { detectSilenceBasedSegments, drawWaveform } = useAudioAnalysis();

  // Helper functions
  const getCurrentBook = () =>
    audioBooks.find((book) => book.id === selectedBook);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateProgress = () => {
    if (audioSegments.length === 0) return 0;
    const completedCount = Object.values(currentSession).filter(
      (session) => session?.completed
    ).length;
    return (completedCount / audioSegments.length) * 100;
  };

  // Function to stop all audio playback
  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      
      // Call cleanup function if it exists
      if ((audioRef.current as any)._cleanup) {
        (audioRef.current as any)._cleanup();
        (audioRef.current as any)._cleanup = null;
      }
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    dispatch(setActiveSegment(-1));
    setIsAutoPlaying(false);
  };

  // Enhanced handleMarkCompleted with animation
  const handleMarkCompleted = (segmentIndex: number) => {
    dispatch(markSegmentCompleted(segmentIndex));
    setLastCompletedSegment(segmentIndex);

    setTimeout(() => {
      setLastCompletedSegment(null);
    }, 2000);
  };

  const analyzeAudio = async () => {
    if (!selectedFile) return;

    dispatch(setIsAnalyzing(true));

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const response = await fetch(`/audio/${selectedFile}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const segments = detectSilenceBasedSegments(audioBuffer);
      dispatch(setAudioSegments(segments));

      // Draw waveform after segments are detected
      setTimeout(() => {
        const canvas = waveformRef.current?.getCanvas();
        if (canvas) {
          drawWaveform(audioBuffer, canvas);
        }
      }, 100);
    } catch (error) {
      console.error("Error analyzing audio:", error);
    } finally {
      dispatch(setIsAnalyzing(false));
    }
  };

  const playSegment = (
    segmentIndex: number,
    customSpeed?: number,
    infiniteLoop?: boolean
  ) => {
    if (!audioRef.current || segmentIndex >= audioSegments.length) return;

    const segment = audioSegments[segmentIndex];
    const audio = audioRef.current;

    // Stop any current playback and clean up event listeners
    stopAllAudio();

    // Reset loop count only when starting a new segment (not when continuing current segment)
    if (activeSegment !== segmentIndex) {
      setSegmentLoopCounts((prev) => ({
        ...prev,
        [segmentIndex]: 0,
      }));
    }

    // Set active segment
    dispatch(setActiveSegment(segmentIndex));
    setIsAutoPlaying(true);
    
    // Store custom settings for this segment
    if (customSpeed !== undefined || infiniteLoop !== undefined) {
      setSegmentCustomSettings((prev) => ({
        ...prev,
        [segmentIndex]: {
          speed: customSpeed || playbackSpeed,
          infiniteLoop: infiniteLoop || false,
        },
      }));
    }

    // Get settings for this segment (custom or global)
    const segmentSettings = segmentCustomSettings[segmentIndex];
    const effectiveSpeed =
      customSpeed || segmentSettings?.speed || playbackSpeed;
    const effectiveInfiniteLoop =
      infiniteLoop || segmentSettings?.infiniteLoop || false;
    const effectiveLoopCount = effectiveInfiniteLoop ? Infinity : loopCount;

    // Set playback speed
    audio.playbackRate = effectiveSpeed;

    // Start playing from segment start
    audio.currentTime = segment.start;
    audio.play();

    // Create a ref to track if this playback session is still active
    let isActivePlayback = true;

    // Add event listener for precise stopping
    const handleTimeUpdate = () => {
      if (!isActivePlayback || audio.currentTime >= segment.end) {
        audio.pause();
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        
        if (!isActivePlayback) return; // Exit if this session was cancelled

        // Get the current loop count from state
        setSegmentLoopCounts((prev) => {
          const currentLoops = prev[segmentIndex] || 0;
          const newLoopCount = currentLoops + 1;
          
          const updatedCounts = {
            ...prev,
            [segmentIndex]: newLoopCount,
          };

          // Check if we should continue looping
          if (newLoopCount < effectiveLoopCount && isActivePlayback) {
            // Continue looping
            setTimeout(() => {
              if (isActivePlayback && audioRef.current) {
                audioRef.current.currentTime = segment.start;
                audioRef.current.play();
                audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
              }
            }, 100);
          } else {
            // Finished looping (only if not infinite)
            if (!effectiveInfiniteLoop && isActivePlayback) {
              setIsAutoPlaying(false);

              if (playContinuously && segmentIndex < audioSegments.length - 1) {
                // Move to next segment
                setTimeout(() => {
                  if (isActivePlayback) {
                    playSegment(segmentIndex + 1);
                  }
                }, 500);
              } else {
                dispatch(setActiveSegment(-1));
              }
            }
          }

          return updatedCounts;
        });
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    // Store cleanup function to cancel this playback session
    const cleanup = () => {
      isActivePlayback = false;
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Backup timeout in case timeupdate doesn't fire (only if not infinite loop)
    if (!effectiveInfiniteLoop) {
      timeoutRef.current = setTimeout(() => {
        cleanup();
        handleTimeUpdate();
      }, ((segment.end - segment.start + 0.1) * 1000) / effectiveSpeed);
    }

    // Store cleanup function for stopAllAudio to use
    (audioRef.current as any)._cleanup = cleanup;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          if (activeSegment !== -1) {
            const isCurrentlyPlaying =
              audioRef.current && !audioRef.current.paused;
            if (isCurrentlyPlaying) {
              stopAllAudio();
            } else {
              playSegment(activeSegment);
            }
          }
          break;
        case "n":
          e.preventDefault();
          if (activeSegment < audioSegments.length - 1) {
            playSegment(activeSegment + 1);
          }
          break;
        case "p":
          e.preventDefault();
          const prevSegment =
            activeSegment > 0 ? activeSegment - 1 : audioSegments.length - 1;
          dispatch(setActiveSegment(prevSegment));
          break;
        case "c":
          e.preventDefault();
          if (activeSegment !== -1) {
            handleMarkCompleted(activeSegment);
          }
          break;
        case "s":
          e.preventDefault();
          stopAllAudio();
          break;
        case "?":
          e.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [activeSegment, audioSegments.length, showKeyboardShortcuts]);

  // Initialize from URL parameters
  useEffect(() => {
    if (bookId && fileId) {
      dispatch(setSelectedBook(bookId));
      dispatch(setSelectedFile(fileId));
    }
    sessionStartRef.current = Date.now();
  }, [bookId, fileId]);

  // Auto-analyze when audio is ready
  useEffect(() => {
    if (selectedFile && audioRef.current) {
      const timer = setTimeout(() => {
        analyzeAudio();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [selectedFile, audioRef.current]);

  const currentBook = getCurrentBook();

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <PracticeHeader
        bookTitle={currentBook?.title}
        fileId={selectedFile || undefined}
        progress={calculateProgress()}
        onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
      />

      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 sticky top-6 h-fit">
            <AudioControls
              selectedFile={selectedFile || undefined}
              playbackSpeed={playbackSpeed}
              loopCount={loopCount}
              playContinuously={playContinuously}
              isAutoPlaying={isAutoPlaying}
              showAnalysisDialog={showAnalysisDialog}
              silenceThreshold={silenceThreshold}
              minSilenceDuration={minSilenceDuration}
              minSegmentDuration={minSegmentDuration}
              isAnalyzing={isAnalyzing}
              onPlaybackSpeedChange={setPlaybackSpeed}
              onLoopCountChange={setLoopCount}
              onPlayContinuouslyChange={setPlayContinuously}
              onShowAnalysisDialogChange={setShowAnalysisDialog}
              onSilenceThresholdChange={(value) =>
                dispatch(setSilenceThreshold(value))
              }
              onMinSilenceDurationChange={(value) =>
                dispatch(setMinSilenceDuration(value))
              }
              onMinSegmentDurationChange={(value) =>
                dispatch(setMinSegmentDuration(value))
              }
              onReAnalyze={analyzeAudio}
              onPlay={() => setIsAutoPlaying(true)}
              onPause={() => setIsAutoPlaying(false)}
              audioRef={audioRef as any}
            />
          </div>

          {/* Right Column - Segments */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <WaveformVisualization ref={waveformRef} />
            </div>
            <SegmentList
              segments={audioSegments as any}
              currentSession={currentSession}
              activeSegment={activeSegment}
              isAutoPlaying={isAutoPlaying}
              segmentLoopCounts={segmentLoopCounts}
              loopCount={loopCount}
              isAnalyzing={isAnalyzing}
              onPlaySegment={playSegment}
              onStopSegment={stopAllAudio}
              onMarkCompleted={handleMarkCompleted}
              formatTime={formatTime}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
