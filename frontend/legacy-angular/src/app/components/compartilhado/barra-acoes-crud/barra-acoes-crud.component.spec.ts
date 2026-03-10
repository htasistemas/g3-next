import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BarraAcoesCrudComponent } from './barra-acoes-crud.component';

describe('BarraAcoesCrudComponent', () => {
  let fixture: ComponentFixture<BarraAcoesCrudComponent>;
  let component: BarraAcoesCrudComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarraAcoesCrudComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BarraAcoesCrudComponent);
    component = fixture.componentInstance;
    component.acoes = { salvar: true, excluir: true, novo: true, cancelar: true };
    fixture.detectChanges();
  });

  function obterBotaoPorTexto(texto: string): HTMLButtonElement {
    const botoes = fixture.debugElement.queryAll(By.css('button.nav-button'));
    const encontrado = botoes.find((btn) =>
      btn.nativeElement.textContent?.includes(texto)
    );
    if (!encontrado) {
      throw new Error(`Botao nao encontrado: ${texto}`);
    }
    return encontrado.nativeElement as HTMLButtonElement;
  }

  it('dispara salvar com um clique', () => {
    let chamadas = 0;
    component.salvar.subscribe(() => {
      chamadas += 1;
    });
    obterBotaoPorTexto('Salvar').click();
    expect(chamadas).toBe(1);
  });

  it('dispara excluir com um clique', () => {
    let chamadas = 0;
    component.excluir.subscribe(() => {
      chamadas += 1;
    });
    obterBotaoPorTexto('Excluir').click();
    expect(chamadas).toBe(1);
  });

  it('dispara cancelar com um clique', () => {
    let chamadas = 0;
    component.cancelar.subscribe(() => {
      chamadas += 1;
    });
    obterBotaoPorTexto('Cancelar').click();
    expect(chamadas).toBe(1);
  });
});

