"use client";

import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import {
  setCurrentSegment,
  setIsPlaying,
} from "@/redux/features/audio/audioSlice";
import {
  setActiveSegment,
  markSegmentCompleted,
  toggleSegmentCompleted,
} from "@/redux/features/practice/practiceSlice";
import { SegmentControls } from "./SegmentControls";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { AudioControls } from "./AudioControls";
import { Check } from "lucide-react";

interface SegmentListProps {
  className?: string;
  formatTime?: (time: number) => string;
  onPlaySegment?: (
    segmentIndex: number,
    customSpeed?: number,
    infiniteLoop?: boolean
  ) => void;
  onStopSegment?: () => void;
  onMarkCompleted?: (segmentIndex: number) => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

export function SegmentList({
  className,
  formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  },
  onPlaySegment,
  onStopSegment,
  onMarkCompleted,
  audioRef,
}: SegmentListProps) {
  const dispatch = useAppDispatch();
  const { audioSegments, isAnalyzing, isPlaying } = useAppSelector(
    (state) => state.audio
  );
  const { currentSession, activeSegment } = useAppSelector(
    (state) => state.practice
  );

  const handlePlaySegment = (
    segmentIndex: number,
    customSpeed?: number,
    infiniteLoop?: boolean
  ) => {
    if (onPlaySegment) {
      onPlaySegment(segmentIndex, customSpeed, infiniteLoop);
    } else {
      dispatch(setActiveSegment(segmentIndex));
      dispatch(setCurrentSegment(segmentIndex));
      dispatch(setIsPlaying(true));
    }
  };

  const handleStopSegment = () => {
    if (onStopSegment) {
      onStopSegment();
    } else {
      dispatch(setActiveSegment(-1));
      dispatch(setCurrentSegment(-1));
      dispatch(setIsPlaying(false));
    }
  };

  const handleMarkCompleted = (segmentIndex: number) => {
    if (onMarkCompleted) {
      onMarkCompleted(segmentIndex);
    } else {
      dispatch(markSegmentCompleted(segmentIndex));
    }
  };

  const handleToggleCompleted = (segmentIndex: number) => {
    dispatch(toggleSegmentCompleted(segmentIndex));
  };

  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing audio...</p>
        </div>
      </div>
    );
  }

  if (audioSegments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-center">
          No segments available. Please select an audio file.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-medium text-gray-800">
          Audio Segments ({audioSegments.length})
        </h2>

        <Dialog>
          <DialogTrigger>
            <Button variant={"outline"}>Customize</Button>
          </DialogTrigger>
          <DialogContent>
            <AudioControls audioRef={audioRef as any} />
          </DialogContent>
        </Dialog>
      </div>

      <div>
        {audioSegments.map((segment, index) => {
          const sessionData = currentSession.find(
            (s) => s.segmentIndex === index
          );
          const isActive = activeSegment === index;
          const isCompleted = sessionData?.completed || false;
          const currentLoops = segment.loopCount || 0;
          const totalLoops = segment.maxLoops || 1;

          return (
            <div
              key={index}
              className={`p-4 border-b border-gray-100 last:border-b-0 ${
                isActive ? "bg-blue-50 border-blue-200" : ""
              } ${isCompleted ? "bg-green-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Checkbox Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCompleted(index);
                    }}
                    className={`
                      relative w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
                      ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-white border-gray-300 hover:border-green-400"
                      }
                    `}
                    title={
                      isCompleted ? "Mark as incomplete" : "Mark as completed"
                    }
                  >
                    {isCompleted && <Check className="text-white size-3" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted
                            ? "text-green-700 line-through"
                            : "text-gray-700"
                        }`}
                      >
                        Segment {index + 1}
                      </span>
                      {isCompleted && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(segment.start)} - {formatTime(segment.end)}
                    </div>
                    {/* {segment.text && (
                      <div
                        className={`text-sm mt-1 ${
                          isCompleted
                            ? "text-gray-500 line-through"
                            : "text-gray-600"
                        }`}
                      >
                        {segment.text}
                      </div>
                    )} */}
                  </div>
                </div>

                <SegmentControls
                  segmentIndex={index}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  isCompleted={isCompleted}
                  currentLoops={currentLoops}
                  totalLoops={totalLoops}
                  onPlay={handlePlaySegment}
                  onStop={handleStopSegment}
                  onMarkCompleted={handleMarkCompleted}
                  onToggleCompleted={handleToggleCompleted}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
