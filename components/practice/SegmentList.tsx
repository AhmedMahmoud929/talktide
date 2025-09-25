"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SegmentControls } from "./SegmentControls";

interface Segment {
  start: number;
  end: number;
  text: string;
  loopCount: number;
  maxLoops: number;
  isLooping: boolean;
}

interface SegmentSession {
  completed: boolean;
  attempts: number;
}

interface SegmentListProps {
  segments: Segment[];
  currentSession: { [key: number]: SegmentSession };
  activeSegment: number;
  isAutoPlaying: boolean;
  segmentLoopCounts: { [key: number]: number };
  loopCount: number;
  isAnalyzing: boolean;
  onPlaySegment: (index: number, customSpeed?: number, infiniteLoop?: boolean) => void;
  onStopSegment: () => void;
  onMarkCompleted: (index: number) => void;
  formatTime: (time: number) => string;
}

export function SegmentList({
  segments,
  currentSession,
  activeSegment,
  isAutoPlaying,
  segmentLoopCounts,
  loopCount,
  isAnalyzing,
  onPlaySegment,
  onStopSegment,
  onMarkCompleted,
  formatTime,
}: SegmentListProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="font-medium text-gray-800 mb-4">
        Segments
        {isAutoPlaying && (
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            Playing
          </span>
        )}
      </h2>

      {segments.length > 0 ? (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {segments.map((segment, index) => {
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
                onClick={() => onPlaySegment(index)}
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
                          ({currentLoops}/{loopCount === Infinity ? "∞" : loopCount})
                        </span>
                      )}
                    </div>
                  </div>

                  <SegmentControls
                    segmentIndex={index}
                    isActive={isActive}
                    isPlaying={isAutoPlaying}
                    isCompleted={isCompleted}
                    currentLoops={currentLoops}
                    totalLoops={loopCount}
                    onPlay={onPlaySegment}
                    onStop={onStopSegment}
                    onMarkCompleted={onMarkCompleted}
                  />
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
  );
}