"use client";

import { useState, useEffect } from "react";
import { connectBLE } from "./BLEConnector";
import { speak, setVolume, getVolume, stopSpeaking } from "./AudioEngine";
import { parseEvent, buildSentence } from "./EventHandler";

export default function BLEController() {
  const [connected, setConnected] = useState(false);
  const [volume, setVolumeState] = useState(70); // 0-100 for UI
  const [lastDetection, setLastDetection] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Initialize volume
    setVolume(volume / 100);
  }, []);

  const handleConnect = async () => {
    try {
      setError("");
      await connectBLE((data) => {
        console.log("📥 Raw data:", data);
        
        const event = parseEvent(data);
        if (event) {
          const sentence = buildSentence(event);
          setLastDetection(sentence);
          speak(sentence, event.direction);
        }
      });
      setConnected(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      console.error(err);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolumeState(newVolume);
    setVolume(newVolume / 100); // Convert to 0.0-1.0 range
  };

  const handleStop = () => {
    stopSpeaking();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Vision Assistant
          </h1>
          <p className="text-gray-600">
            Connect your Nicla Vision device
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm font-medium text-gray-700">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {/* Connect Button */}
        {!connected && (
          <button
            onClick={handleConnect}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
          >
            Connect via Bluetooth
          </button>
        )}

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              Volume
            </label>
            <span className="text-sm text-gray-600">{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>🔇 Mute</span>
            <span>🔊 Max</span>
          </div>
        </div>

        {/* Stop Button */}
        {connected && (
          <button
            onClick={handleStop}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Stop Audio
          </button>
        )}

        {/* Last Detection Display */}
        {lastDetection && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Last Detection:
            </p>
            <p className="text-gray-800">{lastDetection}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-600 mb-1">Error:</p>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-700">Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Make sure your Nicla Vision is powered on</li>
            <li>Click "Connect via Bluetooth"</li>
            <li>Select "NICLA-VISION" from the dialog</li>
            <li>Audio plays for max 3 seconds per detection</li>
            <li>Adjust volume using the slider above</li>
          </ul>
        </div>
      </div>
    </div>
  );
}