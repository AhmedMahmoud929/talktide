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
  setShowTranscript,
  incrementAttempts,
  markSegmentCompleted,
} from "../../redux/features/practice/practiceSlice";

export default function PracticeMode() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("book");
  const fileId = searchParams.get("file");

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
    showTranscript,
    sessionStats,
  } = useAppSelector((state) => state.practice);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  const getCurrentBook = () =>
    audioBooks.find((book) => book.id === selectedBook);

  // Initialize from URL parameters
  useEffect(() => {
    if (bookId && fileId) {
      dispatch(setSelectedBook(bookId));
      dispatch(setSelectedFile(fileId));

      // Auto-analyze audio when page loads
      setTimeout(() => {
        analyzeAudio();
      }, 500);
    }
    sessionStartRef.current = Date.now();
  }, [bookId, fileId]);

  // Initialize practice session when segments are ready
  useEffect(() => {
    if (audioSegments.length > 0) {
      dispatch(initializePracticeSession(audioSegments));
    }
  }, [audioSegments]);

  const analyzeAudio = async () => {
    if (!selectedFile || !audioRef.current) return;

    dispatch(setIsAnalyzing(true));

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const response = await fetch(`/audio/${selectedFile}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const segments = detectSilenceBasedSegments(audioBuffer);
      dispatch(setAudioSegments(segments));

      drawWaveform(audioBuffer);
    } catch (error) {
      console.error("Error analyzing audio:", error);
    } finally {
      dispatch(setIsAnalyzing(false));
    }
  };

  const detectSilenceBasedSegments = (audioBuffer: AudioBuffer) => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const segments = [];

    let silenceStart = -1;
    let segmentStart = 0;

    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      const timeInSeconds = i / sampleRate;

      if (amplitude < silenceThreshold) {
        if (silenceStart === -1) {
          silenceStart = timeInSeconds;
        }
      } else {
        if (silenceStart !== -1) {
          const silenceDuration = timeInSeconds - silenceStart;

          if (silenceDuration >= minSilenceDuration) {
            const segmentDuration = silenceStart - segmentStart;

            if (segmentDuration >= minSegmentDuration) {
              segments.push({
                start: segmentStart,
                end: silenceStart,
                loopCount: 0,
                maxLoops: 1,
                isLooping: false,
              });
              segmentStart = timeInSeconds;
            }
          }
          silenceStart = -1;
        }
      }
    }

    const finalDuration = channelData.length / sampleRate - segmentStart;
    if (finalDuration >= minSegmentDuration) {
      segments.push({
        start: segmentStart,
        end: channelData.length / sampleRate,
        loopCount: 0,
        maxLoops: 1,
        isLooping: false,
      });
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

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1;
    ctx.beginPath();

    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = channelData[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }

    ctx.stroke();

    // Draw segment boundaries
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    audioSegments.forEach((segment) => {
      const x = (segment.start / audioBuffer.duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    // Highlight current segment
    if (currentSegment >= 0 && currentSegment < audioSegments.length) {
      const segment = audioSegments[currentSegment];
      const startX = (segment.start / audioBuffer.duration) * width;
      const endX = (segment.end / audioBuffer.duration) * width;

      ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
      ctx.fillRect(startX, 0, endX - startX, height);
    }
  };

  const playSegment = (segmentIndex: number) => {
    if (!audioRef.current || segmentIndex >= audioSegments.length) return;

    const segment = audioSegments[segmentIndex];
    dispatch(setCurrentSegment(segmentIndex));
    dispatch(setActiveSegment(segmentIndex));
    dispatch(setIsPlaying(true));
    dispatch(incrementAttempts(segmentIndex));

    audioRef.current.currentTime = segment.start;
    audioRef.current.play();

    const checkPosition = () => {
      if (audioRef.current && audioRef.current.currentTime >= segment.end) {
        audioRef.current.pause();
        dispatch(setIsPlaying(false));
      }
    };

    const interval = setInterval(checkPosition, 100);

    audioRef.current.onended = () => {
      clearInterval(interval);
      dispatch(setIsPlaying(false));
    };

    audioRef.current.onpause = () => {
      clearInterval(interval);
      dispatch(setIsPlaying(false));
    };
  };

  const handleMarkCompleted = (segmentIndex: number) => {
    dispatch(markSegmentCompleted(segmentIndex));
  };

  const getNextSegment = () => {
    const incomplete = currentSession.filter((s) => !s.completed);
    if (incomplete.length === 0) return -1;

    switch (practiceMode) {
      case "sequential":
        return incomplete[0].segmentIndex;
      case "random":
        return incomplete[Math.floor(Math.random() * incomplete.length)]
          .segmentIndex;
      case "focused":
        const sorted = incomplete.sort((a, b) => b.attempts - a.attempts);
        return sorted[0].segmentIndex;
      default:
        return incomplete[0].segmentIndex;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completedCount = currentSession.filter((s) => s.completed).length;
  const progressPercentage =
    audioSegments.length > 0
      ? (completedCount / audioSegments.length) * 100
      : 0;

  if (!bookId || !fileId) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Practice Mode
          </h1>
          <p className="text-gray-600 mb-6">
            Please select a book and audio file from the home page.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            📚 Browse Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-600">
            📚 Audio Books
          </Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">🎯 Practice Mode</span>
        </nav>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎯 Practice Mode
              </h1>
              <p className="text-gray-600">{getCurrentBook()?.title}</p>
              <p className="text-sm text-gray-500">File: {selectedFile}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {completedCount}/{audioSegments.length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>

          {/* Audio Player */}
          <audio
            ref={audioRef}
            src={`/audio/${selectedFile}`}
            className="w-full mb-4"
            controls
          />

          {/* Analysis Status */}
          {isAnalyzing && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">
                Analyzing audio and creating segments...
              </p>
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        {audioSegments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Audio Waveform</h2>
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full border rounded"
            />
          </div>
        )}

        {/* Practice Controls */}
        {audioSegments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Practice Controls</h2>
              <button
                onClick={() => dispatch(setShowTranscript(!showTranscript))}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showTranscript ? "Hide" : "Show"} Transcript
              </button>
            </div>

            {/* Practice Mode Selection */}
            <div className="flex gap-2 mb-4">
              {[
                {
                  key: "sequential",
                  label: "📋 Sequential",
                  desc: "Practice in order",
                },
                { key: "random", label: "🎲 Random", desc: "Random segments" },
                {
                  key: "focused",
                  label: "🎯 Focused",
                  desc: "Difficult segments",
                },
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => dispatch(setPracticeMode(mode.key as any))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    practiceMode === mode.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={mode.desc}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => {
                  const next = getNextSegment();
                  if (next >= 0) playSegment(next);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={completedCount === audioSegments.length}
              >
                ▶️ Play Next Segment
              </button>

              {activeSegment >= 0 && (
                <button
                  onClick={() => handleMarkCompleted(activeSegment)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  disabled={currentSession[activeSegment]?.completed}
                >
                  ✅ Mark Completed
                </button>
              )}
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {sessionStats.completedSegments}
                </div>
                <div className="text-sm text-blue-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {sessionStats.currentStreak}
                </div>
                <div className="text-sm text-green-700">Current Streak</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.floor((Date.now() - sessionStartRef.current) / 60000)}
                </div>
                <div className="text-sm text-purple-700">Minutes</div>
              </div>
            </div>
          </div>
        )}

        {/* Segments List */}
        {audioSegments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Practice Segments</h2>
            <div className="space-y-2">
              {audioSegments.map((segment, index) => {
                const session = currentSession[index];
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      activeSegment === index
                        ? "border-blue-500 bg-blue-50"
                        : session?.completed
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          Segment {index + 1} ({formatTime(segment.start)} -{" "}
                          {formatTime(segment.end)})
                        </div>
                        {showTranscript && segment.text && (
                          <div className="text-sm text-gray-600 mt-1">
                            {segment.text}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Attempts: {session?.attempts || 0} | Status:{" "}
                          {session?.completed ? "✅ Completed" : "⏳ Pending"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => playSegment(index)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          ▶️ Play
                        </button>
                        {!session?.completed && (
                          <button
                            onClick={() => handleMarkCompleted(index)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            ✅ Done
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
