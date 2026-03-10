import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InformacoesAdministrativasComponent } from './informacoes-administrativas.component';

const routes: Routes = [
  { path: '', component: InformacoesAdministrativasComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InformacoesAdministrativasRoutingModule {}
