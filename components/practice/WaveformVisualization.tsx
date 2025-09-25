"use client"

import { useRef, useImperativeHandle, forwardRef } from "react"

interface WaveformVisualizationProps {
  className?: string
}

export interface WaveformVisualizationRef {
  getCanvas: () => HTMLCanvasElement | null
}

export const WaveformVisualization = forwardRef<WaveformVisualizationRef, WaveformVisualizationProps>(
  ({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }))

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-3">Waveform</h3>
        <canvas
          ref={canvasRef}
          width={800}
          height={120}
          className={`w-full border border-gray-100 rounded ${className || ""}`}
        />
      </div>
    )
  },
)

WaveformVisualization.displayName = "WaveformVisualization"
