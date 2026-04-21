import { DatePipe } from '@angular/common';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatChipInputEvent, MatChipsModule } from "@angular/material/chips";
import { MatDialog } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { AddModalComponent } from "./add-word/add-modal.component";
import { DbService } from "../db/db.service";
import { Word } from "../models/word";
import { LanguageSettingsService } from "../services/language-settings.service";
import { SpeechInputService } from "../services/speech-input.service";
import { normalizeTag, normalizeTags } from "../tags/tag-utils";
import { HiddenSide, WordLearningRowComponent } from "./word-learning-row.component";
import {
  compareWordsByDate,
  compareWordsByScore,
  matchesWordScoreFilter,
  WordScoreFilterMode,
  WordSortMode
} from "../words/word-utils";
import { buildAddWordDialogConfig } from "./add-word/word-dialog";

type LearningDirection = 'source-to-target' | 'target-to-source' | 'random';
type WordGroup = { key: string; label: string; day?: Date; words: Word[] };

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

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="compact-controls-row sm:col-span-2">
              <div class="compact-control" aria-label="Review order">
                <div class="compact-control-label">
                  <mat-icon>sort</mat-icon>
                  <span>Review order</span>
                </div>
                <mat-button-toggle-group
                  class="compact-toggle-group"
                  [value]="sortMode()"
                  aria-label="Review order"
                  (valueChange)="setSortMode($event)">
                  <mat-button-toggle
                    value="date"
                    aria-label="Order by date"
                    title="Order by date">
                    <mat-icon>schedule</mat-icon>
                  </mat-button-toggle>
                  <mat-button-toggle
                    value="score-by-date"
                    aria-label="Order by score inside each date group"
                    title="Order by score inside each date group">
                    <mat-icon>view_agenda</mat-icon>
                  </mat-button-toggle>
                  <mat-button-toggle
                    value="score"
                    aria-label="Order by score"
                    title="Order by score">
                    <mat-icon>local_fire_department</mat-icon>
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>

              <div class="compact-controls-divider" aria-hidden="true"></div>

              <div class="compact-control" aria-label="Score filter">
                <div class="compact-control-label">
                  <mat-icon>filter_alt</mat-icon>
                  <span>Score filter</span>
                </div>
                <mat-button-toggle-group
                  class="compact-toggle-group"
                  [value]="scoreFilter()"
                  aria-label="Score filter"
                  (valueChange)="setScoreFilter($event)">
                  <mat-button-toggle
                    value="default"
                    aria-label="Default filter, score greater than or equal to zero"
                    title="Default filter, score greater than or equal to zero">
                    <mat-icon>adjust</mat-icon>
                  </mat-button-toggle>
                  <mat-button-toggle
                    value="wrong"
                    aria-label="Wrong filter, score greater than or equal to one"
                    title="Wrong filter, score greater than or equal to one">
                    <mat-icon>priority_high</mat-icon>
                  </mat-button-toggle>
                  <mat-button-toggle
                    value="all"
                    aria-label="Show all scores"
                    title="Show all scores">
                    <mat-icon>apps</mat-icon>
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2 text-slate-500">
            <span
              class="summary-badge"
              title="Visible words">
              <mat-icon class="!h-4 !w-4 !text-base">visibility</mat-icon>
              <span>Shown</span>
              <strong class="text-slate-700">{{ filteredWords().length }}</strong>
            </span>
            <span
              class="summary-badge"
              title="Total words">
              <mat-icon class="!h-4 !w-4 !text-base">inventory_2</mat-icon>
              <span>Total</span>
              <strong class="text-slate-700">{{ words().length }}</strong>
            </span>
          </div>
        </mat-card-content>
      </mat-card>

      @if (groupedWords().length === 0) {
        <mat-card>
          <mat-card-content class="py-10 text-center text-slate-500">
            No words match the current search, tag, and score filters.
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="flex flex-col gap-4">
          @for (group of groupedWords(); track group.key) {
            <section class="flex flex-col gap-2">
              <div class="px-1 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                @if (group.day) {
                  {{ group.day | date: 'mediumDate' }}
                } @else {
                  {{ group.label }}
                }
              </div>
              <div class="flex flex-col gap-2">
                @for (word of group.words; track word.id) {
                  <app-word-learning-row
                    [word]="word"
                    [learningMode]="learningMode()"
                    [hiddenSide]="getHiddenSide(word)"
                    (markWord)="markWord($event)"
                    (editWord)="openEditDialog($event)"
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

    .compact-controls-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      align-items: stretch;
      gap: 0.875rem;
    }

    .compact-control {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.375rem;
    }

    .compact-control-label {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding-inline: 0.125rem;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgb(100 116 139);
    }

    .compact-controls-divider {
      width: 1px;
      background: rgb(226 232 240);
      align-self: stretch;
    }

    .compact-toggle-group {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      min-width: 0;
    }

    :host ::ng-deep .compact-toggle-group .mat-button-toggle-button {
      width: 100%;
    }

    :host ::ng-deep .compact-toggle-group .mat-button-toggle-label-content {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-inline: 0.5rem;
      line-height: 2rem;
    }

    .summary-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 9999px;
      background: rgb(241 245 249);
      padding: 0.5rem 0.875rem;
      font-size: 0.75rem;
      font-weight: 500;
    }

    @media (max-width: 639px) {
      :host ::ng-deep .compact-toggle-group .mat-button-toggle-label-content {
        padding-inline: 0.375rem;
        line-height: 1.875rem;
      }
    }
  `
})
export class HomeComponent {
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly db = inject(DbService);
  readonly dialog = inject(MatDialog);
  readonly settings = inject(LanguageSettingsService);
  readonly speech = inject(SpeechInputService);
  readonly words = signal<Word[]>([]);
  readonly savedTags = signal<string[]>([]);
  readonly selectedTagFilters = signal<string[]>([]);
  readonly learningMode = signal(false);
  readonly learningDirection = signal<LearningDirection>('source-to-target');
  readonly sortMode = signal<WordSortMode>('date');
  readonly scoreFilter = signal<WordScoreFilterMode>('default');
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly tagFilterInput = new FormControl('', { nonNullable: true });
  readonly searchText = toSignal(this.searchControl.valueChanges, { initialValue: this.searchControl.value });
  readonly tagFilterQuery = toSignal(this.tagFilterInput.valueChanges, { initialValue: this.tagFilterInput.value });
  readonly filteredWords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const activeTagFilters = this.selectedTagFilters();
    const scoreFilter = this.scoreFilter();

    return this.words().filter((word) => {
      const matchesQuery = query === '' || [
        word.word,
        word.translation,
        word.notes,
        ...word.tags
      ].some((value) => value.toLowerCase().includes(query));
      const matchesTags = activeTagFilters.every((tag) => word.tags.includes(tag));
      const matchesScore = matchesWordScoreFilter(word, scoreFilter);

      return matchesQuery && matchesTags && matchesScore;
    });
  });
  readonly groupedWords = computed(() => this.groupWords(this.filteredWords()));

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

  setSortMode(mode: WordSortMode): void {
    if (!mode) {
      return;
    }

    this.sortMode.set(mode);
  }

  setScoreFilter(filter: WordScoreFilterMode): void {
    if (!filter) {
      return;
    }

    this.scoreFilter.set(filter);
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
      word.correctAnswers++;
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
      correctAnswers: 0,
      mergeMatches: 0,
      lastAnswered: new Date()
    });
    this.settings.notifyWordDataChanged();
  }

  openEditDialog(word: Word): void {
    this.dialog.open(AddModalComponent, buildAddWordDialogConfig({ word }));
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

    const sortedWords = [...words].sort(compareWordsByDate);

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

  private groupWords(words: Word[]): WordGroup[] {
    if (this.sortMode() === 'score') {
      const sortedWords = [...words].sort(compareWordsByScore);
      return sortedWords.length > 0
        ? [{
          key: 'score',
          label: 'Highest score first',
          words: sortedWords
        }]
        : [];
    }

    return this.groupWordsByDay(
      words,
      this.sortMode() === 'score-by-date' ? compareWordsByScore : compareWordsByDate
    );
  }

  private groupWordsByDay(
    words: Word[],
    compareWords: (leftWord: Word, rightWord: Word) => number
  ): WordGroup[] {
    const grouped = new Map<string, WordGroup>();

    for (const word of words) {
      const dayKey = word.lastAnswered.toDateString();
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, {
          key: dayKey,
          label: dayKey,
          day: new Date(dayKey),
          words: []
        });
      }

      grouped.get(dayKey)!.words.push(word);
    }

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        words: [...group.words].sort(compareWords)
      }))
      .sort((leftGroup, rightGroup) =>
        (rightGroup.day?.getTime() ?? 0) - (leftGroup.day?.getTime() ?? 0)
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
