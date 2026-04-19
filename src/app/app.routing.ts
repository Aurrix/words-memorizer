import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import("./components/home.component").then((m) => m.HomeComponent)
  },
  {
    path: 'cards',
    loadComponent: () =>
      import("./components/answer/answer.component").then((m) => m.AnswerComponent)
  },
  {
    path: 'history',
    loadComponent: () =>
      import("./components/history.component").then((m) => m.HistoryComponent)
  },
  {
    path: 'settings',
    loadComponent: () =>
      import("./components/settings.component").then((m) => m.SettingsComponent)
  }
];
