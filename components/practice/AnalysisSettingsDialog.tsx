"use client";

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

interface AnalysisSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  silenceThreshold: number;
  minSilenceDuration: number;
  minSegmentDuration: number;
  isAnalyzing: boolean;
  onSilenceThresholdChange: (value: number) => void;
  onMinSilenceDurationChange: (value: number) => void;
  onMinSegmentDurationChange: (value: number) => void;
  onReAnalyze: () => void;
}

export function AnalysisSettingsDialog({
  isOpen,
  onOpenChange,
  silenceThreshold,
  minSilenceDuration,
  minSegmentDuration,
  isAnalyzing,
  onSilenceThresholdChange,
  onMinSilenceDurationChange,
  onMinSegmentDurationChange,
  onReAnalyze,
}: AnalysisSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              onValueChange={(value) => onSilenceThresholdChange(value[0])}
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
              onValueChange={(value) => onMinSilenceDurationChange(value[0])}
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
              onValueChange={(value) => onMinSegmentDurationChange(value[0])}
              min={1}
              max={10}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Re-analyze Button */}
          <Button
            onClick={() => {
              onReAnalyze();
              onOpenChange(false);
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
  );
}