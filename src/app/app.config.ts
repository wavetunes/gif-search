import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { environment } from '../environments/environment';
import { GIPHY_API_BASE_URL, GIPHY_API_KEY } from './core/tokens';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    { provide: GIPHY_API_KEY, useValue: environment.giphyApiKey },
    { provide: GIPHY_API_BASE_URL, useValue: environment.giphyApiBaseUrl },
  ],
};
