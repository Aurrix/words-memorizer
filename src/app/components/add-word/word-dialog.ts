import { MatDialogConfig } from "@angular/material/dialog";
import { Word } from "../../models/word";

export interface AddModalData {
  word?: Word;
}

export function buildAddWordDialogConfig(
  data?: AddModalData
): MatDialogConfig<AddModalData> {
  const isSmallScreen = typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 640px)').matches;

  return {
    data,
    disableClose: true,
    width: isSmallScreen ? '100vw' : '480px',
    height: isSmallScreen ? '100vh' : undefined,
    maxWidth: isSmallScreen ? '100vw' : '95vw',
    maxHeight: isSmallScreen ? '100vh' : '95vh',
    panelClass: isSmallScreen ? 'add-word-dialog-mobile' : undefined
  };
}
