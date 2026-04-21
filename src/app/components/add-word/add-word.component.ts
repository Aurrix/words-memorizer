import { Component, inject } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { AddModalComponent } from "./add-modal.component";
import { LanguageSettingsService } from "../../services/language-settings.service";
import { buildAddWordDialogConfig } from "./word-dialog";

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
    this.dialog.open(AddModalComponent, buildAddWordDialogConfig());
  }
}
