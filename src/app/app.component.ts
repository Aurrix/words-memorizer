import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterOutlet} from '@angular/router';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {AddWordComponent} from "./components/add-word/add-word.component";
import {AnswerComponent} from "./components/answer/answer.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatToolbarModule, MatIconModule, MatButtonModule, MatCardModule, AddWordComponent, AnswerComponent],
  template: `
    <div class="flex flex-col">
      <mat-toolbar>
        <button mat-icon-button (click)="toggleSidenav()">
          <mat-icon>menu</mat-icon>
        </button>
        <span>Words memorizer</span>
        <span class="flex-grow flex-1"></span>
        <app-add-word class="ml-3"/>
        <button
          mat-raised-button
          color="primary" class="ml-3" (click)="toggleHistory()">
          @if (router.url === '/history') {
            <mat-icon>arrow_back</mat-icon>
          } @else {
            <mat-icon>view_list</mat-icon>
          }
        </button>
      </mat-toolbar>
    </div>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: []
})
export class AppComponent {
  router = inject(Router);

  toggleSidenav() {
    if (this.router.url !== '/words') {
      this.router.navigate(['/words'])
    } else {
      this.router.navigate(['/'])
    }
  }

  toggleHistory() {
    if (this.router.url !== '/history') {
      this.router.navigate(['/history'])
    } else {
      this.router.navigate(['/'])
    }
  }
}
