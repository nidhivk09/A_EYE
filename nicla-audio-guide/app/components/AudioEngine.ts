let audioCtx: AudioContext | null = null;

export function speak(text: string, direction: string) {
  if (!audioCtx) audioCtx = new AudioContext();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.onstart = () => {
    const source = audioCtx!.createMediaStreamDestination();
    const panner = audioCtx!.createStereoPanner();

    panner.pan.value =
      direction === "left" ? -1 :
      direction === "right" ? 1 : 0;

    source.connect(panner).connect(audioCtx!.destination);
  };

  speechSynthesis.cancel(); // avoid overlap
  speechSynthesis.speak(utterance);
}
