import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ClipboardList, Plus, Printer, Save, Search, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  useDiarioBordo,
  useMotoristasAutorizados,
  useRemoverDiarioBordo,
  useRemoverMotoristaAutorizado,
  useRemoverVeiculo,
  useSalvarDiarioBordo,
  useSalvarMotoristaAutorizado,
  useSalvarVeiculo,
  useVeiculos
} from "@/features/controle-veiculos/use-controle-veiculos";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { MotoristaAutorizado, RegistroDiarioBordo, VeiculoCadastro } from "@/types/controle-veiculos";

type AbaId = "cadastro" | "diario" | "motoristas";

const abas: AdminTab[] = [
  { id: "cadastro", label: "Cadastro De Veículos", icon: Car },
  { id: "diario", label: "Mapa De Bordo", icon: ClipboardList },
  { id: "motoristas", label: "Motoristas Autorizados", icon: ShieldCheck }
];

const defaultVeiculo: VeiculoCadastro = { placa: "", modelo: "", marca: "", ativo: true };
const defaultDiario: RegistroDiarioBordo = { data: new Date().toISOString().slice(0, 10), veiculoId: null };
const defaultMotorista: MotoristaAutorizado = {
  veiculoId: 0,
  tipoOrigem: "PROFISSIONAL",
  motoristaId: 0
};

export function ControleVeiculosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("cadastro");
  const [veiculoForm, setVeiculoForm] = useState<VeiculoCadastro>(defaultVeiculo);
  const [diarioForm, setDiarioForm] = useState<RegistroDiarioBordo>(defaultDiario);
  const [motoristaForm, setMotoristaForm] = useState<MotoristaAutorizado>(defaultMotorista);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  const { data: veiculosData } = useVeiculos();
  const { data: diarioData } = useDiarioBordo();
  const { data: motoristasData } = useMotoristasAutorizados();
  const salvarVeiculoMutation = useSalvarVeiculo();
  const salvarDiarioMutation = useSalvarDiarioBordo();
  const salvarMotoristaMutation = useSalvarMotoristaAutorizado();
  const removerVeiculoMutation = useRemoverVeiculo();
  const removerDiarioMutation = useRemoverDiarioBordo();
  const removerMotoristaMutation = useRemoverMotoristaAutorizado();

  const veiculos = veiculosData ?? [];
  const diarios = diarioData ?? [];
  const motoristas = motoristasData ?? [];

  const carregandoAcoes =
    salvarVeiculoMutation.isPending ||
    salvarDiarioMutation.isPending ||
    salvarMotoristaMutation.isPending ||
    removerVeiculoMutation.isPending ||
    removerDiarioMutation.isPending ||
    removerMotoristaMutation.isPending;

  async function salvar() {
    try {
      if (abaAtiva === "cadastro") {
        if (!String(veiculoForm.placa ?? "").trim()) {
          setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe a placa do veículo." });
          return;
        }
        const response = await salvarVeiculoMutation.mutateAsync({
          ...veiculoForm,
          placa: String(veiculoForm.placa ?? "").trim().toUpperCase()
        });
        setVeiculoForm(response);
      } else if (abaAtiva === "diario") {
        if (!diarioForm.veiculoId || !diarioForm.data) {
          setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe veículo e data." });
          return;
        }
        const response = await salvarDiarioMutation.mutateAsync(diarioForm);
        setDiarioForm(response);
      } else {
        if (!motoristaForm.veiculoId || !motoristaForm.motoristaId) {
          setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe veículo e motorista." });
          return;
        }
        const response = await salvarMotoristaMutation.mutateAsync(motoristaForm);
        setMotoristaForm(response);
      }
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro salvo com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar." });
    }
  }

  function novo() {
    if (abaAtiva === "cadastro") setVeiculoForm(defaultVeiculo);
    if (abaAtiva === "diario") setDiarioForm(defaultDiario);
    if (abaAtiva === "motoristas") setMotoristaForm(defaultMotorista);
  }

  function cancelar() {
    novo();
  }

  function excluir() {
    const possuiId =
      (abaAtiva === "cadastro" && !!veiculoForm.id) ||
      (abaAtiva === "diario" && !!diarioForm.id) ||
      (abaAtiva === "motoristas" && !!motoristaForm.id);
    if (!possuiId) {
      setPopupMensagem({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um registro para excluir." });
      return;
    }
    setConfirmarExcluir(true);
  }

  async function confirmarExclusao() {
    try {
      if (abaAtiva === "cadastro" && veiculoForm.id) {
        await removerVeiculoMutation.mutateAsync(veiculoForm.id);
        setVeiculoForm(defaultVeiculo);
      }
      if (abaAtiva === "diario" && diarioForm.id) {
        await removerDiarioMutation.mutateAsync(diarioForm.id);
        setDiarioForm(defaultDiario);
      }
      if (abaAtiva === "motoristas" && motoristaForm.id) {
        await removerMotoristaMutation.mutateAsync(motoristaForm.id);
        setMotoristaForm(defaultMotorista);
      }
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro excluído com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir." });
    } finally {
      setConfirmarExcluir(false);
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de veículos" });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => undefined, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
      >
        {abaAtiva === "cadastro" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Placa *</Label><Input value={veiculoForm.placa ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, placa: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Modelo</Label><Input value={veiculoForm.modelo ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, modelo: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Marca</Label><Input value={veiculoForm.marca ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, marca: event.target.value }))} /></div>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!veiculoForm.ativo} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, ativo: event.target.checked }))} />Veículo ativo</label>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={veiculoForm.observacoes ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Placa</th><th className="px-3 py-2 text-left">Modelo</th><th className="px-3 py-2 text-left">Marca</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                <tbody>{veiculos.map((item, index) => (<tr key={item.id ?? `${item.placa}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => setVeiculoForm(item)}><td className="px-3 py-2">{item.placa ?? "---"}</td><td className="px-3 py-2">{item.modelo ?? "---"}</td><td className="px-3 py-2">{item.marca ?? "---"}</td><td className="px-3 py-2">{item.ativo ? "Ativo" : "Inativo"}</td></tr>))}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "diario" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Veículo *</Label><Select value={String(diarioForm.veiculoId ?? "")} onChange={(event) => setDiarioForm((atual) => ({ ...atual, veiculoId: Number(event.target.value) || null }))}><option value="">Selecione</option>{veiculos.map((item) => (<option key={item.id} value={item.id}>{item.placa} - {item.modelo}</option>))}</Select></div>
              <div className="space-y-1"><Label>Data *</Label><Input type="date" value={diarioForm.data ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, data: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Condutor</Label><Input value={diarioForm.condutor ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, condutor: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Destino</Label><Input value={diarioForm.destino ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, destino: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Veículo</th><th className="px-3 py-2 text-left">Condutor</th><th className="px-3 py-2 text-left">Destino</th></tr></thead>
                <tbody>{diarios.map((item, index) => (<tr key={item.id ?? `${item.data}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => setDiarioForm(item)}><td className="px-3 py-2">{item.data ?? "---"}</td><td className="px-3 py-2">{veiculos.find((veiculo) => veiculo.id === item.veiculoId)?.placa ?? "---"}</td><td className="px-3 py-2">{item.condutor ?? "---"}</td><td className="px-3 py-2">{item.destino ?? "---"}</td></tr>))}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "motoristas" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Veículo *</Label><Select value={String(motoristaForm.veiculoId || "")} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, veiculoId: Number(event.target.value) || 0 }))}><option value="">Selecione</option>{veiculos.map((item) => (<option key={item.id} value={item.id}>{item.placa} - {item.modelo}</option>))}</Select></div>
              <div className="space-y-1"><Label>Tipo De Origem</Label><Select value={motoristaForm.tipoOrigem} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, tipoOrigem: event.target.value as "PROFISSIONAL" | "VOLUNTARIO" }))}><option value="PROFISSIONAL">Profissional</option><option value="VOLUNTARIO">Voluntário</option></Select></div>
              <div className="space-y-1"><Label>Id Do Motorista *</Label><Input type="number" value={motoristaForm.motoristaId || ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, motoristaId: Number(event.target.value) || 0 }))} /></div>
              <div className="space-y-1"><Label>Número Da Carteira</Label><Input value={motoristaForm.numeroCarteira ?? ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, numeroCarteira: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Veículo</th><th className="px-3 py-2 text-left">Motorista</th><th className="px-3 py-2 text-left">Origem</th></tr></thead>
                <tbody>{motoristas.map((item, index) => (<tr key={item.id ?? `${item.veiculoId}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => setMotoristaForm(item)}><td className="px-3 py-2">{item.placaVeiculo ?? item.veiculoId}</td><td className="px-3 py-2">{item.nomeMotorista ?? item.motoristaId}</td><td className="px-3 py-2">{item.tipoOrigem}</td></tr>))}</tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar Exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={carregandoAcoes}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
