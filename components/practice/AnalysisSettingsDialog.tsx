"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface AnalysisSettingsDialogProps {
  className?: string
}

export function AnalysisSettingsDialog({ className }: AnalysisSettingsDialogProps) {
  // Internal state
  const [isOpen, setIsOpen] = useState(false)
  const [silenceThreshold, setSilenceThreshold] = useState(-30)
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.3)
  const [minSegmentDuration, setMinSegmentDuration] = useState(1.0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Internal handlers
  const handleReAnalyze = async () => {
    setIsAnalyzing(true)
    console.log("Re-analyzing with settings:", {
      silenceThreshold,
      minSilenceDuration,
      minSegmentDuration,
    })

    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false)
      setIsOpen(false)
    }, 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          Analysis Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Analysis Settings</DialogTitle>
          <DialogDescription>Adjust the parameters for audio segment detection.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Silence Threshold */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Silence Threshold: {silenceThreshold} dB</label>
            <Slider
              value={[silenceThreshold]}
              onValueChange={(value) => setSilenceThreshold(value[0])}
              min={-60}
              max={-10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-60 dB (Sensitive)</span>
              <span>-10 dB (Less Sensitive)</span>
            </div>
          </div>

          {/* Min Silence Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Silence Duration: {minSilenceDuration.toFixed(1)}s</label>
            <Slider
              value={[minSilenceDuration]}
              onValueChange={(value) => setMinSilenceDuration(value[0])}
              min={0.1}
              max={2}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.1s</span>
              <span>2.0s</span>
            </div>
          </div>

          {/* Min Segment Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Segment Duration: {minSegmentDuration.toFixed(1)}s</label>
            <Slider
              value={[minSegmentDuration]}
              onValueChange={(value) => setMinSegmentDuration(value[0])}
              min={0.5}
              max={10}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.5s</span>
              <span>10.0s</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button onClick={handleReAnalyze} disabled={isAnalyzing} className="flex-1 bg-gray-800 hover:bg-gray-700">
              {isAnalyzing ? "Analyzing..." : "Re-analyze"}
            </Button>
            <Button onClick={() => setIsOpen(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
