"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SegmentControlsProps {
  segmentIndex: number;
  isActive: boolean;
  isPlaying: boolean;
  isCompleted: boolean;
  currentLoops: number;
  totalLoops: number;
  onPlay: (index: number, customSpeed?: number, infiniteLoop?: boolean) => void;
  onStop: () => void;
  onMarkCompleted: (index: number) => void;
}

export function SegmentControls({
  segmentIndex,
  isActive,
  isPlaying,
  isCompleted,
  currentLoops,
  totalLoops,
  onPlay,
  onStop,
  onMarkCompleted,
}: SegmentControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSpeed, setCustomSpeed] = useState(1.0);
  const [infiniteLoop, setInfiniteLoop] = useState(false);

  const handlePlay = () => {
    if (showAdvanced) {
      onStop();
      onPlay(segmentIndex, customSpeed, infiniteLoop);
    } else {
      onPlay(segmentIndex);
    }
  };

  return (
    <div className="relative space-y-2">
      {/* Main Controls Row */}
      <div className="flex items-center space-x-1">
        {/* Play/Stop Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            if (isActive && isPlaying) {
              onStop();
            } else {
              handlePlay();
            }
          }}
          className="text-xs h-7 px-2"
        >
          {isActive && isPlaying ? "Stop" : "Play"}
        </Button>

        {/* Advanced Controls Toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setShowAdvanced(!showAdvanced);
          }}
          className={cn("text-xs h-7 px-1", showAdvanced ? "bg-gray-100" : "")}
          title="Toggle advanced controls"
        >
          ⚙️
        </Button>

        {/* Done Button */}
        {!isCompleted && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onMarkCompleted(segmentIndex);
            }}
            className="text-xs h-7 px-2 bg-gray-600 hover:bg-gray-700"
          >
            Done
          </Button>
        )}
      </div>

      {/* Advanced Controls (Inline) */}
      {showAdvanced && (
        <div className="bg-gray-50 absolute shadow-xl z-50 right-0 p-3 rounded-md border space-y-3">
          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                Speed: {customSpeed.toFixed(2)}x
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomSpeed(1.0);
                }}
                className="text-xs h-6 px-2"
              >
                Reset
              </Button>
            </div>
            <Slider
              value={[customSpeed]}
              onValueChange={(value) => setCustomSpeed(value[0])}
              min={0.25}
              max={3}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.25x</span>
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>

          {/* Infinite Loop Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">
              Infinite Loop
            </label>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInfiniteLoop(!infiniteLoop);
              }}
              className={cn(
                "relative w-8 h-4 rounded-full transition-colors",
                infiniteLoop ? "bg-gray-600" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm",
                  infiniteLoop ? "-translate-x-3.5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Warning for Infinite Loop */}
          {infiniteLoop && (
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ Infinite loop enabled. Click "Stop" to end playback.
            </div>
          )}

          {/* Quick Speed Presets */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Quick Presets:
            </label>
            <div className="flex space-x-1">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <Button
                  key={speed}
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomSpeed(speed);
                  }}
                  className={cn(
                    "text-xs h-6 px-2",
                    customSpeed === speed ? "bg-gray-200" : ""
                  )}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
