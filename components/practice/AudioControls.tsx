"use client";

import type React from "react";

import { useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setPlaybackSpeed,
  setLoopCount,
  setPlayMode,
  setIsPlaying,
} from "@/redux/features/audio/audioSlice";

interface AudioControlsProps {
  className?: string;
  audioRef?: React.RefObject<HTMLAudioElement>;
  showAudioFile?: boolean;
}

export function AudioControls({
  className,
  audioRef,
  showAudioFile = false,
}: AudioControlsProps) {
  const dispatch = useAppDispatch();
  const { selectedFile, playbackSpeed, loopCount, playMode, isPlaying } =
    useAppSelector((state) => state.audio);

  const playContinuously = playMode === "continue";

  // Update audio playback rate when speed changes
  useEffect(() => {
    if (audioRef?.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, audioRef]);

  const handlePlay = () => {
    if (audioRef?.current) {
      audioRef.current.play().catch(console.error);
    }
    dispatch(setIsPlaying(true));
  };

  const handlePause = () => {
    if (audioRef?.current) {
      audioRef.current.pause();
    }
    dispatch(setIsPlaying(false));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-800">Controls</h2>
      </div>

      {showAudioFile && (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={!selectedFile}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <span className="text-sm text-gray-600">
              {selectedFile ? selectedFile : "No file selected"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Use segment controls below for precise playback
          </div>
        </div>
      )}

      {/* Audio Player */}
      <div className="mb-4">
        <audio
          ref={audioRef}
          src={selectedFile ? `/audio/${selectedFile}` : undefined}
          className="w-full"
          style={{ display: "none" }} // Hide the native controls
        />
      </div>

      {/* Settings */}
      <div className="space-y-4">
        {/* Speed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speed: {playbackSpeed.toFixed(2)}x
          </label>
          <Slider
            value={[playbackSpeed]}
            onValueChange={(value) => dispatch(setPlaybackSpeed(value[0]))}
            min={0.25}
            max={2}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Loops */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loops: {loopCount}
          </label>
          <Slider
            value={[loopCount]}
            // onValueChange={(value) => dispatch(setLoopCount(value[0]))}
            onValueChange={(value) =>
              alert(
                "This feature isn't working for now, try to reach out later"
              )
            }
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>

        {/* Continuous Play */}
        <div className="flex items-center justify-between pt-4">
          <label className="text-sm font-medium text-gray-700">
            Continuous
          </label>
          <button
            onClick={() =>
              dispatch(setPlayMode(playContinuously ? "single" : "continue"))
            }
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors",
              playContinuously ? "bg-gray-600" : "bg-gray-300"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                playContinuously ? "-translate-x-4.5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
