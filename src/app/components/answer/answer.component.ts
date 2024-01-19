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
            {{ cardContent() }}
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
  cardContent = signal<string>('');
  isReverse = signal<boolean>(false);

  ngOnInit(): void {
    this.showNextItem();
  }

  verifyAnswer() {
    const word = this.currentWord();
    if (!word) return undefined;
    this.dialog.open(AnswerModalComponent, {
      height: '350px',
      width: '400px',
      data: this.isReverse() ? word.word : word.translation
    }).afterClosed().subscribe(async result => {
      if (result) {
        this.isReverse() ? word.reverseStreak++ : word.streak++;
        word.lastAnswered = new Date();
        await this.db.words.put(word);
      } else {
        word.streak = 0;
        word.reverseStreak = 0;
        word.wrongAnswers++;
        word.lastAnswered = new Date();
        await this.db.words.put(word);
      }
      this.showNextItem();

    });
  }

  showNextItem() {
    this.db.words
      .filter(word => word.streak < 3)
      .toArray()
      .then(words => {
        const word = words.sort(
          (a, b) => a.lastAnswered.getTime() - b.lastAnswered.getTime()
        )[0];
        this.currentWord.set(
          word
        );
        if (word.streak > word.reverseStreak) {
          this.isReverse.set(true);
        } else {
          this.isReverse.set(false);
        }
        this.cardContent.set(this.isReverse() ? word.translation : word.word);
      });
  }
}
