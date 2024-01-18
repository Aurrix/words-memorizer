import {Routes} from "@angular/router";
import {AppComponent} from "./app.component";
import {AnswerComponent} from "./components/answer/answer.component";
import {SearchAndOverviewComponent} from "./components/search-and-overview.component";

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AnswerComponent
  },
  {
    path: 'words',
    component: SearchAndOverviewComponent
  }
];
