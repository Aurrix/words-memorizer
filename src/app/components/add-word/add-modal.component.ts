import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatChipInputEvent, MatChipsModule } from "@angular/material/chips";
import { DbService } from "../../db/db.service";
import { Word } from "../../models/word";
import { LanguageSettingsService } from "../../services/language-settings.service";
import { SpeechInputService } from "../../services/speech-input.service";
import { normalizeTag } from "../../tags/tag-utils";

@Component({
  selector: 'app-add-modal',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions
  ],
  template: `
    <form [formGroup]="form" class="flex h-full flex-col">
      <h1 mat-dialog-title class="m-auto text-center">
        Add {{ settings.activePairFlags() }}
      </h1>
      <div mat-dialog-content class="flex flex-1 flex-col gap-3 p-3">
        <mat-form-field class="w-full">
          <mat-label>
            {{ settings.getLanguageFlag(settings.activeSourceLanguage()) }}
            {{ settings.getLanguageLabel(settings.activeSourceLanguage()) }} word
          </mat-label>
          <input
            matInput
            formControlName="word"
            required
            spellcheck="true"
            [attr.lang]="settings.activeSourceLanguage()"
            [attr.inputmode]="'text'">
          @if (speech.supported()) {
            <button
              mat-icon-button
              matSuffix
              type="button"
              [attr.aria-label]="speech.isListening('add-word-source') ? 'Stop voice input for source word' : 'Start voice input for source word'"
              [title]="speech.isListening('add-word-source') ? 'Stop voice input' : 'Voice input'"
              (click)="toggleSpeech('add-word-source', form.controls.word, settings.activeSourceLanguage())">
              <mat-icon>{{ speech.isListening('add-word-source') ? 'graphic_eq' : 'mic' }}</mat-icon>
            </button>
          }
          @if (form.controls.word.hasError('required')) {
            <mat-error>This field cannot be empty</mat-error>
          }
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>
            {{ settings.getLanguageFlag(settings.activeTargetLanguage()) }}
            {{ settings.getLanguageLabel(settings.activeTargetLanguage()) }} translation
          </mat-label>
          <input
            matInput
            formControlName="translation"
            required
            spellcheck="true"
            [attr.lang]="settings.activeTargetLanguage()"
            [attr.inputmode]="'text'">
          @if (speech.supported()) {
            <button
              mat-icon-button
              matSuffix
              type="button"
              [attr.aria-label]="speech.isListening('add-word-target') ? 'Stop voice input for translation' : 'Start voice input for translation'"
              [title]="speech.isListening('add-word-target') ? 'Stop voice input' : 'Voice input'"
              (click)="toggleSpeech('add-word-target', form.controls.translation, settings.activeTargetLanguage())">
              <mat-icon>{{ speech.isListening('add-word-target') ? 'graphic_eq' : 'mic' }}</mat-icon>
            </button>
          }
          @if (form.controls.translation.hasError('required')) {
            <mat-error>This field cannot be empty</mat-error>
          }
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>Notes</mat-label>
          <textarea
            matInput
            rows="4"
            formControlName="notes"
            spellcheck="true"
            [attr.lang]="settings.activeSourceLanguage()"></textarea>
          @if (speech.supported()) {
            <button
              mat-icon-button
              matSuffix
              type="button"
              [attr.aria-label]="speech.isListening('add-word-notes') ? 'Stop voice input for notes' : 'Start voice input for notes'"
              [title]="speech.isListening('add-word-notes') ? 'Stop voice input' : 'Voice input'"
              (click)="toggleSpeech('add-word-notes', form.controls.notes, settings.activeSourceLanguage(), '\n')">
              <mat-icon>{{ speech.isListening('add-word-notes') ? 'graphic_eq' : 'mic' }}</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>Tags</mat-label>
          <mat-chip-grid #tagGrid aria-label="Selected tags">
            @for (tag of selectedTags(); track tag) {
              <mat-chip-row (removed)="removeTag(tag)">
                {{ tag }}
                <button matChipRemove type="button" aria-label="Remove tag">
                  <mat-icon>cancel</mat-icon>
                </button>
              </mat-chip-row>
            }
          </mat-chip-grid>
          <input
            matInput
            [formControl]="tagInput"
            [attr.lang]="settings.activeSourceLanguage()"
            [matChipInputFor]="tagGrid"
            [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
            [matAutocomplete]="tagAutocomplete"
            (matChipInputTokenEnd)="addTagFromInput($event)">
          @if (speech.supported()) {
            <button
              mat-icon-button
              matSuffix
              type="button"
              [attr.aria-label]="speech.isListening('add-word-tags') ? 'Stop voice input for tags' : 'Start voice input for tags'"
              [title]="speech.isListening('add-word-tags') ? 'Stop voice input' : 'Voice input'"
              (click)="toggleSpeech('add-word-tags', tagInput, settings.activeSourceLanguage(), ', ')">
              <mat-icon>{{ speech.isListening('add-word-tags') ? 'graphic_eq' : 'mic' }}</mat-icon>
            </button>
          }
          <mat-autocomplete
            #tagAutocomplete="matAutocomplete"
            (optionSelected)="addSuggestedTag($event)">
            @for (tag of filteredSavedTags(); track tag) {
              <mat-option [value]="tag">{{ tag }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
      </div>
      <div mat-dialog-actions align="center">
        <button mat-button type="button" (click)="addWord()">Add</button>
        <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      </div>
    </form>
  `,
  styles: ``
})
export class AddModalComponent implements OnDestroy {
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly dialogRef = inject(MatDialogRef);
  readonly db = inject(DbService);
  readonly settings = inject(LanguageSettingsService);
  readonly speech = inject(SpeechInputService);
  readonly form = new FormGroup({
    word: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    translation: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    notes: new FormControl('', { nonNullable: true })
  });
  readonly tagInput = new FormControl('', { nonNullable: true });
  readonly selectedTags = signal<string[]>([]);
  readonly savedTags = signal<string[]>([]);

  constructor() {
    void this.loadSavedTags();
  }

  ngOnDestroy(): void {
    if ((this.speech.activeField() ?? '').startsWith('add-word-')) {
      this.speech.stop();
    }
  }

  filteredSavedTags(): string[] {
    const query = normalizeTag(this.tagInput.value);
    return this.savedTags().filter((tag) =>
      !this.selectedTags().includes(tag) &&
      (query === '' || tag.includes(query))
    );
  }

  addTagFromInput(event: MatChipInputEvent): void {
    const nextTag = normalizeTag(event.value ?? '');
    this.addTag(nextTag);
    this.tagInput.setValue('');
    event.chipInput?.clear();
  }

  addSuggestedTag(event: MatAutocompleteSelectedEvent): void {
    this.addTag(normalizeTag(event.option.value));
    this.tagInput.setValue('');
  }

  removeTag(tag: string): void {
    this.selectedTags.update((currentTags) => currentTags.filter((currentTag) => currentTag !== tag));
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

  async addWord() {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
    });

    if (this.form.invalid) {
      return;
    }

    const activePair = this.settings.activePair();
    const nextTags = this.selectedTags();

    await this.db.words.add({
      sourceLanguage: activePair.sourceLanguage,
      targetLanguage: activePair.targetLanguage,
      word: this.form.controls.word.value.trim(),
      translation: this.form.controls.translation.value.trim(),
      notes: this.form.controls.notes.value.trim(),
      tags: nextTags,
      streak: 0,
      reverseStreak: 0,
      wrongAnswers: 0,
      lastAnswered: new Date(),
      created: new Date()
    } as Word);

    this.savedTags.set(await this.db.mergeSavedTags(nextTags));
    this.settings.notifyWordDataChanged();
    this.dialogRef.close();
  }

  private async loadSavedTags(): Promise<void> {
    this.savedTags.set(await this.db.getSavedTags());
  }

  private addTag(tag: string): void {
    if (!tag || this.selectedTags().includes(tag)) {
      return;
    }

    this.selectedTags.update((currentTags) => [...currentTags, tag].sort((leftTag, rightTag) =>
      leftTag.localeCompare(rightTag)
    ));
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
