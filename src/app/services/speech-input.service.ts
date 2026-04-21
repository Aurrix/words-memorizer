import { Injectable, signal } from '@angular/core';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

@Injectable({ providedIn: 'root' })
export class SpeechInputService {
  readonly activeField = signal<string | null>(null);
  readonly supported = signal(false);

  private readonly recognitionCtor = this.resolveRecognitionCtor();
  private recognition: SpeechRecognitionLike | null = null;
  private recognitionResult = '';
  private recognitionResolver: ((transcript: string | null) => void) | null = null;

  constructor() {
    this.supported.set(this.recognitionCtor !== null);
  }

  isListening(fieldKey: string): boolean {
    return this.activeField() === fieldKey;
  }

  toggle(fieldKey: string, lang: string, onResult: (transcript: string) => void): void {
    if (!this.recognitionCtor) {
      return;
    }

    if (this.activeField() === fieldKey) {
      this.stop();
      return;
    }

    this.stop();

    this.startRecognition(fieldKey, lang, {
      onResult,
      resolveOnEnd: false
    });
  }

  listenOnce(fieldKey: string, lang: string): Promise<string | null> {
    if (!this.recognitionCtor) {
      return Promise.resolve(null);
    }

    this.stop();

    return new Promise((resolve) => {
      this.recognitionResolver = resolve;
      this.startRecognition(fieldKey, lang, {
        onResult: (transcript) => {
          this.recognitionResult = transcript;
        },
        resolveOnEnd: true
      });
    });
  }

  stop(): void {
    const recognition = this.recognition;
    const resolver = this.recognitionResolver;
    this.recognition = null;
    this.recognitionResult = '';
    this.recognitionResolver = null;
    this.activeField.set(null);
    recognition?.stop();
    resolver?.(null);
  }

  private resolveRecognitionCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const globalWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };

    return globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null;
  }

  private resetRecognition(recognition: SpeechRecognitionLike): void {
    if (this.recognition !== recognition) {
      return;
    }

    const resolver = this.recognitionResolver;
    const transcript = this.recognitionResult.trim();
    this.recognition = null;
    this.recognitionResult = '';
    this.recognitionResolver = null;
    this.activeField.set(null);
    resolver?.(transcript || null);
  }

  private startRecognition(
    fieldKey: string,
    lang: string,
    options: {
      onResult: (transcript: string) => void;
      resolveOnEnd: boolean;
    }
  ): void {
    if (!this.recognitionCtor) {
      return;
    }

    const recognition = new this.recognitionCtor();
    recognition.lang = lang || 'en';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript?.trim() ?? '')
        .filter((value) => value.length > 0)
        .join(' ')
        .trim();

      if (transcript) {
        options.onResult(transcript);
      }
    };
    recognition.onerror = () => {
      this.resetRecognition(recognition);
    };
    recognition.onend = () => {
      if (options.resolveOnEnd) {
        this.resetRecognition(recognition);
        return;
      }

      if (this.recognition !== recognition) {
        return;
      }

      this.recognition = null;
      this.activeField.set(null);
    };

    this.recognition = recognition;
    this.recognitionResult = '';
    this.activeField.set(fieldKey);

    try {
      recognition.start();
    } catch {
      this.resetRecognition(recognition);
    }
  }
}
