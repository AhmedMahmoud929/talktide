"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export default function PracticeMode() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("book");
  const fileId = searchParams.get("file");
  const [playContinuously, setPlayContinuously] = useState(false);
  const [loopCount, setLoopCount] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentLoopIndex, setCurrentLoopIndex] = useState(0);
  const [segmentLoopCounts, setSegmentLoopCounts] = useState<{
    [key: number]: number;
  }>({});

  // Add new UX enhancement states
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [lastCompletedSegment, setLastCompletedSegment] = useState<
    number | null
  >(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

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

  const {
    currentSession,
    activeSegment,
    practiceMode,
    sessionStats,
  } = useAppSelector((state) => state.practice);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  const getCurrentBook = () =>
    audioBooks.find((book) => book.id === selectedBook);

  // Function to stop all audio playback
  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    // Reset segment loop counts
    setSegmentLoopCounts({});
    // Reset active segment
    dispatch(setActiveSegment(-1));
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
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
      // Wait a bit for audio element to be fully ready
      const timer = setTimeout(() => {
        analyzeAudio();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [selectedFile, audioRef.current]);

  // Enhanced handleMarkCompleted with animation
  const handleMarkCompleted = (segmentIndex: number) => {
    dispatch(markSegmentCompleted(segmentIndex));
    setLastCompletedSegment(segmentIndex);

    // Clear the animation after 2 seconds
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
      setTimeout(() => drawWaveform(audioBuffer), 100);
    } catch (error) {
      console.error("Error analyzing audio:", error);
    } finally {
      dispatch(setIsAnalyzing(false));
    }
  };

  const detectSilenceBasedSegments = (audioBuffer: AudioBuffer) => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    // More reasonable parameters for segment detection
    const threshold = 0.01; // Lower threshold for silence detection
    const minSilenceDuration = 1.0; // 1 second minimum silence
    const minSegmentDuration = 3.0; // 3 seconds minimum segment length
    const maxSegmentDuration = 15.0; // 15 seconds maximum segment length

    const segments = [];
    let segmentStart = 0;
    let inSilence = false;
    let silenceStart = 0;

    // Process audio in chunks for better performance
    const chunkSize = Math.floor(sampleRate * 0.1); // 100ms chunks
    const silenceThresholdSamples = minSilenceDuration * sampleRate;
    const minSegmentSamples = minSegmentDuration * sampleRate;
    const maxSegmentSamples = maxSegmentDuration * sampleRate;

    for (let i = 0; i < channelData.length; i += chunkSize) {
      const chunkEnd = Math.min(i + chunkSize, channelData.length);

      // Calculate RMS (Root Mean Square) for this chunk
      let sum = 0;
      for (let j = i; j < chunkEnd; j++) {
        sum += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sum / (chunkEnd - i));

      const currentTime = i / sampleRate;

      if (rms < threshold) {
        if (!inSilence) {
          silenceStart = currentTime;
          inSilence = true;
        }
      } else {
        if (inSilence && currentTime - silenceStart > minSilenceDuration) {
          // End current segment
          const segmentEnd = silenceStart;
          const segmentDuration = segmentEnd - segmentStart;

          if (segmentDuration >= minSegmentDuration) {
            // Split long segments
            if (segmentDuration > maxSegmentDuration) {
              const numParts = Math.ceil(segmentDuration / maxSegmentDuration);
              const partDuration = segmentDuration / numParts;

              for (let part = 0; part < numParts; part++) {
                const partStart = segmentStart + part * partDuration;
                const partEnd = Math.min(partStart + partDuration, segmentEnd);

                segments.push({
                  start: partStart,
                  end: partEnd,
                  text: `Segment ${segments.length + 1}`,
                  loopCount: 0,
                  maxLoops: 3,
                  isLooping: false,
                });
              }
            } else {
              segments.push({
                start: segmentStart,
                end: segmentEnd,
                text: `Segment ${segments.length + 1}`,
                loopCount: 0,
                maxLoops: 3,
                isLooping: false,
              });
            }
          }

          segmentStart = currentTime;
        }
        inSilence = false;
      }
    }

    // Add final segment if needed
    if (segmentStart < duration) {
      const finalDuration = duration - segmentStart;
      if (finalDuration >= minSegmentDuration) {
        segments.push({
          start: segmentStart,
          end: duration,
          text: `Segment ${segments.length + 1}`,
          loopCount: 0,
          maxLoops: 3,
          isLooping: false,
        });
      }
    }

    return segments;
  };

  const drawWaveform = (audioBuffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / width);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform with minimalistic style
    ctx.strokeStyle = "#9ca3af"; // gray-400
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const startSample = x * samplesPerPixel;
      const endSample = Math.min(startSample + samplesPerPixel, channelData.length);
      
      let min = 1;
      let max = -1;
      
      for (let i = startSample; i < endSample; i++) {
        const sample = channelData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      const y1 = ((min + 1) / 2) * height;
      const y2 = ((max + 1) / 2) * height;
      
      if (x === 0) {
        ctx.moveTo(x, y1);
      } else {
        ctx.lineTo(x, y1);
      }
      ctx.lineTo(x, y2);
    }

    ctx.stroke();

    // Draw segments with minimal style
    audioSegments.forEach((segment, index) => {
      const startX = (segment.start / audioBuffer.duration) * width;
      const endX = (segment.end / audioBuffer.duration) * width;
      
      // Highlight active segment
      if (index === activeSegment) {
        ctx.fillStyle = "rgba(156, 163, 175, 0.1)"; // gray-400 with opacity
        ctx.fillRect(startX, 0, endX - startX, height);
      }
      
      // Draw segment boundaries
      ctx.strokeStyle = "#6b7280"; // gray-500
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();
      
      // Draw segment numbers
      ctx.fillStyle = "#374151"; // gray-700
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const centerX = (startX + endX) / 2;
      ctx.fillText((index + 1).toString(), centerX, height / 2);
    });
  };

  const playSegment = async (segmentIndex: number) => {
    if (!audioRef.current || segmentIndex >= audioSegments.length) return;

    const segment = audioSegments[segmentIndex];
    const audio = audioRef.current;

    // Set playback speed
    audio.playbackRate = playbackSpeed;

    // Stop any current playback
    audio.pause();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Set active segment
    dispatch(setActiveSegment(segmentIndex));

    // Initialize loop count for this segment if not exists
    if (!(segmentIndex in segmentLoopCounts)) {
      setSegmentLoopCounts(prev => ({
        ...prev,
        [segmentIndex]: 0
      }));
    }

    const currentLoops = segmentLoopCounts[segmentIndex] || 0;

    // Add timeupdate listener to ensure precise stopping
    const handleTimeUpdate = () => {
      if (audio.currentTime >= segment.end) {
        audio.pause();
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        
        const newLoopCount = currentLoops + 1;
        setSegmentLoopCounts(prev => ({
          ...prev,
          [segmentIndex]: newLoopCount
        }));

        if (newLoopCount < loopCount) {
          // Continue looping this segment
          setTimeout(() => playSegment(segmentIndex), 200);
        } else {
          // Reset loop count and move to next if continuous play is enabled
          setSegmentLoopCounts(prev => ({
            ...prev,
            [segmentIndex]: 0
          }));
          
          if (playContinuously && segmentIndex < audioSegments.length - 1) {
            setTimeout(() => playSegment(segmentIndex + 1), 500);
          } else {
            setIsAutoPlaying(false);
            dispatch(setActiveSegment(-1));
          }
        }
      }
    };

    try {
      audio.currentTime = segment.start;
      audio.addEventListener('timeupdate', handleTimeUpdate);
      await audio.play();
      setIsAutoPlaying(true);

      // Keep the timeout as a backup
      const duration = (segment.end - segment.start) * 1000 / playbackSpeed;
      timeoutRef.current = setTimeout(() => {
        if (!audio.paused) {
          audio.pause();
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          
          const newLoopCount = currentLoops + 1;
          setSegmentLoopCounts(prev => ({
            ...prev,
            [segmentIndex]: newLoopCount
          }));

          if (newLoopCount < loopCount) {
            setTimeout(() => playSegment(segmentIndex), 200);
          } else {
            setSegmentLoopCounts(prev => ({
              ...prev,
              [segmentIndex]: 0
            }));
            
            if (playContinuously && segmentIndex < audioSegments.length - 1) {
              setTimeout(() => playSegment(segmentIndex + 1), 500);
            } else {
              setIsAutoPlaying(false);
              dispatch(setActiveSegment(-1));
            }
          }
        }
      }, duration + 100); // Add small buffer

    } catch (error) {
      console.error("Error playing segment:", error);
      setIsAutoPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completedCount = currentSession.filter((s) => s.completed).length;
  const progressPercentage =
    audioSegments.length > 0
      ? (completedCount / audioSegments.length) * 100
      : 0;

  if (!selectedBook || !selectedFile) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <h1 className="text-xl font-medium text-gray-800 mb-3">
            Practice Mode
          </h1>
          <p className="text-gray-600 mb-6 text-sm">
            No book or file selected. Please go back and select a book and file.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            Browse Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Minimalistic Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
              >
                ← Back
              </Link>
              <div>
                <h1 className="text-lg font-medium text-gray-800">
                  {getCurrentBook()?.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Keyboard shortcuts */}
              <button
                onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
              >
                Shortcuts
              </button>

              {/* Progress */}
              <div className="text-right">
                <div className="text-xs text-gray-600 mb-1">
                  {completedCount}/{audioSegments.length}
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-gray-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-800">Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Play/Pause</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Next</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">N</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Previous</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">P</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Complete</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">C</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stop</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">S</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-gray-800">Controls</h2>
                
                {/* Analysis Settings Dialog */}
                <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      Analysis
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Analysis Settings</DialogTitle>
                      <DialogDescription className="text-sm">
                        Adjust parameters for better segment detection.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Silence Threshold */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Silence Threshold: {silenceThreshold.toFixed(3)}
                        </label>
                        <Slider
                          value={[silenceThreshold]}
                          onValueChange={(value) => dispatch(setSilenceThreshold(value[0]))}
                          min={0.001}
                          max={0.1}
                          step={0.001}
                          className="w-full"
                        />
                      </div>

                      {/* Min Silence Duration */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Min Silence: {minSilenceDuration.toFixed(1)}s
                        </label>
                        <Slider
                          value={[minSilenceDuration]}
                          onValueChange={(value) => dispatch(setMinSilenceDuration(value[0]))}
                          min={0.1}
                          max={3}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      {/* Min Segment Duration */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Min Segment: {minSegmentDuration.toFixed(1)}s
                        </label>
                        <Slider
                          value={[minSegmentDuration]}
                          onValueChange={(value) => dispatch(setMinSegmentDuration(value[0]))}
                          min={1}
                          max={10}
                          step={0.5}
                          className="w-full"
                        />
                      </div>

                      {/* Re-analyze Button */}
                      <Button
                        onClick={() => {
                          analyzeAudio();
                          setShowAnalysisDialog(false);
                        }}
                        disabled={isAnalyzing}
                        className="w-full bg-gray-800 hover:bg-gray-700"
                        size="sm"
                      >
                        {isAnalyzing ? "Analyzing..." : "Re-analyze"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Audio Player */}
              <div className="mb-4">
                <audio
                  ref={audioRef}
                  src={`/audio/${selectedFile}`}
                  className="w-full"
                  controls
                  onPlay={() => setIsAutoPlaying(true)}
                  onPause={() => setIsAutoPlaying(false)}
                />
              </div>

              {/* Settings */}
              <div className="space-y-4">
                {/* Speed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speed: {playbackSpeed}x
                  </label>
                  <Slider
                    value={[playbackSpeed]}
                    onValueChange={(value) => setPlaybackSpeed(value[0])}
                    min={0.25}
                    max={2}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                {/* Loops */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loops: {loopCount}
                  </label>
                  <Slider
                    value={[loopCount]}
                    onValueChange={(value) => setLoopCount(value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Continuous Play */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Continuous
                  </label>
                  <button
                    onClick={() => setPlayContinuously(!playContinuously)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors",
                      playContinuously ? "bg-gray-600" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                        playContinuously ? "translate-x-5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Segments */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-medium text-gray-800 mb-4">
                Segments
                {isAutoPlaying && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Playing
                  </span>
                )}
              </h2>

              {audioSegments.length > 0 ? (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {audioSegments.map((segment, index) => {
                    const session = currentSession[index];
                    const isActive = activeSegment === index;
                    const isCompleted = session?.completed;
                    const currentLoops = segmentLoopCounts[index] || 0;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-md border transition-all cursor-pointer",
                          isActive
                            ? "border-gray-400 bg-gray-50"
                            : isCompleted
                            ? "border-gray-300 bg-gray-50/50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => playSegment(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {index + 1}
                              </span>
                              {isCompleted && (
                                <span className="text-xs bg-gray-600 text-white px-1.5 py-0.5 rounded">
                                  ✓
                                </span>
                              )}
                              {isActive && (
                                <span className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded">
                                  Playing
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(segment.start)} - {formatTime(segment.end)}
                              {currentLoops > 0 && (
                                <span className="ml-2">
                                  ({currentLoops}/{loopCount})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActive && isAutoPlaying) {
                                  if (audioRef.current) audioRef.current.pause();
                                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                                  setIsAutoPlaying(false);
                                  dispatch(setActiveSegment(-1));
                                } else {
                                  playSegment(index);
                                }
                              }}
                              className="text-xs h-7 px-2"
                            >
                              {isActive && isAutoPlaying ? "Stop" : "Play"}
                            </Button>

                            {!isCompleted && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkCompleted(index);
                                }}
                                className="text-xs h-7 px-2 bg-gray-600 hover:bg-gray-700"
                              >
                                Done
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  {isAnalyzing ? (
                    <div className="text-center">
                      <div className="text-sm">Analyzing...</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-sm">No segments</div>
                      <div className="text-xs mt-1">Click Analysis to start</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Waveform */}
            <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-800 mb-3">Waveform</h3>
              <canvas
                ref={canvasRef}
                width={800}
                height={120}
                className="w-full border border-gray-100 rounded"
              />
            </div>
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🌊</span>
            Waveform
          </h3>
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full border border-gray-200 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
