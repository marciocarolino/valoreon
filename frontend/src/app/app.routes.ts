import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing').then(m => m.LandingComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then(m => m.RegisterComponent),
  },

  // ── Authenticated shell ──────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'impressoras',
        loadComponent: () =>
          import('./features/printers/pages/list/printers-list').then(m => m.PrintersListComponent),
      },
      {
        path: 'impressoras/manutencao',
        loadComponent: () =>
          import('./features/printers/pages/maintenance/maintenance').then(m => m.MaintenanceComponent),
      },
      {
        path: 'producao',
        loadComponent: () =>
          import('./features/production/pages/list/production-list').then(m => m.ProductionListComponent),
      },
      {
        path: 'how-it-works',
        loadComponent: () =>
          import('./features/help/pages/how-it-works/how-it-works').then(m => m.HowItWorksComponent),
      },
      {
        path: 'settings/profile',
        loadComponent: () =>
          import('./features/settings/profile/profile').then(m => m.ProfileComponent),
      },
      {
        path: 'impressoras/:id',
        loadComponent: () =>
          import('./features/printers/pages/detail/printer-detail').then(m => m.PrinterDetailComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
