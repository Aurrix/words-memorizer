import {Component, inject, OnInit} from '@angular/core';
import {WordListViewComponent} from "./word-list-view.component";
import {MatButtonModule} from "@angular/material/button";
import {MatPaginatorModule} from "@angular/material/paginator";
import {DbService} from '../db/db.service';

@Component({
  selector: 'app-search-and-overview',
  standalone: true,
  imports: [
    WordListViewComponent,
    MatButtonModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="flex flex-col">
      <h2 class="!mt-5 text-center">Saved Words</h2>
      <app-word-list-view/>
    </div>

  `,
  styles: ``
})
export class SearchAndOverviewComponent implements OnInit {
  db = inject(DbService);

  ngOnInit(): void {
  }
}
