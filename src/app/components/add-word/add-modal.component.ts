import {Component, inject} from '@angular/core';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from "@angular/material/dialog";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {DbService} from "../../db/db.service";
import {Word} from "../../models/word";

@Component({
  selector: 'app-add-modal',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    ReactiveFormsModule
  ],
  template: `
    <form [formGroup]="form" class="flex flex-col justify-items-center">
      <h1 mat-dialog-title class="m-auto text-center">Add word</h1>
      <div mat-dialog-content class="flex p-3">
        <mat-form-field class="w-full">
          <mat-label>Word</mat-label>
          <input matInput formControlName="word" required>
          @if (form.controls.word.hasError('required')) {
            <mat-error>This field cannot be empty</mat-error>
          }
        </mat-form-field>
        <mat-form-field class="w-full">
          <mat-label>Translations</mat-label>
          <input matInput formControlName="translation" required>
          @if (form.controls.translation.hasError('required')) {
            <mat-error>This field cannot be empty</mat-error>
          }
        </mat-form-field>
      </div>
      <div mat-dialog-actions align="center">
        <button mat-button (click)="addWord()">Add</button>
        <button mat-button color="danger" (click)="dialogRef.close()">Cancel</button>
      </div>
    </form>
  `,
  styles: ``
})
export class AddModalComponent {
  dialogRef = inject(MatDialogRef);
  db = inject(DbService);
  form = new FormGroup({
    word: new FormControl('', Validators.required),
    translation: new FormControl('', Validators.required)
  });

  addWord(){
    console.log(this.form.value);
    Object.values(this.form.controls).forEach(control => {control.markAsDirty()});
    if (this.form.valid) {
      this.db.words.add({
        word: this.form.controls.word.value,
        translation: this.form.controls.translation.value,
        streak: 0,
        wrongAnswers: 0,
        lastAnswered: new Date()
      } as Word)
      this.dialogRef.close();
    }
  }
}
