import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechOutputService {
  readonly isSpeaking = signal(false);
  readonly supported = signal(false);

  private readonly synthesis = this.resolveSynthesis();
  private utteranceResolver: (() => void) | null = null;

  constructor() {
    this.supported.set(this.synthesis !== null);
  }

  speak(text: string, lang: string): void {
    const synthesis = this.synthesis;
    const normalizedText = text.trim();

    if (!synthesis || !normalizedText) {
      return;
    }

    void this.speakOnce(normalizedText, lang);
  }

  speakOnce(text: string, lang: string): Promise<void> {
    const synthesis = this.synthesis;
    const normalizedText = text.trim();

    if (!synthesis || !normalizedText) {
      return Promise.resolve();
    }

    this.stop();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(normalizedText);
      utterance.lang = lang || 'en';

      const voice = this.findVoice(utterance.lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (this.utteranceResolver !== resolve) {
          return;
        }

        this.isSpeaking.set(false);
        this.utteranceResolver = null;
        resolve();
      };
      utterance.onerror = () => {
        if (this.utteranceResolver !== resolve) {
          return;
        }

        this.isSpeaking.set(false);
        this.utteranceResolver = null;
        resolve();
      };

      this.isSpeaking.set(true);
      this.utteranceResolver = resolve;
      synthesis.speak(utterance);
    });
  }

  stop(): void {
    const resolver = this.utteranceResolver;
    this.utteranceResolver = null;
    this.isSpeaking.set(false);
    this.synthesis?.cancel();
    resolver?.();
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
