"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { AnalysisSettingsDialog } from "./AnalysisSettingsDialog";

interface AudioControlsProps {
  selectedFile?: string;
  playbackSpeed: number;
  loopCount: number;
  playContinuously: boolean;
  isAutoPlaying: boolean;
  showAnalysisDialog: boolean;
  silenceThreshold: number;
  minSilenceDuration: number;
  minSegmentDuration: number;
  isAnalyzing: boolean;
  onPlaybackSpeedChange: (speed: number) => void;
  onLoopCountChange: (count: number) => void;
  onPlayContinuouslyChange: (continuous: boolean) => void;
  onShowAnalysisDialogChange: (show: boolean) => void;
  onSilenceThresholdChange: (value: number) => void;
  onMinSilenceDurationChange: (value: number) => void;
  onMinSegmentDurationChange: (value: number) => void;
  onReAnalyze: () => void;
  onPlay: () => void;
  onPause: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export function AudioControls({
  selectedFile,
  playbackSpeed,
  loopCount,
  playContinuously,
  isAutoPlaying,
  showAnalysisDialog,
  silenceThreshold,
  minSilenceDuration,
  minSegmentDuration,
  isAnalyzing,
  onPlaybackSpeedChange,
  onLoopCountChange,
  onPlayContinuouslyChange,
  onShowAnalysisDialogChange,
  onSilenceThresholdChange,
  onMinSilenceDurationChange,
  onMinSegmentDurationChange,
  onReAnalyze,
  onPlay,
  onPause,
  audioRef,
}: AudioControlsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-800">Controls</h2>

        <AnalysisSettingsDialog
          isOpen={showAnalysisDialog}
          onOpenChange={onShowAnalysisDialogChange}
          silenceThreshold={silenceThreshold}
          minSilenceDuration={minSilenceDuration}
          minSegmentDuration={minSegmentDuration}
          isAnalyzing={isAnalyzing}
          onSilenceThresholdChange={onSilenceThresholdChange}
          onMinSilenceDurationChange={onMinSilenceDurationChange}
          onMinSegmentDurationChange={onMinSegmentDurationChange}
          onReAnalyze={onReAnalyze}
        />
      </div>

      {/* Audio Player */}
      <div className="mb-4">
        <audio
          ref={audioRef}
          src={`/audio/${selectedFile}`}
          className="w-full"
          controls
          onPlay={onPlay}
          onPause={onPause}
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
            onValueChange={(value) => onPlaybackSpeedChange(value[0])}
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
            onValueChange={(value) => onLoopCountChange(value[0])}
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
            onClick={() => onPlayContinuouslyChange(!playContinuously)}
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
