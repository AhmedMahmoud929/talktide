"use client";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Play/Pause</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Space</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Next</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">N</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Previous</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">P</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Complete</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">C</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Stop</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">S</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}