"use client";

import { playBeep } from "@/components/AudioEngine";

export default function TestPanning() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Test Stereo Panning (works with beeps, not speech):
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => playBeep("left", 440)}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium"
        >
          ← Left Beep
        </button>
        <button
          onClick={() => playBeep("center", 550)}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded text-sm font-medium"
        >
          Center Beep
        </button>
        <button
          onClick={() => playBeep("right", 660)}
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded text-sm font-medium"
        >
          Right Beep →
        </button>
      </div>
      <p className="text-xs text-gray-600">
        ⚠️ Note: Speech synthesis doesn't support true stereo panning. 
        Only beeps and pre-recorded audio files will pan properly.
      </p>
    </div>
  );
}