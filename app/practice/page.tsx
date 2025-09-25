"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  setSelectedBook,
  setSelectedFile,
  setAudioSegments,
  setIsAnalyzing,
  setIsPlaying,
  type AudioSegment,
} from "@/redux/features/audio/audioSlice";
import {
  initializePracticeSession,
  setActiveSegment,
  markSegmentCompleted,
} from "../../redux/features/practice/practiceSlice";

import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { KeyboardShortcutsModal } from "@/components/practice/KeyboardShortcutsModal";
import { AudioControls } from "@/components/practice/AudioControls";
import { SegmentList } from "@/components/practice/SegmentList";
import {
  WaveformVisualization,
  type WaveformVisualizationRef,
} from "@/components/practice/WaveformVisualization";

export default function PracticeMode() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  // Redux state
  const {
    audioBooks,
    selectedBook,
    selectedFile,
    audioSegments,
    isAnalyzing,
    playbackSpeed,
    loopCount,
    playMode,
    isPlaying,
  } = useAppSelector((state) => state.audio);

  const { currentSession, activeSegment } = useAppSelector(
    (state) => state.practice
  );

  // Local state for UI only
  const [segmentLoopCounts, setSegmentLoopCounts] = useState<{
    [key: number]: number;
  }>({});
  const [analyzedFiles, setAnalyzedFiles] = useState<Set<string>>(new Set());

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<WaveformVisualizationRef>(null);
  const isMountedRef = useRef(true);
  const currentSegmentIndexRef = useRef<number>(-1);
  const isPlayingSegmentRef = useRef<boolean>(false);
  const customSpeedRef = useRef<number>(1);
  const infiniteLoopRef = useRef<boolean>(false);

  const playContinuously = playMode === "continue";

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getCurrentBook = () =>
    audioBooks.find((book) => book.id === selectedBook);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateProgress = () => {
    if (audioSegments.length === 0) return 0;
    const completedCount = currentSession.filter(
      (session) => session?.completed
    ).length;
    return (completedCount / audioSegments.length) * 100;
  };

  const detectSentenceBasedSegments = (
    audioBuffer: AudioBuffer
  ): AudioSegment[] => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const threshold = 0.003;
    const minSilenceDuration = 0.2;
    const minSegmentDuration = 0.8;
    const maxSegmentDuration = 6.0;

    const segments: AudioSegment[] = [];
    let segmentStart = 0;
    let inSilence = false;
    let silenceStart = 0;

    const chunkSize = Math.floor(sampleRate * 0.02);

    for (let i = 0; i < channelData.length; i += chunkSize) {
      const chunk = channelData.slice(i, i + chunkSize);
      const avgAmplitude =
        chunk.reduce((sum, sample) => sum + Math.abs(sample), 0) / chunk.length;
      const timePosition = i / sampleRate;

      if (avgAmplitude < threshold) {
        if (!inSilence) {
          inSilence = true;
          silenceStart = timePosition;
        }
      } else {
        if (inSilence) {
          const silenceDuration = timePosition - silenceStart;
          const segmentDuration = silenceStart - segmentStart;

          if (
            silenceDuration >= minSilenceDuration &&
            segmentDuration >= minSegmentDuration
          ) {
            segments.push({
              start: segmentStart,
              end: silenceStart,
              text: `Segment ${segments.length + 1}`,
              loopCount: 0,
              maxLoops: loopCount,
              isLooping: false,
            });
            segmentStart = timePosition;
          }
          inSilence = false;
        }
      }
    }

    const finalDuration = channelData.length / sampleRate - segmentStart;
    if (finalDuration >= minSegmentDuration) {
      segments.push({
        start: segmentStart,
        end: channelData.length / sampleRate,
        text: `Segment ${segments.length + 1}`,
        loopCount: 0,
        maxLoops: loopCount,
        isLooping: false,
      });
    }

    const finalSegments: AudioSegment[] = [];
    segments.forEach((segment) => {
      const duration = segment.end - segment.start;
      if (duration > maxSegmentDuration) {
        const numParts = Math.ceil(duration / maxSegmentDuration);
        const partDuration = duration / numParts;

        for (let i = 0; i < numParts; i++) {
          finalSegments.push({
            start: segment.start + i * partDuration,
            end: segment.start + (i + 1) * partDuration,
            text: `${segment.text} (Part ${i + 1})`,
            loopCount: 0,
            maxLoops: loopCount,
            isLooping: false,
          });
        }
      } else {
        finalSegments.push(segment);
      }
    });

    console.log(`Generated ${finalSegments.length} segments`);
    return finalSegments;
  };

  const handleSegmentEnd = useCallback(
    (segmentIndex: number) => {
      console.log(`[v0] Segment ${segmentIndex} ended`);

      if (!isMountedRef.current) return;

      const currentLoops = segmentLoopCounts[segmentIndex] || 0;
      const newLoopCount = currentLoops + 1;

      // Use infinite loop setting if enabled, otherwise use global or segment-specific loop count
      const targetLoops = infiniteLoopRef.current ? Infinity : loopCount;

      console.log(
        `[v0] Loop ${newLoopCount}/${
          infiniteLoopRef.current ? "∞" : targetLoops
        } for segment ${segmentIndex}`
      );

      // Update loop count
      setSegmentLoopCounts((prev) => ({
        ...prev,
        [segmentIndex]: newLoopCount,
      }));

      if (newLoopCount < targetLoops || infiniteLoopRef.current) {
        // Continue looping this segment
        console.log(
          `[v0] Looping segment ${segmentIndex}, loop ${newLoopCount}/${
            infiniteLoopRef.current ? "∞" : targetLoops
          }`
        );
        setTimeout(() => {
          if (isMountedRef.current) {
            playSegment(
              segmentIndex,
              customSpeedRef.current,
              infiniteLoopRef.current
            );
          }
        }, 100);
      } else if (playContinuously && segmentIndex < audioSegments.length - 1) {
        // Move to next segment
        console.log(`[v0] Moving to next segment: ${segmentIndex + 1}`);
        setTimeout(() => {
          if (isMountedRef.current) {
            playSegment(segmentIndex + 1);
          }
        }, 500);
      } else {
        // Stop playback
        console.log(
          `[v0] Stopping playback: completed all loops for segment ${segmentIndex}`
        );
        stopAllAudio();
      }
    },
    [segmentLoopCounts, loopCount, playContinuously, audioSegments.length]
  );

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (
      !audio ||
      !isPlayingSegmentRef.current ||
      currentSegmentIndexRef.current === -1
    ) {
      return;
    }

    const segmentIndex = currentSegmentIndexRef.current;
    const segment = audioSegments[segmentIndex];

    if (!segment) return;

    // Check if we've reached or passed the end time
    if (audio.currentTime >= segment.end) {
      console.log(
        `[v0] Segment ${segmentIndex} reached end at ${audio.currentTime.toFixed(
          3
        )}s (target: ${segment.end.toFixed(3)}s)`
      );

      // Stop the audio immediately
      audio.pause();

      // Remove the timeupdate listener to prevent further calls
      audio.removeEventListener("timeupdate", handleTimeUpdate);

      // Reset to start of segment
      audio.currentTime = segment.start;

      // Mark as not playing
      isPlayingSegmentRef.current = false;

      // Handle what happens next (looping, next segment, or stop)
      handleSegmentEnd(segmentIndex);
    }
  }, [audioSegments, handleSegmentEnd]);

  const stopAllAudio = useCallback(() => {
    console.log(`[v0] Stopping all audio playback`);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
    }

    isPlayingSegmentRef.current = false;
    currentSegmentIndexRef.current = -1;

    if (isMountedRef.current) {
      dispatch(setActiveSegment(-1));
      dispatch(setIsPlaying(false));
    }
  }, [dispatch, handleTimeUpdate]);

  const playSegment = useCallback(
    (segmentIndex: number, customSpeed?: number, infiniteLoop?: boolean) => {
      if (
        !audioRef.current ||
        segmentIndex >= audioSegments.length ||
        segmentIndex < 0 ||
        !isMountedRef.current
      )
        return;

      const segment = audioSegments[segmentIndex];
      const audio = audioRef.current;

      console.log(
        `[v0] Playing segment ${segmentIndex}: ${segment.start.toFixed(
          3
        )}s - ${segment.end.toFixed(3)}s`
      );

      // Store custom settings in refs
      customSpeedRef.current = customSpeed || playbackSpeed;
      infiniteLoopRef.current = infiniteLoop || false;

      // Stop any current playback
      stopAllAudio();

      // Reset loop count if this is a new segment or if we're starting fresh
      if (currentSegmentIndexRef.current !== segmentIndex) {
        setSegmentLoopCounts((prev) => ({
          ...prev,
          [segmentIndex]: 0,
        }));
      }

      // Update refs and state
      currentSegmentIndexRef.current = segmentIndex;
      isPlayingSegmentRef.current = true;

      if (isMountedRef.current) {
        dispatch(setActiveSegment(segmentIndex));
        dispatch(setIsPlaying(true));
      }

      // Set audio properties
      const effectiveSpeed = customSpeed || playbackSpeed;
      audio.playbackRate = effectiveSpeed;
      audio.currentTime = segment.start;

      // Add the timeupdate listener
      audio.addEventListener("timeupdate", handleTimeUpdate);

      // Start playing
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Error playing audio:", error);
          if (isMountedRef.current) {
            stopAllAudio();
          }
        });
      }
    },
    [audioSegments, playbackSpeed, dispatch, stopAllAudio, handleTimeUpdate]
  );

  const analyzeAudio = useCallback(async () => {
    if (
      !selectedFile ||
      !isMountedRef.current ||
      analyzedFiles.has(selectedFile)
    )
      return;

    console.log("Starting audio analysis for:", selectedFile);
    dispatch(setIsAnalyzing(true));

    setAnalyzedFiles((prev) => new Set(prev).add(selectedFile));

    try {
      const response = await fetch(`/audio/${selectedFile}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      let audioContext: AudioContext;
      try {
        audioContext = new AudioContext();
      } catch (error) {
        console.error("Failed to create AudioContext:", error);
        throw new Error("Audio context not supported in this browser");
      }

      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error("Failed to decode audio data:", error);
        throw new Error(
          "Unable to decode audio file. Please ensure it's a valid MP3 file."
        );
      }

      const segments = detectSentenceBasedSegments(audioBuffer);

      if (isMountedRef.current) {
        dispatch(setAudioSegments(segments));
        console.log(`Analysis complete: ${segments.length} segments found`);
      }

      await audioContext.close();
    } catch (error) {
      console.error("Error analyzing audio:", error);
      if (isMountedRef.current) {
        setAnalyzedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(selectedFile);
          return newSet;
        });

        alert(
          `Error loading audio file: ${selectedFile}. ${
            error instanceof Error
              ? error.message
              : "Please make sure the file exists in the /public/audio/ directory and is a valid MP3 file."
          }`
        );
      }
    } finally {
      if (isMountedRef.current) {
        dispatch(setIsAnalyzing(false));
      }
    }
  }, [selectedFile, analyzedFiles, dispatch]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === "true"
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ":
          event.preventDefault();
          if (activeSegment !== -1) {
            if (isPlaying) {
              stopAllAudio();
            } else {
              playSegment(activeSegment);
            }
          }
          break;
        case "arrowleft":
          event.preventDefault();
          if (activeSegment > 0) {
            playSegment(activeSegment - 1);
          }
          break;
        case "arrowright":
          event.preventDefault();
          if (activeSegment < audioSegments.length - 1) {
            playSegment(activeSegment + 1);
          }
          break;
        case "r":
          event.preventDefault();
          if (activeSegment !== -1) {
            playSegment(activeSegment);
          }
          break;
        case "m":
          event.preventDefault();
          if (activeSegment !== -1) {
            handleMarkCompleted(activeSegment);
          }
          break;
        case "s":
          event.preventDefault();
          stopAllAudio();
          break;
        case "?":
          event.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    activeSegment,
    isPlaying,
    audioSegments.length,
    playSegment,
    stopAllAudio,
  ]);

  useEffect(() => {
    const bookId = searchParams.get("book");
    const fileId = searchParams.get("file");

    if (bookId && bookId !== selectedBook) {
      dispatch(setSelectedBook(bookId));
    }

    if (fileId && fileId !== selectedFile) {
      dispatch(setSelectedFile(fileId));
    }
  }, [searchParams, selectedBook, selectedFile, dispatch]);

  useEffect(() => {
    if (audioSegments.length > 0 && isMountedRef.current) {
      dispatch(initializePracticeSession(audioSegments));
    }
  }, [audioSegments, dispatch]);

  useEffect(() => {
    if (
      selectedFile &&
      audioSegments.length === 0 &&
      !isAnalyzing &&
      !analyzedFiles.has(selectedFile)
    ) {
      analyzeAudio();
    }
  }, [
    selectedFile,
    audioSegments.length,
    isAnalyzing,
    analyzedFiles,
    analyzeAudio,
  ]);

  useEffect(() => {
    if (selectedFile) {
      setAnalyzedFiles((prev) => {
        const newSet = new Set(prev);
        newSet.clear();
        return newSet;
      });
    }
  }, [selectedFile]);

  // Remove the conflicting effect that was interfering with playback
  // This was causing issues with the custom playback control

  const handleMarkCompleted = (segmentIndex: number) => {
    dispatch(markSegmentCompleted(segmentIndex));
  };

  if (selectedFile && !selectedFile.endsWith(".mp3")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Invalid Audio File
          </h2>
          <p className="text-gray-600">Please select a valid MP3 audio file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PracticeHeader />

      <KeyboardShortcutsModal />

      <audio
        ref={audioRef}
        src={selectedFile ? `/audio/${selectedFile}` : undefined}
        style={{ display: "none" }}
        onLoadedData={() => console.log(`[v0] Audio loaded: ${selectedFile}`)}
        onError={(e) => console.error(`[v0] Audio error:`, e)}
      />

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 sticky top-6 h-fit">
            <AudioControls audioRef={audioRef as any} />
          </div>

          <div className="lg:col-span-3">
            <div className="mb-4">
              <WaveformVisualization ref={waveformRef} />
            </div>
            <SegmentList
              formatTime={formatTime}
              onPlaySegment={playSegment}
              onStopSegment={stopAllAudio}
              onMarkCompleted={handleMarkCompleted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
