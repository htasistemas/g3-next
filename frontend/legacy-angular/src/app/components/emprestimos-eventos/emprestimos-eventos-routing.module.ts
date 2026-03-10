import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmprestimosEventosPageComponent } from './emprestimos-eventos-page.component';

const routes: Routes = [
  { path: '', component: EmprestimosEventosPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EmprestimosEventosRoutingModule {}

