import { Component, inject } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { AddModalComponent } from "./add-modal.component";
import { LanguageSettingsService } from "../../services/language-settings.service";

@Component({
  selector: 'app-add-word',
  imports: [
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <button
      mat-icon-button
      color="primary"
      [disabled]="!settings.isReady()"
      (click)="openDialog()">
      <mat-icon>add</mat-icon>
    </button>
  `,
  styles: ``
})
export class AddWordComponent {
  readonly settings = inject(LanguageSettingsService);

  constructor(public dialog: MatDialog) {}

  openDialog(): void {
    const isSmallScreen = typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 640px)').matches;

    this.dialog.open(AddModalComponent, {
      disableClose: true,
      width: isSmallScreen ? '100vw' : '480px',
      height: isSmallScreen ? '100vh' : undefined,
      maxWidth: isSmallScreen ? '100vw' : '95vw',
      maxHeight: isSmallScreen ? '100vh' : '95vh',
      panelClass: isSmallScreen ? 'add-word-dialog-mobile' : undefined,
    });
  }
}
