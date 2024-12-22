import { Routes } from '@angular/router';
import { ExploreComponent } from './pages/explore/explore.component';
import { ProjectComponent } from './pages/project/project.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
  },
  { path: 'explore', component: ExploreComponent },
  { path: 'project/:id', component: ProjectComponent },
  { path: '**', redirectTo: '' }
];
