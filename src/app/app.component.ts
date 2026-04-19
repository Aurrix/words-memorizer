import { ApplicationRef, Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatToolbarModule } from "@angular/material/toolbar";
import { SwUpdate, VersionReadyEvent } from "@angular/service-worker";
import { filter, first } from "rxjs";
import { AddWordComponent } from "./components/add-word/add-word.component";
import { LanguageSettingsService } from "./services/language-settings.service";

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    AddWordComponent
  ],
  template: `
    <div class="flex flex-col">
      <mat-toolbar>
        <button mat-icon-button color="primary" (click)="toggleSettings()">
          @if (router.url === '/settings') {
            <mat-icon>arrow_back</mat-icon>
          } @else {
            <mat-icon>settings</mat-icon>
          }
        </button>
        <span class="ml-2 text-base sm:text-lg">Words memorizer</span>
        <span class="flex-grow flex-1"></span>
        <button
          mat-button
          class="min-w-0 px-2"
          [disabled]="!settings.isReady()"
          [matMenuTriggerFor]="pairMenu">
          <span class="text-lg">
            {{ settings.isReady() ? settings.activePairFlags() : '...' }}
          </span>
          <mat-icon>arrow_drop_down</mat-icon>
        </button>
        <mat-menu #pairMenu="matMenu">
          @for (pair of settings.declaredPairs(); track pair.key) {
            <button mat-menu-item (click)="selectPair(pair.key)">
              <span class="mr-3 text-lg">{{ settings.getPairFlags(pair) }}</span>
              <span>{{ settings.getPairLabel(pair) }}</span>
            </button>
          }
        </mat-menu>
        <app-add-word class="ml-1"/>
      </mat-toolbar>
    </div>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  readonly router = inject(Router);
  readonly swu = inject(SwUpdate);
  readonly appRef = inject(ApplicationRef);
  readonly settings = inject(LanguageSettingsService);

  ngOnInit() {
    if (this.swu.isEnabled) {
      this.appRef.isStable
        .pipe(first((isStable) => isStable))
        .subscribe(async () => {
          await this.swu.checkForUpdate();
        });
      this.swu.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          alert('New version available. Application will now reload.');
          document.location.reload();
        });
    }
  }

  toggleSettings() {
    if (this.router.url !== '/settings') {
      this.router.navigate(['/settings']);
    } else {
      this.router.navigate(['/']);
    }
  }

  selectPair(pairKey: string) {
    void this.settings.setActivePair(pairKey);
  }
}
