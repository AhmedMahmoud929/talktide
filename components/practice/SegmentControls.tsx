"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Play, Settings, Square } from "lucide-react";

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
  onToggleCompleted?: (index: number) => void;
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
  onToggleCompleted,
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

  const handleToggle = () => {
    if (onToggleCompleted) {
      onToggleCompleted(segmentIndex);
    } else {
      onMarkCompleted(segmentIndex);
    }
  };

  return (
    <div className="relative space-y-2">
      {/* Main Controls Row */}
      <div className="flex items-center space-x-1">
        {/* Play/Stop Button */}
        <Button
          size="icon"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            if (isActive && isPlaying) {
              onStop();
            } else {
              handlePlay();
            }
          }}
          className="size-7"
        >
          {isActive && isPlaying ? (
            <Square fill="#ef4444" className="text-[#ef4444] size-3" />
          ) : (
            <Play fill="#3b82f6" className="text-[#3b82f6] size-3" />
          )}
        </Button>

        {/* Advanced Controls Toggle */}
        <Popover>
          <PopoverTrigger className="hidden">
            <Button
              size="icon"
              variant="outline"
              className={cn("size-7")}
              title="Toggle advanced controls"
            >
              <Settings className="size-3 opacity-80" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-4">
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
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
