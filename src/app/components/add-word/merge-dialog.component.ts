import { Component, inject } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from "@angular/material/dialog";
import {
  WordMergeDraft,
  WordMergePreview,
  WORD_MERGE_SCORE_WEIGHT
} from "../../words/word-utils";

interface MergeDialogData {
  draft: WordMergeDraft;
  preview: WordMergePreview;
}

@Component({
  selector: 'app-merge-dialog',
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions
  ],
  template: `
    <h1 mat-dialog-title class="m-auto text-center">Merge matching words</h1>
    <div mat-dialog-content class="flex flex-col gap-4 p-3">
      <p class="m-0 text-sm text-slate-600">
        Matching removes spaces, lowercases both values, and checks the source word and translation separately.
        {{ preview.matches.length }} existing {{ preview.matches.length === 1 ? 'record matches' : 'records match' }} this add request.
      </p>

      <section class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Incoming</div>
        <div class="mt-2 text-sm font-semibold text-slate-900" [attr.lang]="draft.sourceLanguage">
          {{ draft.word }}
        </div>
        <div class="mt-1 text-sm text-slate-700" [attr.lang]="draft.targetLanguage">
          {{ draft.translation }}
        </div>
      </section>

      <div class="flex flex-col gap-3">
        @for (match of preview.matches; track match.word.id) {
          <section class="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Existing</div>
              <div class="flex flex-wrap gap-1">
                @for (field of match.matchedFields; track field) {
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {{ field === 'word' ? 'Word match' : 'Translation match' }}
                  </span>
                }
              </div>
            </div>

            <div class="mt-2 text-sm font-semibold text-slate-900" [attr.lang]="match.word.sourceLanguage">
              {{ match.word.word }}
            </div>
            <div class="mt-1 text-sm text-slate-700" [attr.lang]="match.word.targetLanguage">
              {{ match.word.translation }}
            </div>

            @if (match.word.tags.length > 0) {
              <div class="mt-2 flex flex-wrap gap-1">
                @for (tag of match.word.tags; track tag) {
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    #{{ tag }}
                  </span>
                }
              </div>
            }
          </section>
        }
      </div>

      <section class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Merged result</div>
        <div class="mt-2 text-sm font-semibold text-slate-900" [attr.lang]="preview.mergedWord.sourceLanguage">
          {{ preview.mergedWord.word }}
        </div>
        <div class="mt-1 text-sm text-slate-700" [attr.lang]="preview.mergedWord.targetLanguage">
          {{ preview.mergedWord.translation }}
        </div>

        @if (preview.mergedWord.tags.length > 0) {
          <div class="mt-2 flex flex-wrap gap-1">
            @for (tag of preview.mergedWord.tags; track tag) {
              <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                #{{ tag }}
              </span>
            }
          </div>
        }

        @if (preview.mergedWord.notes) {
          <div class="mt-3 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-xs text-slate-700" [attr.lang]="preview.mergedWord.sourceLanguage">
            {{ preview.mergedWord.notes }}
          </div>
        }

        <div class="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          Duplicate-match score will increase by
          {{ preview.matches.length * mergeScoreWeight }}
          ({{ preview.matches.length }} match{{ preview.matches.length === 1 ? '' : 'es' }} x {{ mergeScoreWeight }}).
        </div>
      </section>
    </div>
    <div mat-dialog-actions align="center">
      <button mat-button type="button" (click)="dialogRef.close(true)">Merge</button>
      <button mat-button type="button" (click)="dialogRef.close(false)">Cancel</button>
    </div>
  `,
  styles: ``
})
export class MergeDialogComponent {
  readonly dialogRef = inject(MatDialogRef<MergeDialogComponent, boolean>);
  readonly dialogData = inject(MAT_DIALOG_DATA) as MergeDialogData;
  readonly draft = this.dialogData.draft;
  readonly preview = this.dialogData.preview;
  readonly mergeScoreWeight = WORD_MERGE_SCORE_WEIGHT;
}
