import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExecucaoUmCliqueDirective } from './shared/directives/execucao-um-clique.directive';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ExecucaoUmCliqueDirective],
  template: `<router-outlet appExecucaoUmClique></router-outlet>`,
  styleUrl: './app.scss'
})
export class App {}
