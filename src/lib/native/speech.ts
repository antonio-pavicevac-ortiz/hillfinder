import type { TextToSpeechPlugin } from "@capacitor-community/text-to-speech";
import { Capacitor, registerPlugin } from "@capacitor/core";

// Spoken guidance. In the iPhone app it uses native speech, which keeps working while the
// phone is locked; on the web it's the browser's speechSynthesis, which goes quiet when the
// page is hidden.

type SpeakOptions = {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
};

// Bound to the native side only: the package's own entry point touches `window` when
// imported, which breaks server rendering, and the web uses speechSynthesis directly
const TextToSpeech = registerPlugin<TextToSpeechPlugin>("TextToSpeech");
// QueueStrategy.Flush: cut off whatever is being spoken
const QUEUE_FLUSH = 0;

const isNative = () => Capacitor.isNativePlatform();

// Native speech reports only when it finishes, so the app tracks the latest request itself
let nativeSpeechId = 0;
let nativeSpeaking = false;

export function canSpeak(): boolean {
  if (typeof window === "undefined") return false;
  return isNative() || "speechSynthesis" in window;
}

/** Speaks text, cutting off anything already being spoken. */
export function speak(text: string, { rate = 1, pitch = 1, onStart }: SpeakOptions = {}) {
  if (!text || !canSpeak()) return;

  if (isNative()) {
    const id = ++nativeSpeechId;
    nativeSpeaking = true;
    onStart?.();
    TextToSpeech.speak({
      text,
      lang: "en-US",
      rate,
      pitch,
      // Keeps the audio session alive while the app is in the background
      category: "playback",
      queueStrategy: QUEUE_FLUSH,
    })
      .catch((err) => console.error("[speech] native speak failed", err))
      .finally(() => {
        if (id === nativeSpeechId) nativeSpeaking = false;
      });
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  if (onStart) utterance.onstart = onStart;
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (!canSpeak()) return;

  if (isNative()) {
    nativeSpeechId++;
    nativeSpeaking = false;
    void TextToSpeech.stop().catch(() => {});
    return;
  }

  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (!canSpeak()) return false;
  return isNative() ? nativeSpeaking : window.speechSynthesis.speaking;
}
