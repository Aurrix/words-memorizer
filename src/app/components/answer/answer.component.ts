import { Component, effect, inject, signal } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { MatDialog } from "@angular/material/dialog";
import { DbService } from "../../db/db.service";
import { Word } from "../../models/word";
import { LanguageSettingsService } from "../../services/language-settings.service";
import { applyWordOutcome } from "../../words/word-utils";
import { AnswerModalComponent } from "./answer-modal.component";

@Component({
  selector: 'app-answer',
  imports: [
    MatCardModule
  ],
  template: `
    <div class="w-full mt-[30vh]">
      @if (currentWord()) {
        <mat-card class="m-auto h-[200px] w-[200px] cursor-pointer" (click)="verifyAnswer()">
          <mat-card-content class="m-auto text-center" [attr.lang]="cardLanguage()">
            {{ cardContent() }}
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="m-auto">
          <p class="text-center">You have no words to learn</p>
          <p class="text-center">
            Add some words for {{ settings.activePairLabel() }}
          </p>
        </div>
      }
    </div>
  `,
  styles: ``
})
export class AnswerComponent {
  readonly dialog = inject(MatDialog);
  readonly db = inject(DbService);
  readonly settings = inject(LanguageSettingsService);
  readonly currentWord = signal<Word | undefined>(undefined);
  readonly cardContent = signal('');
  readonly cardLanguage = signal('');
  readonly isReverse = signal(false);

  constructor() {
    effect(() => {
      if (!this.settings.isReady()) {
        return;
      }

      this.settings.wordDataVersion();
      void this.showNextItem(this.settings.activePair());
    });
  }

  verifyAnswer() {
    const word = this.currentWord();
    if (!word) {
      return;
    }

    this.dialog.open(AnswerModalComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        answer: this.isReverse() ? word.word : word.translation,
        answerLanguage: this.isReverse() ? word.sourceLanguage : word.targetLanguage,
        notes: word.notes
      }
    }).afterClosed().subscribe(async (result) => {
      await this.db.words.put(
        applyWordOutcome(word, result ? 'correct' : 'incorrect', this.isReverse() ? 'source' : 'target')
      );

      this.settings.notifyWordDataChanged();
      await this.showNextItem(this.settings.activePair());
    });
  }

  async showNextItem(pair = this.settings.activePair()) {
    const word = (await this.db.getWordsForPair(pair))
      .filter((currentWord) => currentWord.streak < 3 || currentWord.reverseStreak < 3)
      .sort((a, b) => a.lastAnswered.getTime() - b.lastAnswered.getTime())[0];

    if (!word) {
      this.currentWord.set(undefined);
      this.cardContent.set('');
      this.cardLanguage.set('');
      this.isReverse.set(false);
      return;
    }

    this.currentWord.set(word);
    this.isReverse.set(word.streak > word.reverseStreak);
    this.cardContent.set(this.isReverse() ? word.translation : word.word);
    this.cardLanguage.set(this.isReverse() ? word.targetLanguage : word.sourceLanguage);
  }
}
