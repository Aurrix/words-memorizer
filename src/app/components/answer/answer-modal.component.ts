import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";

interface AnswerDialogData {
  answer: string;
  answerLanguage: string;
  notes: string;
}

@Component({
  selector: 'app-answer-modal',
  imports: [
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIconModule
  ],
  template: `
    @if (state() === 'correct') {
      <div mat-dialog-title>
        <div class="flex items-center w-full">
          <mat-icon class="!w-[30px]" [color]="'accent'" inline>check_circle</mat-icon>
          <h1 class="!mb-0 text-center">
            Correct!
          </h1>
        </div>
      </div>
      <div mat-dialog-content class="flex flex-col gap-3 p-3">
        <div>
          Your answer: <strong [attr.lang]="dialogData.answerLanguage">{{ dialogData.answer }}</strong>
        </div>
        @if (dialogData.notes) {
          <div class="rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap">
            {{ dialogData.notes }}
          </div>
        }
      </div>
      <div mat-dialog-actions align="center">
        <button mat-button type="button" (click)="finish()">Ok</button>
      </div>
    }
    @if (state() === 'wrong') {
      <div mat-dialog-title>
        <div class="flex items-center w-full">
          <mat-icon class="!w-[30px]" [color]="'warn'" inline>warning</mat-icon>
          <h1 class="!mb-0 text-center">
            Incorrect!
          </h1>
        </div>
      </div>
      <div mat-dialog-content class="flex flex-col gap-3 p-3">
        <div>
          Correct answer:
          <strong [attr.lang]="dialogData.answerLanguage">{{ dialogData.answer }}</strong>
        </div>
        @if (dialogData.notes) {
          <div class="rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap">
            {{ dialogData.notes }}
          </div>
        }
      </div>
      <div mat-dialog-actions align="center">
        <button mat-button type="button" (click)="finish()">Ok</button>
      </div>
    }
    @if (state() === 'unanswered') {
      <form [formGroup]="form" class="flex flex-col justify-items-center">
        <h1 mat-dialog-title class="m-auto text-center">Answer</h1>
        <div mat-dialog-content class="flex p-3">
          <mat-form-field class="w-full">
            <mat-label>What is your answer?</mat-label>
            <input
              matInput
              formControlName="answer"
              required
              [attr.lang]="dialogData.answerLanguage">
            @if (form.controls.answer.hasError('required')) {
              <mat-error>This field cannot be empty</mat-error>
            }
          </mat-form-field>
        </div>
        <div mat-dialog-actions align="center">
          <button mat-button type="button" (click)="submit()">Submit</button>
        </div>
      </form>
    }
  `,
  styles: ``
})
export class AnswerModalComponent {
  readonly form = new FormGroup({
    answer: new FormControl('', Validators.required),
  });
  readonly state = signal<'correct' | 'wrong' | 'unanswered'>('unanswered');
  readonly dialogRef = inject(MatDialogRef);
  readonly dialogData = inject(MAT_DIALOG_DATA) as AnswerDialogData;

  private result = false;

  submit() {
    if (this.form.value.answer?.toLowerCase().trim() === this.dialogData.answer.toLowerCase().trim()) {
      this.result = true;
      this.state.set('correct');
    } else {
      this.result = false;
      this.state.set('wrong');
    }
  }

  finish() {
    this.dialogRef.close(this.result);
  }
}
