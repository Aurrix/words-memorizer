import {Component, inject, signal} from '@angular/core';
import {MatButtonModule} from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-answer-modal',
  standalone: true,
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
      <div mat-dialog-content class="flex p-3">
        Your answer: <strong>{{ dialogData }}</strong>
      </div>
      <div mat-dialog-actions align="center">
        <button mat-button (click)="finish()">Ok</button>
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
      <div mat-dialog-content class="flex p-3">
        Correct answer: <strong>{{ dialogData }}</strong>
      </div>
      <div mat-dialog-actions align="center">
        <button mat-button (click)="finish()">Ok</button>
      </div>
    }
    @if (state() === 'unanswered') {
      <form
        [formGroup]="form" class="flex flex-col justify-items-center">
        <h1 mat-dialog-title class="m-auto text-center">Answer</h1>
        <div mat-dialog-content class="flex p-3">
          <mat-form-field class="w-full">
            <mat-label>Whats is your answer?</mat-label>
            <input matInput formControlName="answer" required>
            @if (form.controls.answer.hasError('required')) {
              <mat-error>This field cannot be empty</mat-error>
            }
          </mat-form-field>
        </div>
        <div mat-dialog-actions align="center">
          <button mat-button (click)="submit()">Submit</button>
        </div>
      </form>
    }
  `,
  styles: ``
})
export class AnswerModalComponent {
  form = new FormGroup({
    answer: new FormControl('', Validators.required),
  });
  state = signal<'correct' | 'wrong' | 'unanswered'>('unanswered');
  dialogRef = inject(MatDialogRef);
  dialogData: string = inject(MAT_DIALOG_DATA);

  private result = false;

  submit() {
    if (this.form.value.answer?.toLowerCase().trim() === this.dialogData.toLowerCase().trim()) {
      this.result = true;
      this.state.update(() => 'correct');
    } else {
      this.result = false;
      this.state.update(() => 'wrong');
    }
  }

  finish() {
    this.dialogRef.close(this.result);
  }
}
