import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from "@angular/common";
import { MatChipsModule } from "@angular/material/chips";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { DbService } from "../db/db.service";
import { Word } from "../models/word";
import { LanguageSettingsService } from "../services/language-settings.service";

@Component({
  selector: 'app-history',
  imports: [
    DatePipe,
    MatExpansionModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <div class="m-auto flex w-full flex-col">
      @if (Object.keys(history()).length === 0) {
        <p class="m-4 text-center">
          No answer history yet for {{ settings.activePairLabel() }}.
        </p>
      } @else {
        <mat-accordion class="m-3">
          @for (day of Object.keys(history()); track day) {
            <div class="mx-auto my-3 text-center">{{ day | date }}</div>
            @for (word of history()[day]; track word.id) {
              <mat-expansion-panel hideToggle>
                <mat-expansion-panel-header>
                  <mat-panel-title class="justify-center" [attr.lang]="word.sourceLanguage">
                    {{ word.word }}
                  </mat-panel-title>
                  <mat-panel-description class="justify-between" [attr.lang]="word.targetLanguage">
                    {{ word.translation }}
                    @if (word.streak > word.wrongAnswers) {
                      <mat-icon class="text-green-500">arrow_drop_up</mat-icon>
                    } @else if (word.streak < word.wrongAnswers) {
                      <mat-icon [color]="'warn'">arrow_drop_down</mat-icon>
                    } @else {
                      <mat-icon class="text-gray-400">unfold_less</mat-icon>
                    }
                  </mat-panel-description>
                </mat-expansion-panel-header>
                <mat-chip class="mt-3 w-full" [color]="'primary'" [highlighted]="true">
                  Correct: {{ word.streak }} <=> {{ word.reverseStreak }}
                </mat-chip>
                <mat-chip class="mt-3 w-full" [color]="'warn'" [highlighted]="true">
                  Wrong: {{ word.wrongAnswers }}
                </mat-chip>
                <mat-chip class="mt-3 w-full" [color]="'accent'" [highlighted]="true">
                  Last answered: {{ word.lastAnswered | date }}
                </mat-chip>
                @if (word.notes) {
                  <div class="mt-3 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm">
                    {{ word.notes }}
                  </div>
                }
              </mat-expansion-panel>
            }
          }
        </mat-accordion>
      }
    </div>
  `,
  styles: ``
})
export class HistoryComponent {
  readonly history = signal<{ [date: string]: Word[] }>({});
  readonly db = inject(DbService);
  readonly settings = inject(LanguageSettingsService);

  constructor() {
    effect(() => {
      if (!this.settings.isReady()) {
        return;
      }

      this.settings.wordDataVersion();
      void this.loadHistory(this.settings.activePair());
    });
  }

  async loadHistory(pair = this.settings.activePair()): Promise<void> {
    const words = (await this.db.getWordsForPair(pair)).sort(
      (a, b) => b.created.getTime() - a.created.getTime()
    );

    this.history.set(this.splitByDay(words));
  }

  splitByDay(words: Word[]): { [date: string]: Word[] } {
    return words.reduce((previousValue: { [date: string]: Word[] }, currentValue) => {
      previousValue[currentValue.lastAnswered.toDateString()] = (
        previousValue[currentValue.lastAnswered.toDateString()]?.concat(currentValue) ??
        [currentValue]
      ) as Word[];
      return previousValue;
    }, {});
  }

  protected readonly Object = Object;
}
