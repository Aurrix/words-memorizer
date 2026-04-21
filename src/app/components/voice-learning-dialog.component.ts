import { Component, inject, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { DbService } from "../db/db.service";
import { Word } from "../models/word";
import { LanguageSettingsService } from "../services/language-settings.service";
import { SpeechInputService } from "../services/speech-input.service";
import { SpeechOutputService } from "../services/speech-output.service";
import { HiddenSide } from "./word-learning-row.component";
import { applyWordOutcome, normalizeWordMatchValue } from "../words/word-utils";

type VoiceLearningState = 'idle' | 'speaking' | 'listening' | 'correct' | 'wrong' | 'complete';

export interface VoiceLearningDialogItem {
  word: Word;
  hiddenSide: HiddenSide;
}

export interface VoiceLearningDialogData {
  queue: VoiceLearningDialogItem[];
}

@Component({
  selector: 'app-voice-learning-dialog',
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatIconModule
  ],
  template: `
    <h1 mat-dialog-title class="voice-dialog-title m-auto text-center">Voice learning</h1>
    <div mat-dialog-content class="voice-dialog-body flex flex-col gap-5">
      <div class="voice-status-card flex items-center justify-between gap-3.5">
        <div class="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
          <mat-icon class="text-slate-500">{{ statusIcon() }}</mat-icon>
          <span class="truncate">{{ statusLabel() }}</span>
        </div>
        <div class="voice-pill rounded-full px-3 py-1 text-xs font-semibold text-slate-600">
          {{ progressLabel() }}
        </div>
      </div>

      <div class="voice-pills-row flex flex-wrap gap-2.5 text-xs text-slate-500">
        <span class="voice-pill inline-flex items-center rounded-full px-2.5 py-1 font-semibold">
          Queue {{ queue.length }}
        </span>
        <span class="voice-pill inline-flex items-center rounded-full px-2.5 py-1 font-semibold">
          Speak {{ expectedLanguageLabel() }}
        </span>
      </div>

      @if (promptText()) {
        <section class="voice-panel rounded-2xl px-3 py-3">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prompt</div>
          <div class="mt-2 text-base font-semibold text-slate-900" [attr.lang]="promptLanguage()">
            {{ promptText() }}
          </div>
        </section>
      }

      @if (heardTranscript()) {
        <section class="voice-panel rounded-2xl bg-white px-3 py-3">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Heard</div>
          <div class="mt-2 text-sm text-slate-700" [attr.lang]="expectedLanguage()">
            {{ heardTranscript() }}
          </div>
        </section>
      }
    </div>
    <div mat-dialog-actions align="center" class="voice-dialog-actions">
      <button mat-button type="button" (click)="close()">
        {{ state() === 'complete' ? 'Close' : 'Stop' }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .voice-dialog-title {
      letter-spacing: -0.01em;
      font-weight: 700;
    }

    .voice-dialog-body {
      padding: 0.625rem 0.375rem 0.375rem;
    }

    .voice-status-card {
      border: 1px solid rgb(226 232 240 / 0.9);
      border-radius: 1rem;
      background: rgb(248 250 252 / 0.92);
      padding: 0.75rem 0.875rem;
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.75);
    }

    .voice-pill {
      border: 1px solid rgb(226 232 240 / 0.85);
      background: rgb(248 250 252 / 0.92);
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.72);
    }

    .voice-panel {
      border: 1px solid rgb(226 232 240 / 0.88);
      background: rgb(255 255 255 / 0.84);
      box-shadow: 0 18px 34px -30px rgb(15 23 42 / 0.35);
    }

    .voice-pills-row,
    .voice-panel {
      margin-top: 0.125rem;
    }

    .voice-dialog-actions {
      padding: 0.75rem 1rem 1rem;
    }
  `
})
export class VoiceLearningDialogComponent implements OnDestroy {
  readonly dialogRef = inject(MatDialogRef<VoiceLearningDialogComponent>);
  readonly dialogData = inject(MAT_DIALOG_DATA) as VoiceLearningDialogData;
  readonly db = inject(DbService);
  readonly settings = inject(LanguageSettingsService);
  readonly speechInput = inject(SpeechInputService);
  readonly speechOutput = inject(SpeechOutputService);

  readonly queue = this.dialogData.queue;
  readonly state = signal<VoiceLearningState>('idle');
  readonly currentIndex = signal(0);
  readonly promptText = signal('');
  readonly promptLanguage = signal('');
  readonly expectedLanguage = signal('');
  readonly heardTranscript = signal('');

  private sessionId = 0;

  constructor() {
    if (this.queue.length === 0) {
      this.state.set('complete');
      return;
    }

    void this.start();
  }

  ngOnDestroy(): void {
    this.stop(false);
  }

  close(): void {
    this.stop(false);
    this.dialogRef.close();
  }

  progressLabel(): string {
    if (this.queue.length === 0) {
      return '0 / 0';
    }

    if (this.state() === 'complete') {
      return `${this.queue.length} / ${this.queue.length}`;
    }

    return `${Math.min(this.currentIndex() + 1, this.queue.length)} / ${this.queue.length}`;
  }

  expectedLanguageLabel(): string {
    const item = this.queue[this.currentIndex()];
    if (!item) {
      return 'answer';
    }

    return item.hiddenSide === 'target' ? 'translation' : 'source word';
  }

  statusIcon(): string {
    switch (this.state()) {
      case 'speaking':
        return 'volume_up';
      case 'listening':
        return 'mic';
      case 'correct':
        return 'check_circle';
      case 'wrong':
        return 'cancel';
      case 'complete':
        return 'task_alt';
      case 'idle':
      default:
        return 'record_voice_over';
    }
  }

  statusLabel(): string {
    switch (this.state()) {
      case 'speaking':
        return 'Reading the visible word';
      case 'listening':
        return 'Listening for the hidden answer';
      case 'correct':
        return 'Correct answer';
      case 'wrong':
        return 'Wrong answer, continuing';
      case 'complete':
        return 'Voice learning complete';
      case 'idle':
      default:
        return 'Preparing voice learning';
    }
  }

  private async start(): Promise<void> {
    const sessionId = ++this.sessionId;
    this.state.set('idle');
    this.heardTranscript.set('');

    for (let index = 0; index < this.queue.length; index++) {
      if (!this.isSessionActive(sessionId)) {
        return;
      }

      const item = this.queue[index];
      const visibleText = item.hiddenSide === 'target' ? item.word.word : item.word.translation;
      const visibleLanguage = item.hiddenSide === 'target'
        ? item.word.sourceLanguage
        : item.word.targetLanguage;
      const hiddenText = item.hiddenSide === 'target' ? item.word.translation : item.word.word;
      const hiddenLanguage = item.hiddenSide === 'target'
        ? item.word.targetLanguage
        : item.word.sourceLanguage;

      this.currentIndex.set(index);
      this.promptText.set(visibleText);
      this.promptLanguage.set(visibleLanguage);
      this.expectedLanguage.set(hiddenLanguage);
      this.heardTranscript.set('');
      this.state.set('speaking');

      await this.speechOutput.speakOnce(visibleText, visibleLanguage);
      if (!this.isSessionActive(sessionId)) {
        return;
      }

      this.state.set('listening');
      const transcript = await this.speechInput.listenOnce('voice-learning-dialog', hiddenLanguage);
      if (!this.isSessionActive(sessionId)) {
        return;
      }

      this.heardTranscript.set(transcript ?? '');

      const outcome = this.matchesVoiceAnswer(hiddenText, transcript) ? 'correct' : 'incorrect';
      this.state.set(outcome === 'correct' ? 'correct' : 'wrong');

      await this.db.words.put(applyWordOutcome(item.word, outcome, item.hiddenSide));
      this.settings.notifyWordDataChanged();
      if (!this.isSessionActive(sessionId)) {
        return;
      }

      await this.speechOutput.speakOnce(outcome === 'correct' ? 'Correct' : 'Wrong', 'en');
      if (!this.isSessionActive(sessionId)) {
        return;
      }

      await this.delay(250);
    }

    if (!this.isSessionActive(sessionId)) {
      return;
    }

    this.state.set('complete');
    this.speechInput.stop();
    this.speechOutput.stop();
  }

  private stop(resetState = true): void {
    this.sessionId++;
    this.speechInput.stop();
    this.speechOutput.stop();

    if (resetState) {
      this.state.set('idle');
      this.currentIndex.set(0);
      this.promptText.set('');
      this.promptLanguage.set('');
      this.expectedLanguage.set('');
      this.heardTranscript.set('');
    }
  }

  private matchesVoiceAnswer(hiddenText: string, transcript: string | null): boolean {
    const normalizedTranscript = normalizeWordMatchValue(transcript ?? '');
    if (!normalizedTranscript) {
      return false;
    }

    return normalizeWordMatchValue(hiddenText).includes(normalizedTranscript);
  }

  private isSessionActive(sessionId: number): boolean {
    return this.sessionId === sessionId;
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  }
}
