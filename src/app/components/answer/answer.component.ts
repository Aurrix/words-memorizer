import {Component, inject, OnInit, signal} from '@angular/core';
import {MatCardModule} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {AnswerModalComponent} from "./answer-modal.component";
import {Word} from "../../models/word";
import {DbService} from "../../db/db.service";

@Component({
  selector: 'app-answer',
  standalone: true,
  imports: [
    MatCardModule
  ],
  template: `
    <div class="w-full mt-[30vh]">
      @if (currentWord()) {
        <mat-card class="m-auto w-[200px] h-[200px] cursor-pointer" (click)="verifyAnswer()">
          <mat-card-content class="m-auto">
            {{ currentWord()?.word }}
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="m-auto">
          <p class="text-center">You have no words to learn</p>
          <p class="text-center">Add some words to your list</p>
        </div>
      }
    </div>
  `,
  styles: ``
})
export class AnswerComponent implements OnInit {
  dialog = inject(MatDialog);
  db = inject(DbService);
  currentWord = signal<Word | undefined>(undefined);

  ngOnInit(): void {
    this.showNextItem();
  }

  verifyAnswer() {
    this.dialog.open(AnswerModalComponent, {
      height: '350px',
      width: '400px',
      data: this.currentWord()?.translation
    }).afterClosed().subscribe(async result => {
      const word = this.currentWord();
      if (!word) return undefined;
      if (result) {
        word.streak++;
        word.lastAnswered = new Date();
        await this.db.words.put(word);
      } else {
        word.streak = 0;
        word.wrongAnswers++;
        word.lastAnswered = new Date();
        await this.db.words.put(word);
      }
      this.showNextItem();

    });
  }

  showNextItem() {
    this.db.words
      .filter(word => word.streak < 5)
      .toArray()
      .then(words => {
        this.currentWord.update(
          () =>
            words.sort(
              (a, b) => a.lastAnswered.getTime() - b.lastAnswered.getTime()
            )[0]
        );
      });
  }
}
