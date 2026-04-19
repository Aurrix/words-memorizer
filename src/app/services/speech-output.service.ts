import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechOutputService {
  readonly supported = signal(false);

  private readonly synthesis = this.resolveSynthesis();

  constructor() {
    this.supported.set(this.synthesis !== null);
  }

  speak(text: string, lang: string): void {
    const synthesis = this.synthesis;
    const normalizedText = text.trim();

    if (!synthesis || !normalizedText) {
      return;
    }

    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = lang || 'en';

    const voice = this.findVoice(utterance.lang);
    if (voice) {
      utterance.voice = voice;
    }

    synthesis.speak(utterance);
  }

  stop(): void {
    this.synthesis?.cancel();
  }

  private resolveSynthesis(): SpeechSynthesis | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }

    return window.speechSynthesis;
  }

  private findVoice(lang: string): SpeechSynthesisVoice | null {
    const synthesis = this.synthesis;
    if (!synthesis) {
      return null;
    }

    const voices = synthesis.getVoices();
    const normalizedLang = lang.toLowerCase();
    const baseLang = normalizedLang.split('-')[0];

    return (
      voices.find((voice) => voice.lang.toLowerCase() === normalizedLang) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith(`${baseLang}-`)) ??
      voices.find((voice) => voice.lang.toLowerCase() === baseLang) ??
      null
    );
  }
}
