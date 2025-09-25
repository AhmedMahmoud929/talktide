"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/redux/hooks"
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal"

interface PracticeHeaderProps {
  className?: string
}

export function PracticeHeader({ className }: PracticeHeaderProps) {
  const router = useRouter()

  const { selectedBook, selectedFile, audioBooks, audioSegments } = useAppSelector((state) => state.audio)
  const { currentSession } = useAppSelector((state) => state.practice)

  const currentBook = audioBooks.find((book) => book.id === selectedBook)
  const bookTitle = currentBook?.title || "No Book Selected"
  const fileId = selectedFile || "No File Selected"

  const progress =
    audioSegments.length > 0
      ? Math.round((currentSession.filter((s) => s.completed).length / audioSegments.length) * 100)
      : 0

  const handleBack = () => {
    router.push("/")
  }

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className || ""}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800 bg-transparent"
          >
            ← Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{bookTitle}</h1>
            <p className="text-sm text-gray-600">File: {fileId}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Progress */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Progress:</span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>

          {/* Keyboard Shortcuts Button */}
          <KeyboardShortcutsModal>
            <Button variant="outline" size="sm">
              Shortcuts
            </Button>
          </KeyboardShortcutsModal>
        </div>
      </div>
    </div>
  )
}
