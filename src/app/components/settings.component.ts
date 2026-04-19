import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DbService } from '../db/db.service';
import { LanguageSettingsService } from '../services/language-settings.service';
import {
  DEFAULT_TARGET_LANGUAGE,
  getDefaultLanguagePair,
  LanguageOption,
  normalizeLanguageTag
} from '../settings/target-language';

@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  template: `
    <div class="p-4">
      <div class="mx-auto flex max-w-3xl flex-col gap-4">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Language pairs</mat-card-title>
            <mat-card-subtitle>
              Declare source -> target combinations and switch between them from the toolbar.
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="flex flex-col gap-4 pt-4">
            <form [formGroup]="pairForm" class="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-start">
              <mat-form-field class="w-full">
                <mat-label>Source</mat-label>
                <input
                  matInput
                  formControlName="sourceLanguage"
                  placeholder="de or de-AT"
                  spellcheck="false"
                  [matAutocomplete]="sourceLanguageAutocomplete"
                  (blur)="normalizeLanguageControl('sourceLanguage')">
                <mat-hint>Type a custom language tag if it is not listed.</mat-hint>
                <mat-autocomplete #sourceLanguageAutocomplete="matAutocomplete" autoActiveFirstOption>
                  @for (language of filterLanguages(pairForm.controls.sourceLanguage.value); track language.code) {
                    <mat-option [value]="language.code">
                      {{ language.flag }} {{ language.label }} ({{ language.code }})
                    </mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
              <div class="hidden pt-4 text-center text-xl sm:block">-></div>
              <mat-form-field class="w-full">
                <mat-label>Target</mat-label>
                <input
                  matInput
                  formControlName="targetLanguage"
                  placeholder="en or en-US"
                  spellcheck="false"
                  [matAutocomplete]="targetLanguageAutocomplete"
                  (blur)="normalizeLanguageControl('targetLanguage')">
                <mat-hint>Type a custom language tag if it is not listed.</mat-hint>
                <mat-autocomplete #targetLanguageAutocomplete="matAutocomplete" autoActiveFirstOption>
                  @for (language of filterLanguages(pairForm.controls.targetLanguage.value); track language.code) {
                    <mat-option [value]="language.code">
                      {{ language.flag }} {{ language.label }} ({{ language.code }})
                    </mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
              <button
                mat-flat-button
                color="primary"
                type="button"
                class="mt-1"
                [disabled]="!canAddPair()"
                (click)="addPair()">
                Add pair
              </button>
            </form>
            @if (pairValidationMessage()) {
              <p class="text-sm text-red-600">{{ pairValidationMessage() }}</p>
            }
            <mat-divider></mat-divider>
            <div class="flex flex-col gap-3">
              @for (pair of settings.declaredPairs(); track pair.key) {
                <div class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                  <div>
                    <div class="text-2xl">{{ settings.getPairFlags(pair) }}</div>
                    <div class="text-sm text-gray-700">
                      {{ settings.getPairLabel(pair) }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (pair.key === settings.activePair().key) {
                      <span class="text-sm font-medium text-blue-700">Selected</span>
                    } @else {
                      <button
                        mat-stroked-button
                        type="button"
                        (click)="activatePair(pair.key)">
                        Use
                      </button>
                    }
                    <button
                      mat-icon-button
                      type="button"
                      [disabled]="settings.declaredPairs().length === 1"
                      (click)="removePair(pair.key)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Selected pair actions</mat-card-title>
            <mat-card-subtitle>
              Manage all words for {{ settings.activePairLabel() }}.
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="pt-4">
            <div class="mb-4 text-2xl">{{ settings.activePairFlags() }}</div>
            <div class="flex flex-col gap-3 sm:flex-row">
              <button mat-stroked-button type="button" (click)="resetActivePairWords()">
                Reset all words
              </button>
              <button mat-flat-button color="warn" type="button" (click)="deleteActivePairWords()">
                Delete all words
              </button>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-flat-button color="primary" type="button" (click)="router.navigate(['/'])">
              Done
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: ``
})
export class SettingsComponent {
  readonly router = inject(Router);
  readonly db = inject(DbService);
  readonly settings = inject(LanguageSettingsService);
  readonly pairForm = new FormGroup({
    sourceLanguage: new FormControl(getDefaultLanguagePair(DEFAULT_TARGET_LANGUAGE).sourceLanguage, {
      nonNullable: true
    }),
    targetLanguage: new FormControl(DEFAULT_TARGET_LANGUAGE, {
      nonNullable: true
    })
  });

  filterLanguages(query: string): readonly LanguageOption[] {
    const normalizedQuery = query.trim().toLowerCase();
    return this.settings.availableLanguages.filter((language) =>
      normalizedQuery === '' ||
      language.code.toLowerCase().includes(normalizedQuery) ||
      language.label.toLowerCase().includes(normalizedQuery) ||
      language.nativeLabel.toLowerCase().includes(normalizedQuery)
    );
  }

  normalizeLanguageControl(controlName: 'sourceLanguage' | 'targetLanguage'): void {
    const control = this.pairForm.controls[controlName];
    const normalizedLanguage = normalizeLanguageTag(control.value);

    if (normalizedLanguage && normalizedLanguage !== control.value) {
      control.setValue(normalizedLanguage);
    }
  }

  canAddPair(): boolean {
    return this.pairValidationMessage() === '';
  }

  pairValidationMessage(): string {
    const sourceLanguage = normalizeLanguageTag(this.pairForm.controls.sourceLanguage.value);
    const targetLanguage = normalizeLanguageTag(this.pairForm.controls.targetLanguage.value);

    if (!sourceLanguage || !targetLanguage) {
      return 'Choose both languages.';
    }
    if (sourceLanguage === targetLanguage) {
      return 'Source and target languages must be different.';
    }
    if (this.settings.hasPair(sourceLanguage, targetLanguage)) {
      return 'This language pair already exists.';
    }

    return '';
  }

  async addPair(): Promise<void> {
    this.normalizeLanguageControl('sourceLanguage');
    this.normalizeLanguageControl('targetLanguage');

    if (!this.canAddPair()) {
      return;
    }

    await this.settings.addLanguagePair(
      this.pairForm.controls.sourceLanguage.value,
      this.pairForm.controls.targetLanguage.value
    );
  }

  activatePair(pairKey: string): void {
    void this.settings.setActivePair(pairKey);
  }

  removePair(pairKey: string): void {
    const result = confirm('Remove this language pair preset? Existing words will stay in the database.');
    if (result) {
      void this.settings.removeLanguagePair(pairKey);
    }
  }

  async resetActivePairWords(): Promise<void> {
    const result = confirm(`Reset all words for ${this.settings.activePairLabel()}?`);
    if (result) {
      await this.db.resetWordsForPair(this.settings.activePair());
      this.settings.notifyWordDataChanged();
    }
  }

  async deleteActivePairWords(): Promise<void> {
    const result = confirm(`Delete all words for ${this.settings.activePairLabel()}?`);
    if (result) {
      await this.db.deleteWordsForPair(this.settings.activePair());
      this.settings.notifyWordDataChanged();
    }
  }
}
