import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PermissionPayload, PermissionService } from '../../services/permission.service';
import { UserPayload, UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  form: FormGroup;
  users: UserPayload[] = [];
  usersFiltrados: UserPayload[] = [];
  filtroUsuarios = '';
  permissoesDisponiveis: PermissionPayload[] = [];
  editingId: number | null = null;
  loading = false;
  feedback: { type: 'success' | 'error'; message: string } | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly auth: AuthService
  ) {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.minLength(4)]],
      permissoes: [[], [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadPermissoes();
  }

  get isAdmin(): boolean {
    const permissoes = this.auth.user()?.permissoes ?? [];
    return permissoes.includes('ADMINISTRADOR');
  }

  get usuarioAtualId(): number | null {
    const id = this.auth.user()?.id;
    return id ? Number(id) : null;
  }

  podeEditarUsuario(id?: number | null): boolean {
    if (this.isAdmin) return true;
    return !!id && !!this.usuarioAtualId && id === this.usuarioAtualId;
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.list().subscribe({
      next: (users) => {
        this.users = users;
        this.aplicarFiltro();
      },
      error: (error) => {
        console.error('Erro ao carregar usuários', error);
        this.feedback = { type: 'error', message: 'Não foi possível carregar os usuários.' };
      },
      complete: () => (this.loading = false)
    });
  }

  aplicarFiltro(): void {
    const termo = this.filtroUsuarios.trim().toLowerCase();
    if (!termo) {
      this.usersFiltrados = [...this.users];
      return;
    }
    this.usersFiltrados = this.users.filter((user) => {
      const nome = (user.nome ?? user.nomeUsuario ?? '').toLowerCase();
      const email = (user.email ?? user.nomeUsuario ?? '').toLowerCase();
      return nome.includes(termo) || email.includes(termo);
    });
  }

  buscarUsuarios(): void {
    this.aplicarFiltro();
  }

  limparBusca(): void {
    this.filtroUsuarios = '';
    this.aplicarFiltro();
  }

  novoUsuario(): void {
    if (!this.isAdmin) {
      this.feedback = { type: 'error', message: 'Permissão negada para criar usuários.' };
      return;
    }
    this.resetForm();
  }

  excluirUsuarioSelecionado(): void {
    if (!this.editingId) {
      return;
    }
    if (!this.isAdmin) {
      this.feedback = { type: 'error', message: 'Permissão negada para excluir usuários.' };
      return;
    }
    const user = this.users.find((item) => item.id === this.editingId);
    if (!user) {
      return;
    }
    this.delete(user);
  }

  private loadPermissoes(): void {
    this.permissionService.list().subscribe({
      next: (permissoes) => {
        this.permissoesDisponiveis = permissoes;
      },
      error: (error) => {
        console.error('Erro ao carregar permissões', error);
        this.feedback = { type: 'error', message: 'Não foi possível carregar as permissões.' };
      }
    });
  }

  submit(): void {
    this.feedback = null;
    if (!this.isAdmin && !this.editingId) {
      this.feedback = { type: 'error', message: 'Permissão negada para criar usuários.' };
      return;
    }
    if (this.editingId && !this.podeEditarUsuario(this.editingId)) {
      this.feedback = { type: 'error', message: 'Permissão negada para editar outro usuário.' };
      return;
    }
    if (
      this.form.invalid ||
      (!this.editingId && !this.form.get('senha')?.value) ||
      !this.getPermissoes().length
    ) {
      this.form.markAllAsTouched();
      return;
    }
    const usuarioId = this.usuarioAtualId;
    if (!usuarioId) {
      this.feedback = { type: 'error', message: 'Usuário atual não identificado.' };
      return;
    }

    const { nome, email, senha } = this.form.value as {
      nome: string;
      email: string;
      senha?: string;
    };
    const permissoes = this.getPermissoes();

    const request$ = this.editingId
      ? this.userService.update(
          this.editingId,
          {
            nome,
            email,
            ...(senha ? { senha } : {}),
            permissoes
          },
          usuarioId
        )
      : this.userService.create({ nome, email, senha: senha || '', permissoes }, usuarioId);

    request$.subscribe({
      next: () => {
        this.feedback = { type: 'success', message: 'Usuário salvo com sucesso.' };
        this.resetForm();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Erro ao salvar usuário', error);
        const message = error?.error?.message ?? 'Não foi possível salvar o usuário.';
        this.feedback = { type: 'error', message };
      }
    });
  }

  edit(user: UserPayload): void {
    if (!this.podeEditarUsuario(user.id)) {
      this.feedback = { type: 'error', message: 'Permissão negada para editar outro usuário.' };
      return;
    }
    this.editingId = user.id;
    this.form.reset({
      nome: user.nome ?? '',
      email: user.email ?? user.nomeUsuario,
      senha: '',
      permissoes: user.permissoes ?? []
    });
  }

  delete(user: UserPayload): void {
    if (!this.isAdmin) {
      this.feedback = { type: 'error', message: 'Permissão negada para excluir usuários.' };
      return;
    }
    const usuarioId = this.usuarioAtualId;
    if (!usuarioId) {
      this.feedback = { type: 'error', message: 'Usuário atual não identificado.' };
      return;
    }
    const confirmDelete = confirm(`Deseja realmente remover o usuário "${user.nomeUsuario}"?`);
    if (!confirmDelete) {
      return;
    }

    this.userService.delete(user.id, usuarioId).subscribe({
      next: () => {
        this.feedback = { type: 'success', message: 'Usuário removido com sucesso.' };
        this.loadUsers();
        if (this.editingId === user.id) {
          this.resetForm();
        }
      },
      error: (error) => {
        console.error('Erro ao remover usuário', error);
        this.feedback = { type: 'error', message: 'Não foi possível remover o usuário.' };
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ nome: '', email: '', senha: '', permissoes: [] });
  }

  togglePermissao(nome: string): void {
    if (!this.isAdmin) {
      return;
    }
    const permissoes = this.getPermissoes();
    if (permissoes.includes(nome)) {
      this.form.get('permissoes')?.setValue(permissoes.filter((item) => item !== nome));
      return;
    }
    this.form.get('permissoes')?.setValue([...permissoes, nome]);
  }

  isPermissaoSelecionada(nome: string): boolean {
    return this.getPermissoes().includes(nome);
  }

  private getPermissoes(): string[] {
    return this.form.get('permissoes')?.value ?? [];
  }
}




