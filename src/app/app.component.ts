import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
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
        <app-add-word/>
      </mat-toolbar>
    </div>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles:[]
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
}
