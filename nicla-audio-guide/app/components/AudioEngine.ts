let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | OscillatorNode | null = null;
let stopTimeout: NodeJS.Timeout | null = null;
let globalVolume = 0.7;

export function setVolume(volume: number) {
  globalVolume = Math.max(0, Math.min(1, volume));
}

export function getVolume(): number {
  return globalVolume;
}

// Initialize AudioContext
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Stop any currently playing audio
function stopAudio() {
  if (currentSource) {
    try {
      if ('stop' in currentSource) {
        currentSource.stop();
      }
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

/**
 * SOLUTION 1: Directional Beeps + Speech
 * Play a directional beep BEFORE the speech to indicate direction
 */
export function speakWithDirectionalCue(text: string, direction: string) {
  // First play a directional beep
  playDirectionalBeep(direction);
  
  // Then speak after a short delay
  setTimeout(() => {
    speakBasic(text, direction);
  }, 300); // 300ms delay for beep to finish
}

/**
 * SOLUTION 2: Layered Audio (Beep + Speech simultaneously)
 * Play a continuous tone in the background while speaking
 */
export function speakWithSpatialTone(text: string, direction: string) {
  const ctx = getAudioContext();
  stopAudio();
  
  // Create a low-frequency tone for spatial awareness
  const oscillator = ctx.createOscillator();
  const panner = ctx.createStereoPanner();
  const gainNode = ctx.createGain();
  
  oscillator.frequency.value = 200; // Low frequency
  oscillator.type = 'sine';
  
  // Set panning based on direction
  panner.pan.value = 
    direction === "left" ? -0.95 :
    direction === "right" ? 0.95 : 0;
  
  // Low volume for the tone
  gainNode.gain.value = globalVolume * 0.15;
  
  oscillator.connect(panner).connect(gainNode).connect(ctx.destination);
  currentSource = oscillator;
  oscillator.start();
  
  // Speak the text
  speakBasic(text, direction);
  
  // Stop the tone after speech + 1 second
  stopTimeout = setTimeout(() => {
    stopAudio();
  }, 3500);
}

/**
 * SOLUTION 3: Chirp Pattern
 * Use distinct chirp patterns for left/center/right before speaking
 */
export function speakWithChirp(text: string, direction: string) {
  playChirpPattern(direction);
  
  setTimeout(() => {
    speakBasic(text, direction);
  }, 400);
}

/**
 * Basic speech synthesis (no panning, but clear)
 */
function speakBasic(text: string, direction: string) {
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = globalVolume;
  utterance.rate = 1.1; // Slightly faster
  utterance.pitch = 1.0;
  
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    const preferredVoice = voices.find(v => v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
  }
  
  console.log(`🔊 Speaking: "${text}" (${direction})`);
  speechSynthesis.speak(utterance);
}

/**
 * Play a directional beep to indicate direction
 */
function playDirectionalBeep(direction: string) {
  const ctx = getAudioContext();
  
  const oscillator = ctx.createOscillator();
  const panner = ctx.createStereoPanner();
  const gainNode = ctx.createGain();
  
  // Different frequencies for different directions
  oscillator.frequency.value = 
    direction === "left" ? 600 :
    direction === "right" ? 900 : 750;
  
  oscillator.type = 'sine';
  
  panner.pan.value = 
    direction === "left" ? -0.95 :
    direction === "right" ? 0.95 : 0;
  
  gainNode.gain.value = globalVolume * 0.4;
  
  oscillator.connect(panner).connect(gainNode).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2);
  
  console.log(`🔔 Directional beep: ${direction} (pan: ${panner.pan.value})`);
}

/**
 * Play a chirp pattern: different patterns for each direction
 */
function playChirpPattern(direction: string) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // Different patterns for each direction
  const patterns = {
    left: [
      { freq: 800, time: 0, duration: 0.08 },
      { freq: 600, time: 0.1, duration: 0.08 },
    ],
    center: [
      { freq: 700, time: 0, duration: 0.08 },
      { freq: 700, time: 0.1, duration: 0.08 },
    ],
    right: [
      { freq: 600, time: 0, duration: 0.08 },
      { freq: 800, time: 0.1, duration: 0.08 },
    ]
  };
  
  const pattern = patterns[direction as keyof typeof patterns] || patterns.center;
  
  pattern.forEach(note => {
    const oscillator = ctx.createOscillator();
    const panner = ctx.createStereoPanner();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.value = note.freq;
    oscillator.type = 'sine';
    
    panner.pan.value = 
      direction === "left" ? -0.95 :
      direction === "right" ? 0.95 : 0;
    
    gainNode.gain.value = globalVolume * 0.35;
    
    oscillator.connect(panner).connect(gainNode).connect(ctx.destination);
    oscillator.start(now + note.time);
    oscillator.stop(now + note.time + note.duration);
  });
  
  console.log(`🎵 Chirp pattern: ${direction}`);
}

/**
 * Main speak function - uses the best approach
 * Choose one of the solutions above as default
 */
export function speak(text: string, direction: string) {
  // OPTION 1: Beep then speak (clear separation)
  speakWithDirectionalCue(text, direction);
  
  // OPTION 2: Continuous tone with speech (try this if you prefer)
  // speakWithSpatialTone(text, direction);
  
  // OPTION 3: Musical chirp pattern (most distinctive)
  // speakWithChirp(text, direction);
}

/**
 * Test beep with true stereo panning
 */
export function playBeep(direction: string, frequency = 440) {
  const ctx = getAudioContext();
  
  const oscillator = ctx.createOscillator();
  const panner = ctx.createStereoPanner();
  const gainNode = ctx.createGain();
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  panner.pan.value = 
    direction === "left" ? -0.95 :
    direction === "right" ? 0.95 : 0;
  
  gainNode.gain.value = globalVolume * 0.3;
  
  oscillator.connect(panner).connect(gainNode).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2);
  
  console.log(`🔔 Beep (pan: ${panner.pan.value})`);
}

/**
 * For playing pre-recorded audio files with true spatial audio
 */
export async function playAudioWithPanning(audioUrl: string, direction: string) {
  const ctx = getAudioContext();
  stopAudio();
  
  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    const panner = ctx.createStereoPanner();
    panner.pan.value = 
      direction === "left" ? -0.9 :
      direction === "right" ? 0.9 : 0;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = globalVolume;
    
    source.connect(panner).connect(gainNode).connect(ctx.destination);
    currentSource = source;
    
    console.log(`🔊 Playing audio file (pan: ${panner.pan.value})`);
    source.start(0);
    
    stopTimeout = setTimeout(() => {
      stopAudio();
    }, 3000);
    
    source.onended = () => {
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