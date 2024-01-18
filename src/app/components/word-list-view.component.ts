import {Component, inject, OnInit, signal} from '@angular/core';
import {DbService} from "../db/db.service";
import {Word} from "../models/word";
import {MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {MatChipSelectionChange, MatChipsModule} from "@angular/material/chips";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-word-list-view',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="w-full m-auto flex flex-col">
      <mat-chip-listbox class="px-5 mat-mdc-chip-set-stacked" [multiple]="true">
        @for (word of words(); track word.id) {
          <mat-chip-option
            (selectionChange)="toggleSelection(word, $event)"
            (removed)="deleteWord(word)" [color]="getWordColor(word)">
            {{ word.word }}
            (Correct:{{ word.streak }} | Wrong:{{ word.wrongAnswers }})
            <button matChipRemove>
              <mat-icon>cancel</mat-icon>
            </button>
          </mat-chip-option>
        }
      </mat-chip-listbox>
      <mat-paginator #paginator
                     class="demo-paginator"
                     (page)="onPageChange($event)"
                     [length]=""
                     [pageSize]="pagination().pageSize"
                     [showFirstLastButtons]="true"
                     [pageSizeOptions]="[10, 20, 50, 100]"
                     [hidePageSize]="false"
                     [pageIndex]="pagination().pageIndex"
                     aria-label="Select page">
      </mat-paginator>
      <div class="flex mt-3">
        <button
          class="flex-grow flex-1 mx-3"
          mat-raised-button color="primary"
          (click)="deleteSelected()"
          [disabled]="selected().length===0">
          Delete selected
        </button>
        <button
          class="flex-grow flex-1 mx-3"
          mat-raised-button color="warn"
          (click)="reset()">
          Reset
        </button>
      </div>
    </div>
  `,
  styles: ``
})
export class WordListViewComponent implements OnInit {

  words = signal<Word[]>([]);
  pagination = signal<PageEvent>({
    length: 0,
    pageIndex: 0,
    pageSize: 10,
    previousPageIndex: 0
  });
  selected = signal<number[]>([]);
  db = inject(DbService);

  ngOnInit(): void {
    this.retrievePage();
  }

  retrievePage() {
    this.db.words
      .orderBy('id')
      .limit(this.pagination().pageSize)
      .offset(this.pagination().pageIndex * this.pagination().pageSize)
      .reverse()
      .toArray()
      .then(words => {
        this.words.update(() => words);
      });
  }

  deleteWord(word: Word) {
    this.db.words.delete(word.id).then(() => {
      this.words.update(words => words.filter(w => w.id !== word.id));
    })
  }

  onPageChange($event: PageEvent) {
    this.pagination.update(() => $event);
    this.retrievePage();
  }

  getWordColor(word: Word) {
    if ((word.streak === 0 && word.wrongAnswers === 0) || word.wrongAnswers === word.streak) return 'primary';
    if (word.streak > word.wrongAnswers) return 'accent';
    else return 'warn';
  }
  reset() {
    const result = confirm('Are you sure you want to delete all words?');
    if (result) this.db.words.clear();
  }

  toggleSelection(word: Word, $event: MatChipSelectionChange) {
    if ($event.selected) {
      this.selected.update(selected => [...selected, word.id]);
    } else {
      this.selected.update(selected => selected.filter(id => id !== word.id));
    }
  }

  deleteSelected() {
    const result = confirm('Are you sure you want to delete the selected words?');
    if (result) {
      this.db.words.bulkDelete(this.selected());
      this.words.update(words => words.filter(word => !this.selected().includes(word.id)));
      this.selected.update(() => []);
    }
  }
}
