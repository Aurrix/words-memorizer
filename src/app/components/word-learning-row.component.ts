import { Component, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule, MatMenuTrigger } from "@angular/material/menu";
import { Word } from "../models/word";
import { SpeechOutputService } from "../services/speech-output.service";
import {
  formatWordScore,
  getWordCorrectAnswers,
  getWordHeatPalette,
  getWordMergeMatches,
  getWordScore,
  getWordScoreLevel,
  WORD_MERGE_SCORE_WEIGHT
} from "../words/word-utils";

export type HiddenSide = 'source' | 'target';

@Component({
  selector: 'app-word-learning-row',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  template: `
    <div class="relative overflow-hidden rounded-xl">
      @if (learningMode) {
        <div class="absolute inset-0 flex text-[10px] font-semibold uppercase tracking-[0.2em]">
          <div class="flex flex-1 items-center justify-start bg-red-100 px-3 text-red-700">
            <mat-icon class="!h-4 !w-4 !text-base">close</mat-icon>
          </div>
          <div class="flex flex-1 items-center justify-end bg-green-100 px-3 text-green-700">
            <mat-icon class="!h-4 !w-4 !text-base">check</mat-icon>
          </div>
        </div>
      }

      <button
        class="absolute right-0 top-0 h-0 w-0 opacity-0"
        [matMenuTriggerFor]="actionsMenu"
        #actionsTrigger="matMenuTrigger"
        type="button">
      </button>

      <mat-menu #actionsMenu="matMenu">
        <button mat-menu-item type="button" (click)="resetWord.emit(word)">
          <mat-icon>restart_alt</mat-icon>
          <span>Reset stats</span>
        </button>
        <button mat-menu-item type="button" (click)="editWord.emit(word)">
          <mat-icon>edit</mat-icon>
          <span>Edit word</span>
        </button>
        <button mat-menu-item type="button" (click)="deleteWord.emit(word)">
          <mat-icon>delete</mat-icon>
          <span>Delete word</span>
        </button>
      </mat-menu>

      <div
        class="learning-row-card relative z-10 rounded-2xl border px-3 py-3 transition-transform duration-150 select-none sm:px-3.5"
        [class.cursor-pointer]="learningMode"
        [style.touch-action]="learningMode ? 'pan-y' : 'auto'"
        [style.background-color]="surfaceColor"
        [style.border-color]="borderColor"
        [style.transform]="'translateX(' + dragOffset + 'px)'"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerCancel($event)"
        (contextmenu)="onContextMenu($event)">
        <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5 sm:items-center sm:gap-2">
          <div class="word-side-panel rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5">
            @if (isHidden('source') && !isRevealed) {
              <div class="text-sm font-semibold tracking-[0.24em] text-slate-300 sm:text-base">
                ......
              </div>
            } @else {
              <div class="flex items-center justify-between gap-2">
                <div class="word-text min-w-0 flex-1 leading-tight text-sm font-semibold text-slate-900 sm:text-base" [attr.lang]="word.sourceLanguage">
                  {{ word.word }}
                </div>
                @if (speech.supported()) {
                  <button
                    mat-icon-button
                    type="button"
                    class="compact-speak-button text-slate-400"
                    aria-label="Speak source word"
                    title="Speak source word"
                    (pointerdown)="stopEvent($event)"
                    (pointerup)="stopEvent($event)"
                    (click)="speakText($event, word.word, word.sourceLanguage)">
                    <mat-icon class="!h-3 !w-3 !text-[11px] sm:!h-3.5 sm:!w-3.5 sm:!text-xs">volume_up</mat-icon>
                  </button>
                }
              </div>
            }
          </div>

          <div class="divider-icon flex items-center justify-center text-slate-300">
            <mat-icon class="!h-3.5 !w-3.5 !text-[13px] sm:!h-4 sm:!w-4 sm:!text-sm">compare_arrows</mat-icon>
          </div>

          <div class="word-side-panel rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5">
            @if (isHidden('target') && !isRevealed) {
              <div class="text-sm font-semibold tracking-[0.24em] text-slate-300 sm:text-base">
                ......
              </div>
            } @else {
              <div class="flex items-center justify-between gap-2">
                <div class="word-text min-w-0 flex-1 leading-tight text-sm font-semibold text-slate-900 sm:text-base" [attr.lang]="word.targetLanguage">
                  {{ word.translation }}
                </div>
                @if (speech.supported()) {
                  <button
                    mat-icon-button
                    type="button"
                    class="compact-speak-button text-slate-400"
                    aria-label="Speak translation"
                    title="Speak translation"
                    (pointerdown)="stopEvent($event)"
                    (pointerup)="stopEvent($event)"
                    (click)="speakText($event, word.translation, word.targetLanguage)">
                    <mat-icon class="!h-3 !w-3 !text-[11px] sm:!h-3.5 sm:!w-3.5 sm:!text-xs">volume_up</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <div class="badge-row mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
          <span
            class="score-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
            [style.background-color]="badgeBackgroundColor"
            [style.color]="badgeTextColor"
            [title]="scoreBadgeTitle">
            {{ scoreLabel }}
          </span>
          @if (mergeMatches > 0) {
            <span class="meta-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-slate-600">
              <mat-icon class="!h-3.5 !w-3.5 !text-[13px]">call_merge</mat-icon>
              {{ mergeMatches }}x{{ mergeScoreWeight }}
            </span>
          }
          @for (tag of word.tags; track tag) {
            <span class="tag-chip inline-flex items-center rounded-full px-2 py-0.5 font-medium text-slate-500">
                #{{ tag }}
            </span>
          }
        </div>

        @if (showDetails) {
          <div class="detail-row mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
            <span class="detail-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <mat-icon class="!h-3.5 !w-3.5 !text-[13px]">done_all</mat-icon>
              {{ correctAnswers }}
            </span>
            <span class="detail-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <mat-icon class="!h-3.5 !w-3.5 !text-[13px]">done</mat-icon>
              {{ word.streak }}
            </span>
            <span class="detail-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <mat-icon class="!h-3.5 !w-3.5 !text-[13px]">compare_arrows</mat-icon>
              {{ word.reverseStreak }}
            </span>
            <span class="detail-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <mat-icon class="!h-3.5 !w-3.5 !text-[13px]">close</mat-icon>
              {{ word.wrongAnswers }}
            </span>
            @if (mergeMatches > 0) {
              <span class="detail-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5">
                <mat-icon class="!h-3.5 !w-3.5 !text-[13px]">call_merge</mat-icon>
                {{ mergeMatches }}x{{ mergeScoreWeight }}
              </span>
            }
          </div>

          @if (word.notes) {
            <div class="notes-panel mt-2.5 whitespace-pre-wrap rounded-xl px-3 py-2 text-xs text-slate-700" [attr.lang]="word.sourceLanguage">
              {{ word.notes }}
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .learning-row-card {
      box-shadow: 0 16px 32px -26px rgb(15 23 42 / 0.35);
      backdrop-filter: saturate(150%) blur(10px);
    }

    .word-side-panel {
      background: rgb(255 255 255 / 0.62);
      border: 1px solid rgb(255 255 255 / 0.58);
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.55);
    }

    .divider-icon {
      align-self: center;
    }

    .word-text {
      display: block;
      overflow: hidden;
      white-space: normal;
      word-break: break-word;
      line-height: 1.25;
      max-height: 2.5em;
    }

    .badge-row,
    .detail-row {
      line-height: 1;
    }

    .score-chip {
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.22);
    }

    .meta-chip,
    .tag-chip,
    .detail-chip {
      background: rgb(255 255 255 / 0.74);
      border: 1px solid rgb(226 232 240 / 0.88);
    }

    .notes-panel {
      background: rgb(255 247 237 / 0.9);
      border: 1px solid rgb(253 230 138 / 0.55);
    }

    :host ::ng-deep .compact-speak-button.mat-mdc-icon-button {
      width: 1.25rem;
      height: 1.25rem;
      min-height: 1.25rem;
      padding: 0;
      margin-right: -0.125rem;
      --mdc-icon-button-state-layer-size: 1.25rem;
    }

    :host ::ng-deep .compact-speak-button .mat-mdc-button-touch-target,
    :host ::ng-deep .compact-speak-button .mat-mdc-button-persistent-ripple,
    :host ::ng-deep .compact-speak-button .mat-ripple {
      width: 1.25rem;
      height: 1.25rem;
    }

    @media (min-width: 640px) {
      :host ::ng-deep .compact-speak-button.mat-mdc-icon-button {
        width: 1.375rem;
        height: 1.375rem;
        min-height: 1.375rem;
        --mdc-icon-button-state-layer-size: 1.375rem;
      }

      :host ::ng-deep .compact-speak-button .mat-mdc-button-touch-target,
      :host ::ng-deep .compact-speak-button .mat-mdc-button-persistent-ripple,
      :host ::ng-deep .compact-speak-button .mat-ripple {
        width: 1.375rem;
        height: 1.375rem;
      }
    }
  `
})
export class WordLearningRowComponent {
  @Input({ required: true }) word!: Word;
  @Input() learningMode = false;
  @Input() hiddenSide: HiddenSide = 'target';
  @Output() markWord = new EventEmitter<{ word: Word; outcome: 'correct' | 'incorrect'; hiddenSide: HiddenSide }>();
  @Output() editWord = new EventEmitter<Word>();
  @Output() resetWord = new EventEmitter<Word>();
  @Output() deleteWord = new EventEmitter<Word>();
  @ViewChild(MatMenuTrigger) actionsTrigger?: MatMenuTrigger;

  readonly speech = inject(SpeechOutputService);
  correctAnswers = 0;
  dragOffset = 0;
  badgeBackgroundColor = '#f8fafc';
  badgeTextColor = '#475569';
  borderColor = '#e2e8f0';
  isRevealed = false;
  mergeScoreWeight = WORD_MERGE_SCORE_WEIGHT;
  mergeMatches = 0;
  scoreLabel = '0';
  scoreBadgeTitle = 'Score';
  showDetails = false;
  surfaceColor = '#ffffff';

  private activePointerId: number | null = null;
  private longPressHandle: ReturnType<typeof setTimeout> | undefined;
  private longPressTriggered = false;
  private startX = 0;
  private startY = 0;
  private movedFarEnough = false;
  private lastTapAt = 0;

  ngOnChanges(): void {
    this.dragOffset = 0;
    this.isRevealed = !this.learningMode;
    this.showDetails = false;
    this.refreshMetrics();
  }

  isHidden(side: HiddenSide): boolean {
    return this.learningMode && this.hiddenSide === side;
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.dragOffset = 0;
    this.movedFarEnough = false;
    this.longPressTriggered = false;

    try {
      (event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not always available, especially in synthetic test environments.
    }

    window.clearTimeout(this.longPressHandle);
    // @ts-ignore
    this.longPressHandle = window.setTimeout(() => {
      this.openActionsMenu();
    }, 450);
  }

  onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.movedFarEnough = true;
      window.clearTimeout(this.longPressHandle);
    }

    if (!this.learningMode || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    event.preventDefault();
    this.dragOffset = Math.max(Math.min(deltaX, 120), -120);
  }

  onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    window.clearTimeout(this.longPressHandle);
    this.releasePointerCapture(event);

    if (this.longPressTriggered) {
      this.resetGesture();
      return;
    }

    if (this.learningMode && Math.abs(this.dragOffset) >= 90) {
      this.markWord.emit({
        word: this.word,
        outcome: this.dragOffset < 0 ? 'correct' : 'incorrect',
        hiddenSide: this.hiddenSide
      });
      this.resetGesture();
      return;
    }

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    const isTap = Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && !this.movedFarEnough;

    if (isTap) {
      const now = Date.now();
      if (now - this.lastTapAt < 280) {
        this.handleDoubleTap();
        this.lastTapAt = 0;
      } else {
        this.lastTapAt = now;
      }
    }

    this.resetGesture();
  }

  onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.releasePointerCapture(event);
    this.resetGesture();
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.openActionsMenu();
  }

  resetGesture(): void {
    window.clearTimeout(this.longPressHandle);
    this.activePointerId = null;
    this.dragOffset = 0;
    this.movedFarEnough = false;
    this.longPressTriggered = false;
  }

  speakText(event: Event, text: string, lang: string): void {
    this.stopEvent(event);
    this.speech.speak(text, lang);
  }

  stopEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private handleDoubleTap(): void {
    if (this.learningMode) {
      this.isRevealed = true;
      this.showDetails = true;
      return;
    }

    this.showDetails = !this.showDetails;
  }

  private openActionsMenu(): void {
    this.longPressTriggered = true;
    this.dragOffset = 0;
    this.actionsTrigger?.openMenu();
  }

  private releasePointerCapture(event: PointerEvent): void {
    try {
      (event.currentTarget as HTMLElement | null)?.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures for non-captured pointers.
    }
  }

  private refreshMetrics(): void {
    this.correctAnswers = getWordCorrectAnswers(this.word);
    this.mergeMatches = getWordMergeMatches(this.word);

    const scoreLevel = getWordScoreLevel(this.word);
    const palette = getWordHeatPalette(scoreLevel);
    const score = getWordScore(this.word);

    this.scoreLabel = formatWordScore(score);
    this.scoreBadgeTitle = `Score ${this.scoreLabel}`;
    this.surfaceColor = palette.surface;
    this.borderColor = palette.border;
    this.badgeBackgroundColor = palette.badgeBackground;
    this.badgeTextColor = palette.badgeText;
  }
}
