import {ApplicationRef, Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {AddWordComponent} from "./components/add-word/add-word.component";
import {AnswerComponent} from "./components/answer/answer.component";
import {SwUpdate, VersionReadyEvent} from "@angular/service-worker";
import {concat, filter, first, interval} from "rxjs";

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
          color="primary" class="mx-3" (click)="toggleHistory()">
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
export class AppComponent implements OnInit {
  router = inject(Router);
  swu = inject(SwUpdate);
  appRef = inject(ApplicationRef);

  ngOnInit() {
    if (this.swu.isEnabled) {
      this.appRef.isStable
        .pipe(first(isStable => isStable))
        .subscribe(async () => {
          await this.swu.checkForUpdate();
        });
      this.swu.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(evt => {
          alert('New version available. Application will now reload.');
          document.location.reload();
        });
    }
  }

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
