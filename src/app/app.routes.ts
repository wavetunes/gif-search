import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'GIF Search',
    loadComponent: () =>
      import('./features/search/search-page.component').then((m) => m.SearchPageComponent),
  },
  {
    path: 'gif/:id',
    title: 'GIF details · GIF Search',
    loadComponent: () =>
      import('./features/gif-details/gif-details-page.component').then(
        (m) => m.GifDetailsPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
