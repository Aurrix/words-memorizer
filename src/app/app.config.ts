import { ApplicationConfig, isDevMode } from '@angular/core';

import { provideServiceWorker } from '@angular/service-worker';
import { provideAnimations } from '@angular/platform-browser/animations';
import {DbService} from "./db/db.service";
import {provideRouter} from "@angular/router";
import {routes} from "./app.routing";

export const appConfig: ApplicationConfig = {
  providers: [
    provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000'
    }),
    provideRouter(routes),
    provideAnimations(),
    DbService
  ]
};
