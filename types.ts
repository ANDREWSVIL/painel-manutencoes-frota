export type TrackerSource = '3S' | 'Ituran' | 'SafeCar';
export type DataSource = TrackerSource | 'Painel';

export type MaintenanceStatus = 'EXCEDEU 10.000' | 'PRÓXIMO' | 'OK' | 'SEM DADOS';

export interface Rastreio {
  fonte: TrackerSource;
  placa: string;
  kmAtual: number | null;
  timestampArquivo: string;
}

export interface FrotaBase {
  placa: string;
  modelo: string;
  kmUltimaRevisao: number;
  dataUltimaRevisao: string;
  kmAtualPainel?: number;
}

export interface Consolidado extends FrotaBase {
  kmAtual: number | null;
  kmDesdeUltimaRevisao: number | null;
  status: MaintenanceStatus;
  fonteUsada?: DataSource;
}

export interface ImportLog {
  id: string;
  fonte: DataSource | 'Desconhecida';
  nomeArquivo: string;
  timestamp: string;
  linhasLidas: number;
  status: 'success' | 'error';
  errorMessage?: string;
  details?: string[];
}

export interface DashboardFilters {
  searchPlaca: string;
  searchModelo: string;
  statusFilter: AllStatus[];
  enabledSources: TrackerSource[];
}

// --- Scheduling Types (aligned with new component) ---
export type ColunaKanban = 'AGENDAR' | 'AGENDADO' | 'HOJE' | 'OFICINA' | 'CONCLUIDO';
export enum KanbanColumnId {
    AGENDAR = 'AGENDAR',
    AGENDADO = 'AGENDADO',
    HOJE = 'HOJE',
    OFICINA = 'OFICINA',
    CONCLUIDO = 'CONCLUIDO',
}
export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA';
export enum SchedulingPriority {
    ALTA = 'ALTA',
    MEDIA = 'MEDIA',
    BAIXA = 'BAIXA',
}

export type AgendamentoHistoryEvent = {
    at: string;
    action: string;
    meta?: Record<string, any>;
};

export interface Agendamento {
    id: string;
    placa: string;
    modelo: string;
    kmAtual: number | null;
    kmUltimaRevisao: number | null;
    kmDesdeUltimaRevisao: number | null;
    fonteUsada?: DataSource;
    statusPainel: MaintenanceStatus;
    
    coluna: ColunaKanban;
    dataAgendada?: string; // yyyy-MM-dd
    horaAgendada?: string; // HH:mm
    previsaoConclusaoData?: string; // yyyy-MM-dd
    previsaoConclusaoHora?: string; // HH:mm
    oficina?: string;
    observacoes?: string;
    prioridade?: Prioridade;
    closedAt?: string; // ISO datetime

    createdAt: string;
    updatedAt: string;
    history: AgendamentoHistoryEvent[];
}

// --- Enriched Dashboard Types ---
export type AgendamentoStatus = 'AGENDAR REVISÃO' | 'AGENDADO' | 'REVISÃO HOJE' | 'EM OFICINA' | 'CONCLUÍDO';
export type AllStatus = MaintenanceStatus | AgendamentoStatus;

export interface DashboardRow extends Consolidado {
    agendamento?: {
        coluna: ColunaKanban;
        updatedAt: string;
        dataAgendada?: string;
        horaAgendada?: string;
    };
    statusExibido: AllStatus;
}