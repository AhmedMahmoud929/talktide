"use client";

import { useCallback } from "react";

interface Segment {
  start: number;
  end: number;
  text: string;
  loopCount: number;
  maxLoops: number;
  isLooping: boolean;
}

export function useAudioAnalysis() {
  const detectSilenceBasedSegments = useCallback((audioBuffer: AudioBuffer): Segment[] => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // More reasonable parameters for segment detection
    const threshold = 0.01; // Lower threshold for silence detection
    const minSilenceDuration = 1.0; // 1 second minimum silence
    const minSegmentDuration = 3.0; // 3 seconds minimum segment length
    const maxSegmentDuration = 15.0; // 15 seconds maximum segment length

    const segments: Segment[] = [];
    let segmentStart = 0;
    let inSilence = false;
    let silenceStart = 0;

    // Process audio in chunks for better performance
    const chunkSize = Math.floor(sampleRate * 0.1); // 100ms chunks
    const silenceThresholdSamples = minSilenceDuration * sampleRate;
    const minSegmentSamples = minSegmentDuration * sampleRate;
    const maxSegmentSamples = maxSegmentDuration * sampleRate;

    for (let i = 0; i < channelData.length; i += chunkSize) {
      const chunkEnd = Math.min(i + chunkSize, channelData.length);

      // Calculate RMS (Root Mean Square) for this chunk
      let sum = 0;
      for (let j = i; j < chunkEnd; j++) {
        sum += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sum / (chunkEnd - i));

      const currentTime = i / sampleRate;

      if (rms < threshold) {
        if (!inSilence) {
          silenceStart = currentTime;
          inSilence = true;
        }
      } else {
        if (inSilence && currentTime - silenceStart > minSilenceDuration) {
          // End current segment
          const segmentEnd = silenceStart;
          const segmentDuration = segmentEnd - segmentStart;

          if (segmentDuration >= minSegmentDuration) {
            // Split long segments
            if (segmentDuration > maxSegmentDuration) {
              const numParts = Math.ceil(segmentDuration / maxSegmentDuration);
              const partDuration = segmentDuration / numParts;

              for (let part = 0; part < numParts; part++) {
                const partStart = segmentStart + part * partDuration;
                const partEnd = Math.min(partStart + partDuration, segmentEnd);

                segments.push({
                  start: partStart,
                  end: partEnd,
                  text: `Segment ${segments.length + 1}`,
                  loopCount: 0,
                  maxLoops: 3,
                  isLooping: false,
                });
              }
            } else {
              segments.push({
                start: segmentStart,
                end: segmentEnd,
                text: `Segment ${segments.length + 1}`,
                loopCount: 0,
                maxLoops: 3,
                isLooping: false,
              });
            }
          }

          segmentStart = currentTime;
        }
        inSilence = false;
      }
    }

    // Add final segment if needed
    const finalSegmentDuration = audioBuffer.duration - segmentStart;
    if (finalSegmentDuration >= minSegmentDuration) {
      segments.push({
        start: segmentStart,
        end: audioBuffer.duration,
        text: `Segment ${segments.length + 1}`,
        loopCount: 0,
        maxLoops: 3,
        isLooping: false,
      });
    }

    return segments;
  }, []);

  const drawWaveform = useCallback((audioBuffer: AudioBuffer, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const channelData = audioBuffer.getChannelData(0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();

    const samplesPerPixel = Math.floor(channelData.length / width);
    const centerY = height / 2;

    for (let x = 0; x < width; x++) {
      const startSample = x * samplesPerPixel;
      const endSample = Math.min(startSample + samplesPerPixel, channelData.length);

      let min = 0;
      let max = 0;

      for (let i = startSample; i < endSample; i++) {
        const sample = channelData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      const yMin = centerY + min * centerY;
      const yMax = centerY + max * centerY;

      if (x === 0) {
        ctx.moveTo(x, yMin);
      } else {
        ctx.lineTo(x, yMin);
      }
      ctx.lineTo(x, yMax);
    }

    ctx.stroke();
  }, []);

  return {
    detectSilenceBasedSegments,
    drawWaveform,
  };
}