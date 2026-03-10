import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, firstValueFrom } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { RuntimeConfigService } from '../../services/runtime-config.service';

declare global {
  interface Window {
    google?: any;
  }
}


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit, OnDestroy, OnInit {
  nomeUsuario = '';
  senha = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;
  versaoSistema = '';
  versaoSistemaErro = false;

  criarContaAberto = false;
  recuperarSenhaAberto = false;
  termoUsoAberto = false;
  politicaPrivacidadeAberto = false;
  cadastroSubmetido = false;
  recuperacaoSubmetida = false;
  redefinicaoSubmetida = false;
  recuperacaoEtapa: 'solicitar' | 'redefinir' = 'solicitar';
  googleErro: string | null = null;
  googleMensagem: string | null = null;
  googleCarregando = false;
  private googleInicializado = false;
  private googleTimeout?: ReturnType<typeof setTimeout>;

  cadastroNome = '';
  cadastroEmail = '';
  cadastroSenha = '';
  cadastroConfirmarSenha = '';
  cadastroErro: string | null = null;

  recuperacaoEmail = '';
  recuperacaoToken = '';
  recuperacaoSenha = '';
  recuperacaoConfirmarSenha = '';
  recuperacaoErro: string | null = null;
  recuperacaoMensagem: string | null = null;
  recuperando = false;
  redefinindo = false;
  private recuperacaoTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly auth: AuthService,
    private readonly configService: ConfigService,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarVersaoSistema();
  }

  ngAfterViewInit(): void {
    this.inicializarGoogle();
  }

  ngOnDestroy(): void {
    this.googleInicializado = false;
    if (this.googleTimeout) {
      clearTimeout(this.googleTimeout);
      this.googleTimeout = undefined;
    }
  }

  private carregarVersaoSistema(): void {
    this.versaoSistemaErro = false;
    firstValueFrom(this.configService.getVersaoSistema())
      .then((response) => {
        const versao = (response?.versao || '').trim();
        if (versao) {
          this.versaoSistema = versao;
          this.cdr.detectChanges();
          return;
        }
        return this.carregarVersaoArquivo();
      })
      .catch(() => this.carregarVersaoArquivo());
  }

  private carregarVersaoArquivo(): Promise<void> {
    return firstValueFrom(this.configService.getVersaoArquivo())
      .then((versao) => {
        const normalizado = (versao || '').trim();
        if (normalizado) {
          this.versaoSistema = normalizado;
          this.versaoSistemaErro = false;
          this.cdr.detectChanges();
          return;
        }
        return this.carregarVersaoLocal();
      })
      .catch(() => this.carregarVersaoLocal());
  }

  private carregarVersaoLocal(): Promise<void> {
    return firstValueFrom(this.configService.getVersaoLocal())
      .then((versao) => {
        this.versaoSistema = (versao || '').trim();
        this.versaoSistemaErro = !this.versaoSistema;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.versaoSistema = '';
        this.versaoSistemaErro = true;
        this.cdr.detectChanges();
      });
  }

  private inicializarGoogle(): void {
    if (this.googleInicializado) return;
    const clientId = this.runtimeConfig.googleClientId;
    if (!clientId) {
      setTimeout(() => {
        this.googleErro = 'Login Google indisponível no momento.';
        this.cdr.detectChanges();
      }, 0);
      return;
    }
    if (!this.googleTimeout) {
      this.googleTimeout = setTimeout(() => {
        if (!this.googleInicializado) {
          this.googleErro = 'Login Google indisponível no momento.';
          this.cdr.detectChanges();
        }
      }, 5000);
    }
    const aguardarGoogle = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(aguardarGoogle, 200);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          const token = response?.credential;
          if (!token) {
            this.googleErro = 'Falha ao autenticar com Google.';
            this.cdr.detectChanges();
            return;
          }
          this.googleCarregando = true;
          this.googleMensagem = 'Conectado. Redirecionando...';
          this.googleErro = null;
          this.auth
            .loginGoogle(token)
            .pipe(
              catchError((err) => {
                this.googleErro = this.mapError(err) || 'Falha ao autenticar com Google.';
                return EMPTY;
              }),
              finalize(() => {
                this.googleCarregando = false;
                this.cdr.detectChanges();
              })
            )
            .subscribe(() => {
              this.router.navigate(['/']);
            });
        }
      });

      const container = document.getElementById('google-signin-button');
      if (container) {
        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320
        });
      }
      window.google.accounts.id.prompt();
      this.googleInicializado = true;
    };
    aguardarGoogle();
  }

  forcarPromptGoogle(): void {
    if (!window.google?.accounts?.id) {
      this.googleErro = 'Login Google indisponível no momento.';
      return;
    }
    this.googleErro = null;
    window.google.accounts.id.prompt();
  }
  submit(): void {
    this.error = null;
    this.success = null;
    this.loading = true;

    try {
      this.auth
        .login(this.nomeUsuario, this.senha)
        .pipe(
          catchError((err) => {
            this.error = this.mapError(err);
            this.loading = false;
            this.cdr.detectChanges();
            return EMPTY;
          }),
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe(() => {
          this.router.navigate(['/']);
        });
    } catch (err) {
      this.error = this.mapError(err);
      this.loading = false;
    }
  }

  abrirCriarConta(): void {
    this.resetCadastro();
    this.criarContaAberto = true;
  }

  fecharCriarConta(): void {
    this.criarContaAberto = false;
  }

  abrirTermoUso(): void {
    this.termoUsoAberto = true;
  }

  fecharTermoUso(): void {
    this.termoUsoAberto = false;
  }

  abrirPoliticaPrivacidade(): void {
    this.politicaPrivacidadeAberto = true;
  }

  fecharPoliticaPrivacidade(): void {
    this.politicaPrivacidadeAberto = false;
  }

  abrirRecuperarSenha(): void {
    this.resetRecuperacao();
    this.recuperarSenhaAberto = true;
  }

  fecharRecuperarSenha(): void {
    this.recuperarSenhaAberto = false;
  }

  confirmarCadastro(): void {
    this.cadastroSubmetido = true;
    this.cadastroErro = null;
    this.success = null;

    if (!this.cadastroValido()) {
      return;
    }

    this.auth
      .registrarConta({
        nome: this.cadastroNome.trim(),
        email: this.cadastroEmail.trim(),
        senha: this.cadastroSenha
      })
      .pipe(
        catchError((err) => {
          this.cadastroErro = this.mapError(err);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.success = 'Conta criada com sucesso. Faca o login para continuar.';
        this.fecharCriarConta();
      });
  }

  solicitarRecuperacao(): void {
    if (this.recuperando) {
      return;
    }
    this.recuperando = true;
    this.recuperacaoSubmetida = true;
    this.recuperacaoErro = null;
    this.recuperacaoMensagem = null;
    if (this.recuperacaoTimeout) {
      clearTimeout(this.recuperacaoTimeout);
    }
    this.recuperacaoTimeout = setTimeout(() => {
      if (this.recuperando) {
        this.recuperando = false;
        this.recuperacaoErro =
          'O envio está demorando mais do que o esperado. Verifique sua conexão e tente novamente.';
        this.cdr.detectChanges();
      }
    }, 15000);

    if (!this.recuperacaoEmailValido()) {
      this.recuperando = false;
      return;
    }

    this.auth
      .solicitarRecuperacaoSenha(this.recuperacaoEmail.trim())
      .pipe(
        catchError((err) => {
          const status = err && typeof err === 'object' && 'status' in err ? (err as any).status : null;
          if (status === 404) {
            this.recuperacaoErro = 'Email nao esta registrado em nosso banco de dados.';
          } else if (status === 503) {
            this.recuperacaoErro =
              'Envio de email indisponivel no momento. Entre em contato com sua instituicao.';
          } else {
            this.recuperacaoErro = this.mapError(err);
          }
          return EMPTY;
        }),
        finalize(() => {
          this.recuperando = false;
          if (this.recuperacaoTimeout) {
            clearTimeout(this.recuperacaoTimeout);
            this.recuperacaoTimeout = undefined;
          }
          this.cdr.detectChanges();
        })
      )
      .subscribe(() => {
        this.recuperacaoMensagem = 'Token enviado para o email informado.';
        this.recuperacaoEtapa = 'redefinir';
        this.recuperarSenhaAberto = true;
        this.cdr.detectChanges();
      });
  }

  redefinirSenha(): void {
    if (this.redefinindo) {
      return;
    }
    this.redefinindo = true;
    this.redefinicaoSubmetida = true;
    this.recuperacaoErro = null;
    this.recuperacaoMensagem = null;

    if (!this.redefinicaoValida()) {
      this.redefinindo = false;
      return;
    }

    const token = this.normalizarToken(this.recuperacaoToken);

    this.auth
      .redefinirSenha({
        token,
        senha: this.recuperacaoSenha,
        confirmarSenha: this.recuperacaoConfirmarSenha
      })
      .pipe(
        catchError((err) => {
          this.recuperacaoErro = this.mapError(err);
          return EMPTY;
        }),
        finalize(() => {
          this.redefinindo = false;
        })
      )
      .subscribe(() => {
        this.success = 'Senha atualizada com sucesso. Faca o login para continuar.';
        this.fecharRecuperarSenha();
      });
  }

  private cadastroValido(): boolean {
    if (!this.cadastroNome.trim() || !this.cadastroEmail.trim() || !this.cadastroSenha) {
      return false;
    }

    if (!this.emailValido(this.cadastroEmail)) {
      return false;
    }

    if (this.cadastroSenha.length < 6) {
      return false;
    }

    if (this.cadastroSenha !== this.cadastroConfirmarSenha) {
      return false;
    }

    return true;
  }

  private recuperacaoEmailValido(): boolean {
    return !!this.recuperacaoEmail.trim() && this.emailValido(this.recuperacaoEmail);
  }

  private redefinicaoValida(): boolean {
    const token = this.normalizarToken(this.recuperacaoToken);

    if (!token || !this.recuperacaoSenha) {
      return false;
    }

    if (this.recuperacaoSenha.length < 6) {
      return false;
    }

    if (this.recuperacaoSenha !== this.recuperacaoConfirmarSenha) {
      return false;
    }

    return true;
  }

  emailValido(email: string): boolean {
    const sanitized = email.replace(/\s+/g, '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
  }

  private normalizarToken(token: string): string {
    return token.replace(/\\s+/g, '').trim();
  }

  private resetCadastro(): void {
    this.cadastroSubmetido = false;
    this.cadastroNome = '';
    this.cadastroEmail = '';
    this.cadastroSenha = '';
    this.cadastroConfirmarSenha = '';
    this.cadastroErro = null;
  }

  private resetRecuperacao(): void {
    this.recuperacaoSubmetida = false;
    this.redefinicaoSubmetida = false;
    this.recuperacaoEtapa = 'solicitar';
    this.recuperacaoEmail = '';
    this.recuperacaoToken = '';
    this.recuperacaoSenha = '';
    this.recuperacaoConfirmarSenha = '';
    this.recuperacaoErro = null;
    this.recuperacaoMensagem = null;
  }

  private mapError(err: unknown): string {
    if (err && typeof err === 'object' && 'name' in err && err['name'] === 'TimeoutError') {
      return 'O servidor nao respondeu. Verifique sua conexao ou tente novamente em instantes.';
    }

    const status =
      err instanceof HttpErrorResponse
        ? err.status
        : err && typeof err === 'object' && 'status' in err
          ? (err as any).status
          : null;
    if (status === 400 || status === 401 || status === 404) {
      return 'Seus dados nao foram encontrados tente novamente ou entre em contato com sua instituicao';
    }
    if (status === 422) {
      return 'Token invalido ou expirado. Solicite uma nova recuperacao.';
    }

    const fallback =
      err && typeof err === 'object' && 'error' in err && (err as any).error?.message
        ? (err as any).error.message
        : null;

    if (fallback) {
      return fallback;
    }

    if (err instanceof Error) {
      return err.message;
    }

    return 'Falha ao processar a solicitacao. Tente novamente.';
  }
}







