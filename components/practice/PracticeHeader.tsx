"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PracticeHeaderProps {
  bookTitle?: string;
  fileId?: string;
  progress: number;
  onShowKeyboardShortcuts: () => void;
}

export function PracticeHeader({
  bookTitle,
  fileId,
  progress,
  onShowKeyboardShortcuts,
}: PracticeHeaderProps) {
  return (
    <div className="bg-[#f7f7f7] border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              ← Back to Home
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-800">
              Practice Mode
            </h1>
            {bookTitle && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm text-gray-600">{bookTitle}</span>
              </>
            )}
            {fileId && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm text-gray-600">{fileId}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onShowKeyboardShortcuts}
              className="text-xs"
            >
              Shortcuts
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">Progress:</span>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}