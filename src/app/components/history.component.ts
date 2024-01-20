import {Component, inject, OnInit, signal} from '@angular/core';
import {MatDividerModule} from "@angular/material/divider";
import {DbService} from "../db/db.service";
import {Word} from "../models/word";
import {MatListModule} from "@angular/material/list";
import {MatInputModule} from "@angular/material/input";
import {DatePipe} from "@angular/common";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatChipsModule} from "@angular/material/chips";

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    MatDividerModule,
    MatListModule,
    MatInputModule,
    DatePipe,
    MatExpansionModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <div class="w-full m-auto flex flex-col">
      <mat-accordion class="m-3">
        @for (day of Object.keys(history()); track day) {
          <div class="my-3 text-center mx-auto">{{ day | date }}</div>
          @for (word of history()[day]; track word.id) {
            <mat-expansion-panel hideToggle>
              <mat-expansion-panel-header>
                <mat-panel-title class="justify-center">
                  {{ word.word }}
                </mat-panel-title>
                <mat-panel-description class="justify-between">
                  {{ word.translation }}
                  @if (word.streak > 3) {
                    <mat-icon [color]="'accent'">check</mat-icon>
                  } @else if (word.streak === word.wrongAnswers) {
                    <mat-icon [color]="'primary'">minimize</mat-icon>
                  } @else {
                    <mat-icon [color]="'warn'">arrow_drop_down</mat-icon>
                  }
                </mat-panel-description>
              </mat-expansion-panel-header>
              <mat-chip class="w-full">
                Correct: {{ word.streak }} <=> {{ word.reverseStreak }} | Wrong: {{ word.wrongAnswers }} | Last
                answered: {{ word.lastAnswered | date }}
              </mat-chip>
            </mat-expansion-panel>
          }
        }
      </mat-accordion>
    </div>
  `,
  styles: ``
})
export class HistoryComponent implements OnInit {
  history = signal<{ [date: string]: Word[] }>({});
  db = inject(DbService);


  ngOnInit(): void {
    this.db.words.orderBy('lastAnswered')
      .reverse()
      .toArray().then(words => {
      this.history.set(this.splitByDay(words));
      console.log(this.history());
    });
  }

  // Split array of words by day of last answer date
  splitByDay(words: Word[]): { [date: string]: Word[] } {
    return words.reduce((previousValue: { [date: string]: Word[] }, currentValue) => {
      console.log('previousValue', previousValue);
      console.log('current', currentValue);
        previousValue[currentValue.lastAnswered.toDateString()] = (
          previousValue[
            currentValue.lastAnswered.toDateString()
            ]?.concat(currentValue) || [currentValue]) as Word[];
        console.log('after previousValue', previousValue);
        return previousValue;
      }, {}
    );
  }

  protected readonly Object = Object;
}
