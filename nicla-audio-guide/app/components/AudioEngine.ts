let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let stopTimeout: NodeJS.Timeout | null = null;
let globalVolume = 0.7;

export function setVolume(volume: number) {
  globalVolume = Math.max(0, Math.min(1, volume));
}

export function getVolume(): number {
  return globalVolume;
}

// For TRUE spatial audio, use this with pre-recorded audio files
export async function playAudioWithPanning(
  audioUrl: string, 
  direction: string
) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  // Stop any current audio
  stopAudio();

  try {
    // Fetch and decode audio file
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Create source
    currentSource = audioCtx.createBufferSource();
    currentSource.buffer = audioBuffer;

    // Create panner for REAL spatial audio
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = 
      direction === "left" ? -0.9 :
      direction === "right" ? 0.9 : 0;

    // Create gain node for volume
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = globalVolume;

    // Connect: source -> panner -> gain -> destination
    currentSource
      .connect(panner)
      .connect(gainNode)
      .connect(audioCtx.destination);

    console.log(`🔊 Playing audio (pan: ${panner.pan.value}) at volume ${globalVolume}`);

    // Start playback
    currentSource.start(0);

    // Set 3-second timeout
    stopTimeout = setTimeout(() => {
      stopAudio();
      console.log("⏱ 3-second timeout - stopping audio");
    }, 3000);

    // Clean up when audio ends naturally
    currentSource.onended = () => {
      currentSource = null;
      if (stopTimeout) {
        clearTimeout(stopTimeout);
        stopTimeout = null;
      }
    };

  } catch (error) {
    console.error("Error playing audio:", error);
  }
}

// Fallback: Use SpeechSynthesis (no real panning, but works)
export function speak(text: string, direction: string) {
  speechSynthesis.cancel();
  
  if (stopTimeout) {
    clearTimeout(stopTimeout);
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = globalVolume;
  utterance.rate = 1.0;

  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
  }

  console.log(`🔊 Speaking: "${text}" (${direction}) - NOTE: Panning not supported with SpeechSynthesis`);

  speechSynthesis.speak(utterance);

  // 3-second timeout
  stopTimeout = setTimeout(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      console.log("⏱ 3-second timeout");
    }
  }, 3000);
}

function stopAudio() {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch (e) {
      // Already stopped
    }
    currentSource = null;
  }
  
  if (stopTimeout) {
    clearTimeout(stopTimeout);
    stopTimeout = null;
  }
}

export function stopSpeaking() {
  stopAudio();
  speechSynthesis.cancel();
  console.log("🛑 All audio stopped");
}

// Helper: Generate simple beep tones with panning (for testing)
export function playBeep(direction: string, frequency = 440) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const oscillator = audioCtx.createOscillator();
  const panner = audioCtx.createStereoPanner();
  const gainNode = audioCtx.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  panner.pan.value = 
    direction === "left" ? -0.9 :
    direction === "right" ? 0.9 : 0;

  gainNode.gain.value = globalVolume * 0.3; // Quieter for beeps

  oscillator
    .connect(panner)
    .connect(gainNode)
    .connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.2); // 200ms beep

  console.log(`🔔 Beep (pan: ${panner.pan.value})`);
}