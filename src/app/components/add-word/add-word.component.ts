import { Component } from '@angular/core';
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatDialog} from "@angular/material/dialog";
import {AddModalComponent} from "./add-modal.component";

@Component({
  selector: 'app-add-word',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <button mat-raised-button color="primary" (click)="openDialog()"><mat-icon>add</mat-icon>Add</button>
  `,
  styles: ``
})
export class AddWordComponent {
  constructor(public dialog: MatDialog) {}

  openDialog(): void {
    const dialogRef = this.dialog.open(AddModalComponent, {
      height: '350px',
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(result => {
    });
  }
}
