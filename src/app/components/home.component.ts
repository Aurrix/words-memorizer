import { DatePipe } from '@angular/common';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatChipInputEvent, MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { DbService } from "../db/db.service";
import { Word } from "../models/word";
import { LanguageSettingsService } from "../services/language-settings.service";
import { SpeechInputService } from "../services/speech-input.service";
import { normalizeTag, normalizeTags } from "../tags/tag-utils";
import { HiddenSide, WordLearningRowComponent } from "./word-learning-row.component";

type LearningDirection = 'source-to-target' | 'target-to-source' | 'random';
type WordDayGroup = { dayKey: string; day: Date; words: Word[] };

@Component({
  selector: 'app-home',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    WordLearningRowComponent
  ],
  template: `
    <div class="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <mat-card>
        <mat-card-content class="flex flex-col gap-4 pt-4">
          <div class="flex items-start gap-3">
            <mat-form-field class="search-field min-w-0 flex-1">
              <mat-label>Search</mat-label>
              <input
                matInput
                class="text-right text-sm"
                [formControl]="searchControl"
                [attr.lang]="settings.activeSourceLanguage()"
                placeholder="Search">
              @if (speech.supported()) {
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  [attr.aria-label]="speech.isListening('home-search') ? 'Stop voice input for search' : 'Start voice input for search'"
                  [title]="speech.isListening('home-search') ? 'Stop voice input' : 'Voice input'"
                  (click)="toggleSpeech('home-search', searchControl, settings.activeSourceLanguage())">
                  <mat-icon>{{ speech.isListening('home-search') ? 'graphic_eq' : 'mic' }}</mat-icon>
                </button>
              }
              <button
                mat-icon-button
                matSuffix
                type="button"
                aria-label="Clear search"
                [disabled]="searchControl.value === ''"
                (click)="searchControl.setValue('')">
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>

            <mat-button-toggle-group
              class="learning-direction-group mt-1 shrink-0"
              [value]="learningMode() ? learningDirection() : null"
              aria-label="Learning direction">
              <mat-button-toggle
                value="source-to-target"
                aria-label="Source to target"
                title="Source to target"
                (click)="toggleLearningDirection('source-to-target')">
                <mat-icon>east</mat-icon>
              </mat-button-toggle>
              <mat-button-toggle
                value="target-to-source"
                aria-label="Target to source"
                title="Target to source"
                (click)="toggleLearningDirection('target-to-source')">
                <mat-icon>west</mat-icon>
              </mat-button-toggle>
              <mat-button-toggle
                value="random"
                aria-label="Random side"
                title="Random side"
                (click)="toggleLearningDirection('random')">
                <mat-icon>shuffle</mat-icon>
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <mat-form-field class="w-full">
            <mat-label>Filter by tags</mat-label>
            <mat-chip-grid #tagFilterGrid aria-label="Selected tag filters">
              @for (tag of selectedTagFilters(); track tag) {
                <mat-chip-row (removed)="removeTagFilter(tag)">
                  {{ tag }}
                  <button matChipRemove type="button" aria-label="Remove tag filter">
                    <mat-icon>cancel</mat-icon>
                  </button>
                </mat-chip-row>
              }
            </mat-chip-grid>
            <input
              matInput
              [formControl]="tagFilterInput"
              [attr.lang]="settings.activeSourceLanguage()"
              [matChipInputFor]="tagFilterGrid"
              [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
              [matAutocomplete]="tagAutocomplete"
              (matChipInputTokenEnd)="addTagFilterFromInput($event)">
            @if (speech.supported()) {
              <button
                mat-icon-button
                matSuffix
                type="button"
                [attr.aria-label]="speech.isListening('home-tags') ? 'Stop voice input for tag filter' : 'Start voice input for tag filter'"
                [title]="speech.isListening('home-tags') ? 'Stop voice input' : 'Voice input'"
                (click)="toggleSpeech('home-tags', tagFilterInput, settings.activeSourceLanguage(), ', ')">
                <mat-icon>{{ speech.isListening('home-tags') ? 'graphic_eq' : 'mic' }}</mat-icon>
              </button>
            }
            <mat-autocomplete #tagAutocomplete="matAutocomplete" (optionSelected)="addSuggestedTagFilter($event)">
              @for (tag of filteredTagSuggestions(); track tag) {
                <mat-option [value]="tag">{{ tag }}</mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>

          <div class="flex flex-wrap gap-2 text-slate-500">
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium"
              title="Visible words">
              <mat-icon class="!h-4 !w-4 !text-base">visibility</mat-icon>
              <span>{{ filteredWords().length }}</span>
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium"
              title="Total words">
              <mat-icon class="!h-4 !w-4 !text-base">inventory_2</mat-icon>
              <span>{{ words().length }}</span>
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium"
              [title]="settings.activePairLabel()">
              <mat-icon class="!h-4 !w-4 !text-base">translate</mat-icon>
              <span class="text-base leading-none">{{ settings.activePairFlags() }}</span>
            </span>
          </div>
        </mat-card-content>
      </mat-card>

      @if (groupedWords().length === 0) {
        <mat-card>
          <mat-card-content class="py-10 text-center text-slate-500">
            No words match the current search and tag filters.
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="flex flex-col gap-4">
          @for (group of groupedWords(); track group.dayKey) {
            <section class="flex flex-col gap-2">
              <div class="px-1 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {{ group.day | date: 'mediumDate' }}
              </div>
              <div class="flex flex-col gap-2">
                @for (word of group.words; track word.id) {
                  <app-word-learning-row
                    [word]="word"
                    [learningMode]="learningMode()"
                    [hiddenSide]="getHiddenSide(word)"
                    (markWord)="markWord($event)"
                    (resetWord)="resetWordStats($event)"
                    (deleteWord)="deleteWord($event)">
                  </app-word-learning-row>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host ::ng-deep .search-field .mat-mdc-form-field-infix {
      min-width: 0;
      padding-inline-end: 1.75rem;
    }

    :host ::ng-deep .search-field .mat-mdc-form-field-icon-suffix {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      white-space: nowrap;
    }

    :host ::ng-deep .search-field .mdc-floating-label {
      max-width: calc(100% - 1.75rem);
    }

    :host ::ng-deep .search-field input.mat-mdc-input-element {
      padding-inline-end: 0;
    }

    @media (min-width: 640px) {
      :host ::ng-deep .search-field .mat-mdc-form-field-infix {
        padding-inline-end: 3.5rem;
      }

      :host ::ng-deep .search-field .mdc-floating-label {
        max-width: calc(100% - 3.5rem);
      }

      :host ::ng-deep .search-field input.mat-mdc-input-element {
        padding-inline-end: 0;
      }
    }

    .learning-direction-group {
      display: flex;
      align-self: flex-start;
    }

    .learning-direction-group .mat-button-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `
})
export class HomeComponent {
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly db = inject(DbService);
  readonly settings = inject(LanguageSettingsService);
  readonly speech = inject(SpeechInputService);
  readonly words = signal<Word[]>([]);
  readonly savedTags = signal<string[]>([]);
  readonly selectedTagFilters = signal<string[]>([]);
  readonly learningMode = signal(false);
  readonly learningDirection = signal<LearningDirection>('source-to-target');
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly tagFilterInput = new FormControl('', { nonNullable: true });
  readonly searchText = toSignal(this.searchControl.valueChanges, { initialValue: this.searchControl.value });
  readonly tagFilterQuery = toSignal(this.tagFilterInput.valueChanges, { initialValue: this.tagFilterInput.value });
  readonly filteredWords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const activeTagFilters = this.selectedTagFilters();

    return this.words().filter((word) => {
      const matchesQuery = query === '' || [
        word.word,
        word.translation,
        word.notes,
        ...word.tags
      ].some((value) => value.toLowerCase().includes(query));
      const matchesTags = activeTagFilters.every((tag) => word.tags.includes(tag));

      return matchesQuery && matchesTags;
    });
  });
  readonly groupedWords = computed(() => this.groupWordsByDay(this.filteredWords()));

  private readonly randomHiddenSides = new Map<number, HiddenSide>();

  constructor() {
    effect(() => {
      if (!this.settings.isReady()) {
        return;
      }

      this.settings.wordDataVersion();
      void this.loadWords();
    });
  }

  filteredTagSuggestions(): string[] {
    const query = normalizeTag(this.tagFilterQuery());
    return this.availableTags().filter((tag) =>
      !this.selectedTagFilters().includes(tag) &&
      (query === '' || tag.includes(query))
    );
  }

  getHiddenSide(word: Word): HiddenSide {
    if (!this.learningMode()) {
      return 'target';
    }

    if (this.learningDirection() === 'source-to-target') {
      return 'target';
    }

    if (this.learningDirection() === 'target-to-source') {
      return 'source';
    }

    return this.randomHiddenSides.get(word.id) ?? 'target';
  }

  toggleLearningDirection(direction: LearningDirection): void {
    if (this.learningMode() && this.learningDirection() === direction) {
      this.learningMode.set(false);
      return;
    }

    this.learningMode.set(true);
    this.learningDirection.set(direction);

    if (direction === 'random') {
      this.refreshRandomHiddenSides(this.filteredWords());
    }
  }

  addTagFilterFromInput(event: MatChipInputEvent): void {
    this.addTagFilter(normalizeTag(event.value ?? ''));
    this.tagFilterInput.setValue('');
    event.chipInput?.clear();
  }

  addSuggestedTagFilter(event: MatAutocompleteSelectedEvent): void {
    this.addTagFilter(normalizeTag(event.option.value));
    this.tagFilterInput.setValue('');
  }

  removeTagFilter(tag: string): void {
    this.selectedTagFilters.update((currentTags) =>
      currentTags.filter((currentTag) => currentTag !== tag)
    );
  }

  toggleSpeech(
    fieldKey: string,
    control: FormControl<string>,
    lang: string,
    separator = ' '
  ): void {
    this.speech.toggle(fieldKey, lang, (transcript) => {
      control.setValue(this.mergeTranscript(control.value, transcript, separator));
      control.markAsTouched();
      control.markAsDirty();
    });
  }

  async markWord(event: { word: Word; outcome: 'correct' | 'incorrect'; hiddenSide: HiddenSide }): Promise<void> {
    const word = { ...event.word };

    if (event.outcome === 'correct') {
      if (event.hiddenSide === 'target') {
        word.streak++;
      } else {
        word.reverseStreak++;
      }
    } else {
      word.streak = 0;
      word.reverseStreak = 0;
      word.wrongAnswers++;
    }

    word.lastAnswered = new Date();
    await this.db.words.put(word);
    this.settings.notifyWordDataChanged();
  }

  async resetWordStats(word: Word): Promise<void> {
    await this.db.words.put({
      ...word,
      streak: 0,
      reverseStreak: 0,
      wrongAnswers: 0,
      lastAnswered: new Date()
    });
    this.settings.notifyWordDataChanged();
  }

  async deleteWord(word: Word): Promise<void> {
    const result = confirm(`Delete "${word.word}"?`);
    if (!result) {
      return;
    }

    await this.db.words.delete(word.id);
    this.settings.notifyWordDataChanged();
  }

  private async loadWords(): Promise<void> {
    const [words, savedTags] = await Promise.all([
      this.db.getWordsForPair(this.settings.activePair()),
      this.db.getSavedTags()
    ]);

    const sortedWords = [...words].sort((leftWord, rightWord) =>
      rightWord.lastAnswered.getTime() - leftWord.lastAnswered.getTime() ||
      rightWord.created.getTime() - leftWord.created.getTime()
    );

    this.words.set(sortedWords);
    this.savedTags.set(savedTags);
    this.refreshRandomHiddenSides(sortedWords);
    this.selectedTagFilters.update((currentTags) =>
      currentTags.filter((tag) => this.availableTags().includes(tag))
    );
  }

  private availableTags(): string[] {
    return normalizeTags([
      ...this.savedTags(),
      ...this.words().flatMap((word) => word.tags)
    ]);
  }

  private addTagFilter(tag: string): void {
    if (!tag || this.selectedTagFilters().includes(tag)) {
      return;
    }

    this.selectedTagFilters.update((currentTags) =>
      [...currentTags, tag].sort((leftTag, rightTag) => leftTag.localeCompare(rightTag))
    );
  }

  private refreshRandomHiddenSides(words: Word[]): void {
    const activeWordIds = new Set(words.map((word) => word.id));

    for (const wordId of Array.from(this.randomHiddenSides.keys())) {
      if (!activeWordIds.has(wordId)) {
        this.randomHiddenSides.delete(wordId);
      }
    }

    for (const word of words) {
      if (!this.randomHiddenSides.has(word.id)) {
        this.randomHiddenSides.set(word.id, Math.random() < 0.5 ? 'source' : 'target');
      }
    }
  }

  private groupWordsByDay(words: Word[]): WordDayGroup[] {
    const grouped = new Map<string, WordDayGroup>();

    for (const word of words) {
      const dayKey = word.lastAnswered.toDateString();
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, {
          dayKey,
          day: new Date(dayKey),
          words: []
        });
      }

      grouped.get(dayKey)!.words.push(word);
    }

    return Array.from(grouped.values()).sort((leftGroup, rightGroup) =>
      rightGroup.day.getTime() - leftGroup.day.getTime()
    );
  }

  private mergeTranscript(currentValue: string, transcript: string, separator: string): string {
    const nextTranscript = transcript.trim();
    if (!nextTranscript) {
      return currentValue;
    }

    if (!currentValue.trim()) {
      return nextTranscript;
    }

    return `${currentValue.trimEnd()}${separator}${nextTranscript}`;
  }
}
