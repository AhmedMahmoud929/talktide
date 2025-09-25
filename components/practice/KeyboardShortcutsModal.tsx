"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface KeyboardShortcutsModalProps {
  className?: string
  children?: React.ReactNode
}

export function KeyboardShortcutsModal({ children, className }: KeyboardShortcutsModalProps) {
  // Internal state
  const [isOpen, setIsOpen] = useState(false)

  const shortcuts = [
    { key: "Space", description: "Play/Pause current segment" },
    { key: "N", description: "Next segment" },
    { key: "P", description: "Previous segment" },
    { key: "C", description: "Mark current segment as completed" },
    { key: "S", description: "Stop all playback" },
    { key: "?", description: "Show/hide this help" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and control playback efficiently.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button onClick={() => setIsOpen(false)} className="w-full bg-gray-800 hover:bg-gray-700">
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
