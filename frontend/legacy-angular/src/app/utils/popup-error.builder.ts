export class PopupErrorBuilder {
  private readonly mensagens: string[] = [];

  adicionar(mensagem: string): this {
    if (mensagem) {
      this.mensagens.push(mensagem);
    }
    return this;
  }

  build(): string[] {
    return [...this.mensagens];
  }
}

