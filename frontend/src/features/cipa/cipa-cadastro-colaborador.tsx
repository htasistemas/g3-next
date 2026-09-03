import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useProfissionais } from "@/features/profissionais/use-profissionais";
import { useCriarColaboradorCipa } from "@/features/cipa/use-cipa";

type Props = { unidadeId: string };
type Formulario = { profissionalId: string; matricula: string; nomeCompleto: string; cpf: string; dataNascimento: string; dataAdmissao: string; cargo: string; setor: string; turno: string; email: string; telefone: string };
const vazio: Formulario = { profissionalId: "", matricula: "", nomeCompleto: "", cpf: "", dataNascimento: "", dataAdmissao: "", cargo: "", setor: "", turno: "", email: "", telefone: "" };
const dataParaInput = (value?: string) => value?.slice(0, 10) ?? "";

export function CipaCadastroColaborador({ unidadeId }: Props) {
  const [form, setForm] = useState<Formulario>(vazio);
  const [mensagem, setMensagem] = useState("");
  const criar = useCriarColaboradorCipa();
  const profissionais = useProfissionais({ status: "ATIVO" });
  const alterar = (campo: keyof Formulario, valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }));

  function selecionarProfissional(id: string) {
    const profissional = profissionais.data?.profissionais.find((item) => item.id_profissional === id);
    if (!profissional) { setForm((atual) => ({ ...atual, profissionalId: "" })); return; }
    setForm((atual) => ({ ...atual, profissionalId: id, nomeCompleto: profissional.nome_completo, cpf: profissional.cpf ?? "", dataNascimento: dataParaInput(profissional.data_nascimento), cargo: profissional.especialidade ?? profissional.categoria ?? atual.cargo, email: profissional.email ?? "", telefone: profissional.telefone ?? "" }));
  }

  async function salvar() {
    setMensagem("");
    try { await criar.mutateAsync({ ...form, unidadeId }); setForm(vazio); setMensagem("Colaborador cadastrado no RH com sucesso."); }
    catch { setMensagem("Não foi possível cadastrar o colaborador. Revise CPF, datas e matrícula."); }
  }

  return <Card><CardHeader><CardTitle>Cadastrar colaborador</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-[var(--g3-muted)]">Use um profissional existente para preencher os dados básicos ou cadastre um colaborador sem vínculo com o cadastro de profissionais.</p>
    <div><Label htmlFor="cipa-colab-profissional">Profissional existente (opcional)</Label><Select id="cipa-colab-profissional" value={form.profissionalId} onChange={(event) => selecionarProfissional(event.target.value)}><option value="">Cadastrar manualmente</option>{(profissionais.data?.profissionais ?? []).map((profissional) => <option key={profissional.id_profissional} value={profissional.id_profissional}>{profissional.nome_completo}{profissional.cpf ? ` · ${profissional.cpf}` : ""}</option>)}</Select>{profissionais.isLoading ? <p className="mt-1 text-xs text-[var(--g3-muted)]">Carregando profissionais ativos...</p> : null}{profissionais.isError ? <p className="mt-1 text-xs text-amber-700">Não foi possível carregar profissionais. Você ainda pode cadastrar manualmente.</p> : null}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor="cipa-colab-matricula">Matrícula</Label><Input id="cipa-colab-matricula" value={form.matricula} onChange={(event) => alterar("matricula", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-nome">Nome completo</Label><Input id="cipa-colab-nome" value={form.nomeCompleto} onChange={(event) => alterar("nomeCompleto", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-cpf">CPF</Label><Input id="cipa-colab-cpf" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(event) => alterar("cpf", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-nascimento">Data de nascimento</Label><Input id="cipa-colab-nascimento" type="date" value={form.dataNascimento} onChange={(event) => alterar("dataNascimento", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-admissao">Data de admissão</Label><Input id="cipa-colab-admissao" type="date" value={form.dataAdmissao} onChange={(event) => alterar("dataAdmissao", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-cargo">Cargo</Label><Input id="cipa-colab-cargo" value={form.cargo} onChange={(event) => alterar("cargo", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-setor">Setor</Label><Input id="cipa-colab-setor" value={form.setor} onChange={(event) => alterar("setor", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-turno">Turno</Label><Input id="cipa-colab-turno" value={form.turno} onChange={(event) => alterar("turno", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-email">E-mail</Label><Input id="cipa-colab-email" type="email" value={form.email} onChange={(event) => alterar("email", event.target.value)} /></div>
      <div><Label htmlFor="cipa-colab-telefone">Telefone</Label><Input id="cipa-colab-telefone" inputMode="tel" value={form.telefone} onChange={(event) => alterar("telefone", event.target.value)} /></div>
    </div>
    <Button onClick={() => void salvar()} disabled={criar.isPending || !unidadeId || !form.matricula.trim() || !form.nomeCompleto.trim()}>{criar.isPending ? "Salvando..." : "Cadastrar colaborador"}</Button>{mensagem ? <p role={criar.isError ? "alert" : "status"} className="text-sm text-[var(--g3-muted)]">{mensagem}</p> : null}
  </CardContent></Card>;
}
