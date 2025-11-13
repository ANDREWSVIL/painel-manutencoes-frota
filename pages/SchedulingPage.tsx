import React, { useEffect, useMemo, useRef, useState } from "react";
import { Agendamento, ColunaKanban, Consolidado, DataSource, MaintenanceStatus, Prioridade } from "../types";

// ===== Utils =====
const nf = new Intl.NumberFormat("pt-BR");
const todayYMD = () => new Date().toISOString().slice(0, 10);
const isoNow = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ===== Persistence (localStorage) =====
const LS_KEY = "cider.agendamentos.v1";
const loadAll = (): Agendamento[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Agendamento[]) : [];
  } catch { return []; }
};
const saveAll = (items: Agendamento[]) => {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("agendamento:changed"));
};

// FIX: Define props with a type alias to resolve type error with the 'key' prop in .map()
type ChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

// Moved Chip component outside SchedulingPage to prevent re-creation on every render and fix prop-type error.
const Chip = ({ label, active, onClick }: ChipProps) => (
    <button onClick={onClick} className={`px-3 py-1 rounded-full border text-sm mr-2 mb-2 transition ${active ? "bg-indigo-600 text-white border-indigo-500" : "bg-transparent text-indigo-600 dark:text-gray-300 border-indigo-400 dark:border-gray-600 hover:bg-indigo-600/10 dark:hover:bg-gray-700"}`}>
      {label}
    </button>
);

const SchedulingPage = ({
  initialFromAlerts = [],
  onConsumeInitial,
}: {
  initialFromAlerts?: Consolidado[];
  onConsumeInitial?: () => void;
}) => {
  const [items, setItems] = useState<Agendamento[]>(loadAll());

  // Filters
  const [qPlaca, setQPlaca] = useState("");
  const [prioridade, setPrioridade] = useState<"ALL" | Prioridade>("ALL");
  const [statusPainel, setStatusPainel] = useState<
    "ALL" | MaintenanceStatus
  >("ALL");
  const [fontes, setFontes] = useState<{ [K in DataSource]?: boolean }>({
    "3S": true,
    Ituran: true,
    SafeCar: true,
    Painel: true,
  });
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Consume items from Home
  const didConsumeRef = useRef(false);
  useEffect(() => {
    if (didConsumeRef.current || !onConsumeInitial) return;
    if (!initialFromAlerts || initialFromAlerts.length === 0) return;

    const now = isoNow();
    const novos: Agendamento[] = [];
    const existing = loadAll();
    const existsActive = (placa: string) => existing.some(x => x.placa === placa && x.coluna !== "CONCLUIDO");

    for (const row of initialFromAlerts) {
      if (existsActive(row.placa)) continue; 
      novos.push({
        id: uid(),
        placa: row.placa,
        modelo: row.modelo,
        kmAtual: row.kmAtual ?? null,
        kmUltimaRevisao: row.kmUltimaRevisao ?? null,
        kmDesdeUltimaRevisao: row.kmDesdeUltimaRevisao ?? null,
        fonteUsada: row.fonteUsada,
        statusPainel: row.status,
        coluna: "AGENDAR",
        prioridade: row.status === "EXCEDEU 10.000" ? "ALTA" : row.status === "PRÓXIMO" ? "MEDIA" : "BAIXA",
        createdAt: now,
        updatedAt: now,
        history: [{ at: now, action: "CREATE_FROM_ALERT" }],
      });
    }

    if (novos.length) {
      const merged = [...existing, ...novos];
      setItems(merged);
      saveAll(merged);
    }
    didConsumeRef.current = true;
    onConsumeInitial();
  }, [initialFromAlerts, onConsumeInitial]);

  useEffect(() => { saveAll(items); }, [items]);

  useEffect(() => {
    const tick = () => {
      const ymd = todayYMD();
      let changed = false;
      // FIX: Add explicit return type to map callback to prevent TypeScript from widening 'coluna' to 'string'.
      const upd = items.map((it): Agendamento => {
        if (it.coluna === "AGENDADO" && it.dataAgendada === ymd) {
          changed = true;
          const now = isoNow();
          return { ...it, coluna: "HOJE", updatedAt: now, history: [...it.history, { at: now, action: "AUTO_MOVE:AGENDADO->HOJE" }] };
        }
        return it;
      });
      if (changed) setItems(upd);
    };
    const id = setInterval(tick, 60000);
    tick();
    return () => clearInterval(id);
  }, [items]);

  // Drag & Drop
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (e: React.DragEvent, coluna: ColunaKanban) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const now = isoNow();
      const from = it.coluna;
      let patch: Partial<Agendamento> = { coluna, updatedAt: now };
      if (coluna === "HOJE" && !it.dataAgendada) patch.dataAgendada = todayYMD();
      return { ...it, ...patch, history: [...it.history, { at: now, action: `MOVE:${from}->${coluna}` }] };
    }));
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  // Edit card
  const [editing, setEditing] = useState<Agendamento | null>(null);
  const submitEdit = () => {
    if (!editing) return;
    const now = isoNow();
    setItems(prev => prev.map(it => it.id === editing.id ? { ...editing, updatedAt: now, history: [...it.history, { at: now, action: "EDIT" }] } : it));
    setEditing(null);
  };

  const conclude = (id: string) => {
    const nowIso = isoNow();
    setItems(prev => prev.map(it => it.id === id ? {
      ...it,
      coluna: "CONCLUIDO",
      closedAt: it.closedAt ?? nowIso,
      updatedAt: nowIso,
      history: [...it.history, { at: nowIso, action: "CLOSE" }]
    } : it));
  };
  const moveToOficina = (id: string) => {
    const now = isoNow();
    setItems(prev => prev.map(it => it.id === id ? { ...it, coluna: "OFICINA", updatedAt: now, history: [...it.history, { at: now, action: "MOVE_TO_OFICINA" }] } : it));
  };
  const removeCard = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este agendamento?')) {
        setItems(prev => prev.filter(it => it.id !== id));
    }
  };

  const filtered = useMemo(() => {
    const activeSources = Object.entries(fontes).filter(([,v])=>v).map(([k])=>k);
    return items.filter(it => {
      if (qPlaca && !it.placa.toLowerCase().includes(qPlaca.toLowerCase())) return false;
      if (prioridade !== "ALL" && it.prioridade !== prioridade) return false;
      if (statusPainel !== "ALL" && it.statusPainel !== statusPainel) return false;
      if (!activeSources.includes(it.fonteUsada ?? "Painel")) return false;
      if (dateFrom && (it.dataAgendada ?? "") < dateFrom) return false;
      if (dateTo && (it.dataAgendada ?? "9999-12-31") > dateTo) return false;
      return true;
    });
  }, [items, qPlaca, prioridade, statusPainel, fontes, dateFrom, dateTo]);

  const byCol = (col: ColunaKanban) => filtered.filter(i => i.coluna === col);

  const exportCSV = () => {
    const rows = [
      ["placa","modelo","kmAtual","kmUltimaRevisao","kmDesdeUltimaRevisao","statusPainel","fonteUsada","coluna","dataAgendada","horaAgendada","previsaoConclusaoData","previsaoConclusaoHora","oficina","prioridade","createdAt","updatedAt","closedAt"],
      ...filtered.map(x => [x.placa,x.modelo,x.kmAtual ?? "",x.kmUltimaRevisao ?? "",x.kmDesdeUltimaRevisao ?? "",x.statusPainel,x.fonteUsada ?? "",x.coluna,x.dataAgendada ?? "",x.horaAgendada ?? "", x.previsaoConclusaoData ?? "", x.previsaoConclusaoHora ?? "", x.oficina ?? "",x.prioridade ?? "",x.createdAt,x.updatedAt, x.closedAt ?? ""])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Agendamentos_${new Date().toISOString().replace(/[:T\-]/g, '').slice(0,14)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Column = ({ title, col }: { title: string; col: ColunaKanban }) => {
    const list = byCol(col);
    return (
      <div className="flex-shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 px-2 mb-4">
        <div className="bg-gray-200 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-300 dark:border-slate-700 h-full flex flex-col"
             onDrop={e => onDrop(e, col)} onDragOver={onDragOver}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-slate-200">{title} <span className="text-gray-500 dark:text-slate-400">({list.length})</span></h3>
          </div>
          <div className="space-y-3 flex-grow overflow-y-auto">
            {list.map(card => (
              <div key={card.id} draggable onDragStart={e => onDragStart(e, card.id)}
                   className="rounded-lg bg-white dark:bg-slate-900/70 border border-gray-300 dark:border-slate-700 p-3 cursor-grab active:cursor-grabbing">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-800 dark:text-slate-100">{card.placa}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{card.fonteUsada ?? "—"}</div>
                </div>
                <div className="text-gray-600 dark:text-slate-300 text-sm">{card.modelo}</div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Δ KM:</span> <b className="text-gray-900 dark:text-slate-100">{card.kmDesdeUltimaRevisao == null ? "—" : nf.format(card.kmDesdeUltimaRevisao)}</b>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 items-center text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${ card.statusPainel === "EXCEDEU 10.000" ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border border-red-400/40" : card.statusPainel === "PRÓXIMO" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-400/40" : card.statusPainel === "OK" ? "bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-200 border border-emerald-400/40" : "bg-gray-200 text-gray-800 dark:bg-slate-600/30 dark:text-slate-200 border border-slate-500/40"}`}>{card.statusPainel}</span>
                  {card.prioridade && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200 border border-indigo-400/40">{card.prioridade}</span>}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  {card.dataAgendada ? <>Agendado para <b className="text-gray-700 dark:text-slate-200">{new Date(card.dataAgendada + 'T00:00:00').toLocaleDateString('pt-BR')}</b>{card.horaAgendada ? ` ${card.horaAgendada}` : ""}</> : <i>Sem data</i>}
                  {card.oficina && <> · Oficina: <b className="text-gray-700 dark:text-slate-200">{card.oficina}</b></>}
                  {(card.previsaoConclusaoData || card.previsaoConclusaoHora) && (
                    <> · Prev.: <b className="text-gray-700 dark:text-slate-200">{card.previsaoConclusaoData ? new Date(card.previsaoConclusaoData + 'T00:00:00').toLocaleDateString('pt-BR') : ""}</b>{card.previsaoConclusaoHora ? ` ${card.previsaoConclusaoHora}` : ""}</>
                  )}
                  {card.closedAt && card.coluna === 'CONCLUIDO' && (
                    <> · Fechado: <b className="text-gray-700 dark:text-slate-200">{new Date(card.closedAt).toLocaleString('pt-BR')}</b></>
                  )}
                </div>
                <div className="mt-3 flex gap-2 text-xs">
                  <button className="px-2 py-1 rounded bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600" onClick={() => setEditing(card)}>Editar</button>
                  <button className="px-2 py-1 rounded bg-amber-500/80 text-white dark:bg-amber-700/70 hover:bg-amber-600 dark:hover:bg-amber-700" onClick={() => moveToOficina(card.id)}>Oficina</button>
                  <button className="px-2 py-1 rounded bg-green-500/80 text-white dark:bg-emerald-700/70 hover:bg-green-600 dark:hover:bg-emerald-700" onClick={() => conclude(card.id)}>Concluir</button>
                  <button className="px-2 py-1 rounded bg-red-600/80 text-white dark:bg-rose-800/70 hover:bg-red-700 dark:hover:bg-rose-800 ml-auto" onClick={() => removeCard(card.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-0 md:p-2">
      <h2 className="text-xl font-semibold mb-4">Agendamento – Kanban</h2>

      <div className="bg-white dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-lg p-4 mb-4">
        <div className="grid md:grid-cols-4 gap-3">
          <input placeholder="Buscar por Placa" value={qPlaca} onChange={e => setQPlaca(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700 outline-none" />
          <select value={prioridade} onChange={e => setPrioridade(e.target.value as any)} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700">
            <option value="ALL">Prioridade (todas)</option>
            <option value="ALTA">ALTA</option>
            <option value="MEDIA">MEDIA</option>
            <option value="BAIXA">BAIXA</option>
          </select>
          <select value={statusPainel} onChange={e => setStatusPainel(e.target.value as any)} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700">
            <option value="ALL">Status Painel (todos)</option>
            <option value="EXCEDEU 10.000">EXCEDEU 10.000</option>
            <option value="PRÓXIMO">PRÓXIMO</option>
            <option value="OK">OK</option>
            <option value="SEM DADOS">SEM DADOS</option>
          </select>
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700"/>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700"/>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center">
          <span className="mr-3 text-gray-700 dark:text-slate-300 text-sm">Fontes:</span>
          {(['3S', 'Ituran', 'SafeCar', 'Painel'] as DataSource[]).map(f => (
            <Chip key={f} label={f} active={!!fontes[f]} onClick={() => setFontes(prev => ({ ...prev, [f]: !prev[f] }))} />
          ))}
          <div className="ml-auto">
            <button className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500" onClick={exportCSV}>Exportar CSV (filtrado)</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap -mx-2">
        <Column title="Agendar Revisão" col="AGENDAR" />
        <Column title="Agendado" col="AGENDADO" />
        <Column title="Revisões para hoje" col="HOJE" />
        <Column title="Em oficina" col="OFICINA" />
        <Column title="Concluído" col="CONCLUIDO" />
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-4 w-full max-w-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">Editar Agendamento – {editing.placa}</h3>
              <button onClick={() => setEditing(null)} className="px-2 py-1 rounded bg-gray-200 dark:bg-slate-700">Fechar</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Data agendada</label>
                <input type="date" value={editing.dataAgendada ?? ""} onChange={e => setEditing({ ...editing, dataAgendada: e.target.value })} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Hora agendada</label>
                <input type="time" value={editing.horaAgendada ?? ""} onChange={e => setEditing({ ...editing, horaAgendada: e.target.value })} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Previsão de Conclusão (Data)</label>
                <input type="date" value={editing.previsaoConclusaoData ?? ""} onChange={e => setEditing({ ...editing, previsaoConclusaoData: e.target.value })} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Previsão de Conclusão (Hora)</label>
                <input type="time" value={editing.previsaoConclusaoHora ?? ""} onChange={e => setEditing({ ...editing, previsaoConclusaoHora: e.target.value })} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700" />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Oficina</label>
                <input value={editing.oficina ?? ""} onChange={e => setEditing({ ...editing, oficina: e.target.value })} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700" />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea value={editing.observacoes ?? ""} onChange={e => setEditing({ ...editing, observacoes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Prioridade</label>
                <select value={editing.prioridade ?? "MEDIA"} onChange={e => setEditing({ ...editing, prioridade: e.target.value as Prioridade })} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700">
                  <option value="ALTA">ALTA</option>
                  <option value="MEDIA">MEDIA</option>
                  <option value="BAIXA">BAIXA</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-slate-300 mb-1">Coluna</label>
                <select value={editing.coluna} onChange={e => setEditing({ ...editing, coluna: e.target.value as ColunaKanban })} className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-700">
                  <option value="AGENDAR">Agendar Revisão</option>
                  <option value="AGENDADO">Agendado</option>
                  <option value="HOJE">Revisões para hoje</option>
                  <option value="OFICINA">Em oficina</option>
                  <option value="CONCLUIDO">Concluído</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 rounded-md bg-gray-200 dark:bg-slate-700" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500" onClick={submitEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulingPage;