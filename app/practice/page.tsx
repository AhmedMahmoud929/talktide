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
  forceReanalysis,
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
import dynamic from "next/dynamic";
import PdfPageViewer from "@/components/practice/PdfPageViewer";
// import PdfViewer from "@/components/practice/PdfPageViewer";

const PdfViewer = dynamic(() => import("@/components/practice/PdfPageViewer"), {
  ssr: false,
});

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

  // Initialize practice session when audio segments are loaded
  useEffect(() => {
    if (audioSegments.length > 0) {
      dispatch(initializePracticeSession(audioSegments));
    }
  }, [audioSegments, dispatch]);

  const getExplanationPageNumber = () => {
    const bookPadding = getCurrentBook()?.paddingPreUnits || 0;
    const unitNumber = Number(selectedFile.split(".")[0].split("_")[1]);
    const pageNumber = bookPadding + unitNumber + (unitNumber - 1);
    return String(pageNumber);
  };

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
    const segments: AudioSegment[] = [];

    // Enhanced parameters for better sentence detection
    const SILENCE_THRESHOLD = 0.01; // Lower threshold for better sensitivity
    const MIN_SENTENCE_PAUSE = 0.3; // Minimum pause to consider sentence boundary
    const MIN_SEGMENT_DURATION = 1.0; // Minimum segment length
    const MAX_SEGMENT_DURATION = 15.0; // Maximum segment length before forced split
    const ENERGY_DECAY_THRESHOLD = 2.0; // Energy decay ratio for sentence detection
    const CHUNK_SIZE = Math.floor(sampleRate * 0.1); // 100ms chunks for analysis

    let segmentStart = 0;
    let inSilence = false;
    let silenceStart = 0;
    let lastEnergyLevel = 0;

    // Process audio in chunks for better performance and accuracy
    for (let i = 0; i < channelData.length; i += CHUNK_SIZE) {
      const chunk = channelData.slice(
        i,
        Math.min(i + CHUNK_SIZE, channelData.length)
      );

      // Calculate both average amplitude and RMS energy
      const avgAmplitude =
        chunk.reduce((sum, sample) => sum + Math.abs(sample), 0) / chunk.length;
      const rmsEnergy = Math.sqrt(
        chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length
      );

      const timePosition = i / sampleRate;

      // Detect silence with improved sensitivity
      if (
        avgAmplitude < SILENCE_THRESHOLD &&
        rmsEnergy < SILENCE_THRESHOLD * 1.5
      ) {
        if (!inSilence) {
          inSilence = true;
          silenceStart = timePosition;
        }
      } else {
        if (inSilence) {
          const silenceDuration = timePosition - silenceStart;
          const segmentDuration = silenceStart - segmentStart;

          // Enhanced sentence boundary detection
          const isLikelySentenceEnd =
            silenceDuration >= MIN_SENTENCE_PAUSE && // Sufficient pause
            segmentDuration >= MIN_SEGMENT_DURATION && // Minimum content length
            (silenceDuration >= 0.8 || // Long pause (likely sentence end)
              (silenceDuration >= MIN_SENTENCE_PAUSE &&
                lastEnergyLevel > rmsEnergy * ENERGY_DECAY_THRESHOLD)); // Energy decay pattern

          if (isLikelySentenceEnd) {
            // Check if this would create an overly long segment
            if (segmentDuration <= MAX_SEGMENT_DURATION) {
              segments.push({
                start: segmentStart,
                end: silenceStart,
                text: `Sentence ${segments.length + 1}`,
                loopCount: 0,
                maxLoops: loopCount,
                isLooping: false,
              });
              segmentStart = timePosition;
            } else {
              // Split long segment at natural pause points
              const midPoint = segmentStart + segmentDuration / 2;
              const splitPoint = findBestSplitPoint(
                channelData,
                sampleRate,
                segmentStart,
                silenceStart,
                midPoint
              );

              segments.push({
                start: segmentStart,
                end: splitPoint,
                text: `Sentence ${segments.length + 1} (Part A)`,
                loopCount: 0,
                maxLoops: loopCount,
                isLooping: false,
              });

              segments.push({
                start: splitPoint,
                end: silenceStart,
                text: `Sentence ${segments.length} (Part B)`,
                loopCount: 0,
                maxLoops: loopCount,
                isLooping: false,
              });

              segmentStart = timePosition;
            }
          }
          inSilence = false;
        }
        lastEnergyLevel = rmsEnergy;
      }
    }

    // Handle final segment
    const finalDuration = channelData.length / sampleRate - segmentStart;
    if (finalDuration >= MIN_SEGMENT_DURATION) {
      if (finalDuration <= MAX_SEGMENT_DURATION) {
        segments.push({
          start: segmentStart,
          end: channelData.length / sampleRate,
          text: `Sentence ${segments.length + 1}`,
          loopCount: 0,
          maxLoops: loopCount,
          isLooping: false,
        });
      } else {
        // Split final long segment
        const midPoint = segmentStart + finalDuration / 2;
        const splitPoint = findBestSplitPoint(
          channelData,
          sampleRate,
          segmentStart,
          channelData.length / sampleRate,
          midPoint
        );

        segments.push({
          start: segmentStart,
          end: splitPoint,
          text: `Sentence ${segments.length + 1} (Part A)`,
          loopCount: 0,
          maxLoops: loopCount,
          isLooping: false,
        });

        segments.push({
          start: splitPoint,
          end: channelData.length / sampleRate,
          text: `Sentence ${segments.length} (Part B)`,
          loopCount: 0,
          maxLoops: loopCount,
          isLooping: false,
        });
      }
    }

    return segments.length > 0
      ? segments
      : [
          {
            start: 0,
            end: channelData.length / sampleRate,
            text: "Complete Audio",
            loopCount: 0,
            maxLoops: loopCount,
            isLooping: false,
          },
        ];
  };

  // Helper function to find the best split point in long segments
  const findBestSplitPoint = (
    channelData: Float32Array,
    sampleRate: number,
    startTime: number,
    endTime: number,
    preferredTime: number
  ): number => {
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const preferredSample = Math.floor(preferredTime * sampleRate);

    // Search window around preferred split point (±1 second)
    const searchWindow = sampleRate;
    const searchStart = Math.max(startSample, preferredSample - searchWindow);
    const searchEnd = Math.min(endSample, preferredSample + searchWindow);

    let bestSplitSample = preferredSample;
    let lowestEnergy = Infinity;

    // Find the point with lowest energy (likely a natural pause)
    const chunkSize = Math.floor(sampleRate * 0.05); // 50ms chunks

    for (let i = searchStart; i < searchEnd; i += chunkSize) {
      const chunkEnd = Math.min(i + chunkSize, searchEnd);
      let energy = 0;

      for (let j = i; j < chunkEnd; j++) {
        energy += channelData[j] * channelData[j];
      }

      energy = energy / (chunkEnd - i);

      if (energy < lowestEnergy) {
        lowestEnergy = energy;
        bestSplitSample = i + Math.floor((chunkEnd - i) / 2);
      }
    }

    return bestSplitSample / sampleRate;
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

  // Add effect to reset segment loop counts when global loop count changes
  useEffect(() => {
    // Reset all segment loop counts when global loop count changes
    setSegmentLoopCounts({});
    // Also reset the infinite loop flag to prevent infinite loops
    infiniteLoopRef.current = false;
  }, [loopCount]);

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

      // Store custom settings in refs - explicitly handle undefined infiniteLoop
      customSpeedRef.current = customSpeed || playbackSpeed;
      infiniteLoopRef.current = infiniteLoop === true; // Only true if explicitly set to true

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

  // Enhanced useEffect for handling route changes and ensuring fresh analysis
  useEffect(() => {
    const bookId = searchParams.get("book");
    const fileId = searchParams.get("file");

    if (bookId && bookId !== selectedBook) {
      dispatch(setSelectedBook(bookId));
    }

    if (fileId && fileId !== selectedFile) {
      // Clear previous analysis state when file changes
      dispatch(forceReanalysis());

      // Clear analyzed files cache to force re-analysis
      setAnalyzedFiles(new Set());

      // Reset segment loop counts
      setSegmentLoopCounts({});

      // Stop any current audio playback
      stopAllAudio();

      // Set the new file
      dispatch(setSelectedFile(fileId));
    }
  }, [searchParams, selectedBook, selectedFile, dispatch, stopAllAudio]);

  // Modified useEffect to ensure analysis triggers immediately after file change
  useEffect(() => {
    if (
      selectedFile &&
      audioSegments.length === 0 &&
      !isAnalyzing &&
      !analyzedFiles.has(selectedFile)
    ) {
      // Add a small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          analyzeAudio();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [
    selectedFile,
    audioSegments.length,
    isAnalyzing,
    analyzedFiles,
    analyzeAudio,
  ]);

  // Remove the problematic useEffect that was clearing analyzedFiles
  // This was causing issues with the analysis flow
  // useEffect(() => {
  //   if (selectedFile) {
  //     setAnalyzedFiles((prev) => {
  //       const newSet = new Set(prev);
  //       newSet.clear();
  //       return newSet;
  //     });
  //   }
  // }, [selectedFile]);

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

      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
          <div className="lg:col-span-4 space-y-8">
            {/* Audio controls */}

            {/* Waves */}
            {/* <WaveformVisualization ref={waveformRef} /> */}

            {/* Segments */}
            <SegmentList
              formatTime={formatTime}
              onPlaySegment={playSegment}
              onStopSegment={stopAllAudio}
              onMarkCompleted={handleMarkCompleted}
              audioRef={audioRef as any}
            />
          </div>

          <div className="lg:col-span-4 sticky top-4 h-fit">
            <PdfPageViewer
              pdfPath="/pdfs/cambridge-advanced-vocab-in-use.pdf"
              onlyPreview={true}
              autoExtract={true}
              allowFileUpload={false}
              pageNumbers={getExplanationPageNumber()}
            />
          </div>
        </div>

        <div className="bg-gray-100 uppercase rounded-lg h-96 flex-center mt-8">
          Questions soon
        </div>
      </div>
    </div>
  );
}
