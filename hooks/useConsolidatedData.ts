import { useState, useEffect, useCallback } from 'react';
import type { FrotaBase, Rastreio, Consolidado, ImportLog, MaintenanceStatus, DataSource, TrackerSource, DashboardFilters, Agendamento, DashboardRow, AllStatus } from '../types';
import { storageService } from '../services/storageService';
import { parsePanelFile, parseTrackerFile } from '../services/xlsxService';

const CONSOLIDATION_THRESHOLD = 10000;
const PROXIMITY_THRESHOLD = 9000;
const ALL_SOURCES: TrackerSource[] = ['3S', 'Ituran', 'SafeCar'];
const SHOW_CONCLUIDO_FOR_HOURS = 24;

const DEFAULT_FILTERS: DashboardFilters = {
    searchPlaca: '',
    searchModelo: '',
    statusFilter: [],
    enabledSources: ALL_SOURCES,
};

// --- Scheduling Data Sync Logic ---
const AGENDAMENTOS_LS_KEY = "cider.agendamentos.v1";

const loadAgendamentos = (): Agendamento[] => {
  try {
    const raw = localStorage.getItem(AGENDAMENTOS_LS_KEY);
    return raw ? (JSON.parse(raw) as Agendamento[]) : [];
  } catch { return []; }
};

const indexByPlacaLatest = (items: Agendamento[]): Map<string, Agendamento> => {
  const idx = new Map<string, Agendamento>();
  for (const it of items) {
    const curr = idx.get(it.placa);
    if (!curr || new Date(it.updatedAt) > new Date(curr.updatedAt)) {
      idx.set(it.placa, it);
    }
  }
  return idx;
};

const computeStatusExibido = (row: Consolidado, ag?: Agendamento): AllStatus => {
  if (!ag) return row.status;

  const map: Record<Agendamento['coluna'], AllStatus> = {
    AGENDAR: "AGENDAR REVISÃO",
    AGENDADO: "AGENDADO",
    HOJE: "REVISÃO HOJE",
    OFICINA: "EM OFICINA",
    CONCLUIDO: "CONCLUÍDO",
  };

  if (ag.coluna === "CONCLUIDO" && SHOW_CONCLUIDO_FOR_HOURS >= 0) {
    const dt = new Date(ag.updatedAt).getTime();
    const ageH = (Date.now() - dt) / 36e5;
    if (ageH > SHOW_CONCLUIDO_FOR_HOURS) return row.status;
  }
  return map[ag.coluna] || row.status;
};

const enrichWithAgendamento = (rows: Consolidado[], agendamentosMap: Map<string, Agendamento>): DashboardRow[] => {
  return rows.map(r => {
    const ag = agendamentosMap.get(r.placa);
    return {
      ...r,
      agendamento: ag
        ? { coluna: ag.coluna, updatedAt: ag.updatedAt, dataAgendada: ag.dataAgendada, horaAgendada: ag.horaAgendada }
        : undefined,
      statusExibido: computeStatusExibido(r, ag),
    };
  });
};


const performConsolidation = (frota: FrotaBase[], rastreios: Rastreio[]): Consolidado[] => {
  if (!frota.length) return [];

  const rastreiosMap = new Map<string, Rastreio[]>();
  for (const rastreio of rastreios) {
    if (!rastreiosMap.has(rastreio.placa)) {
      rastreiosMap.set(rastreio.placa, []);
    }
    rastreiosMap.get(rastreio.placa)!.push(rastreio);
  }

  return frota.map(veiculo => {
    let kmAtual: number | null = veiculo.kmAtualPainel ?? null;
    let fonteUsada: DataSource | undefined = veiculo.kmAtualPainel ? 'Painel' : undefined;

    const candidates = rastreiosMap.get(veiculo.placa);
    if (candidates && candidates.length > 0) {
      const bestCandidate = candidates.reduce((prev, current) => 
        (prev.kmAtual === null || (current.kmAtual !== null && current.kmAtual > prev.kmAtual)) ? current : prev
      );
      
      if (bestCandidate.kmAtual !== null && (kmAtual === null || bestCandidate.kmAtual > kmAtual)) {
          kmAtual = bestCandidate.kmAtual;
          fonteUsada = bestCandidate.fonte;
      }
    }
    
    let kmDesdeUltimaRevisao: number | null = null;
    let status: MaintenanceStatus = 'SEM DADOS';

    if (kmAtual !== null && veiculo.kmUltimaRevisao !== null) {
      kmDesdeUltimaRevisao = kmAtual - veiculo.kmUltimaRevisao;
      if (kmDesdeUltimaRevisao >= CONSOLIDATION_THRESHOLD) {
        status = 'EXCEDEU 10.000';
      } else if (kmDesdeUltimaRevisao >= PROXIMITY_THRESHOLD) {
        status = 'PRÓXIMO';
      } else {
        status = 'OK';
      }
    }

    return {
      ...veiculo,
      kmAtual,
      kmDesdeUltimaRevisao,
      status,
      fonteUsada,
    };
  });
};


export const useConsolidatedData = () => {
  const [frotaBase, setFrotaBase] = useState<FrotaBase[]>([]);
  const [rastreios, setRastreios] = useState<Rastreio[]>([]);
  const [consolidado, setConsolidado] = useState<Consolidado[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardRow[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const [storedFrota, storedRastreios, storedLogs, storedFilters] = await Promise.all([
        storageService.get<FrotaBase[]>('fileData', 'frotaBase'),
        storageService.get<Rastreio[]>('fileData', 'rastreios'),
        storageService.get<ImportLog[]>('fileData', 'importLogs'),
        storageService.get<DashboardFilters>('fileData', 'dashboardFilters'),
      ]);

      const initialFrota = storedFrota || [];
      const initialRastreios = storedRastreios || [];
      const initialFilters = { ...DEFAULT_FILTERS, ...(storedFilters || {}) };

      setFrotaBase(initialFrota);
      setRastreios(initialRastreios);
      setLogs(storedLogs || []);
      setDashboardFilters(initialFilters);
      
      setIsLoading(false);
    };
    loadInitialData();
  }, []);
  
  // Step 1: Perform base consolidation when source data changes
  useEffect(() => {
    if (isLoading) return;
    const newConsolidado = performConsolidation(frotaBase, rastreios);
    setConsolidado(newConsolidado);
  }, [frotaBase, rastreios, isLoading]);
  
  // Step 2: Enrich with scheduling data and listen for updates
  useEffect(() => {
    const enrichAndSetData = () => {
        const agendamentos = loadAgendamentos();
        const agendamentosMap = indexByPlacaLatest(agendamentos);
        const enriched = enrichWithAgendamento(consolidado, agendamentosMap);
        setDashboardData(enriched);
    };

    enrichAndSetData(); // Initial enrichment

    const handleStorageChange = (event: StorageEvent | Event) => {
        const isOurEvent = (event as StorageEvent).key ? (event as StorageEvent).key === AGENDAMENTOS_LS_KEY : true;
        if (isOurEvent) {
            enrichAndSetData();
        }
    };

    window.addEventListener('agendamento:changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('agendamento:changed', handleStorageChange);
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [consolidado]); // This effect depends on the base consolidated data

  const updateDashboardFilters = useCallback(async (newFilters: Partial<DashboardFilters>) => {
    setDashboardFilters(prev => {
        const updated = { ...prev, ...newFilters };
        storageService.set('fileData', 'dashboardFilters', updated);
        return updated;
    });
  }, []);

  const reprocessData = useCallback(() => {
    // This will trigger the consolidation useEffect, which in turn triggers the enrichment useEffect
    const newConsolidado = performConsolidation(frotaBase, rastreios);
    setConsolidado(newConsolidado);
  }, [frotaBase, rastreios]);

  const addLog = useCallback(async (log: Omit<ImportLog, 'id' | 'timestamp'>) => {
    const newLog: ImportLog = { ...log, id: Date.now().toString(), timestamp: new Date().toISOString() };
    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs];
      storageService.set('fileData', 'importLogs', updatedLogs);
      return updatedLogs;
    });
  }, []);

  const addPanelFile = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const data = await parsePanelFile(file);
      setFrotaBase(data);
      await storageService.set('fileData', 'frotaBase', data);
      await addLog({ fonte: 'Painel', nomeArquivo: file.name, linhasLidas: data.length, status: 'success' });
      return { success: true, data };
    } catch (error) {
      await addLog({ fonte: 'Painel', nomeArquivo: file.name, linhasLidas: 0, status: 'error', errorMessage: (error as Error).message });
      return { success: false, error: (error as Error).message };
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  const addTrackerFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    const results = [];
    let newRastreios: Rastreio[] = [];
    
    for (const file of files) {
      try {
        const { source, data, logs: parsingLogs } = await parseTrackerFile(file);
        if (source === 'Desconhecida') {
          throw new Error('Fonte do arquivo não reconhecida.');
        }
        newRastreios.push(...data);
        await addLog({ fonte: source, nomeArquivo: file.name, linhasLidas: data.length, status: 'success', details: parsingLogs });
        results.push({ success: true, file: file.name, source, count: data.length, details: parsingLogs });
      } catch (error) {
        const errorMessage = (error as Error).message;
        await addLog({ fonte: 'Desconhecida', nomeArquivo: file.name, linhasLidas: 0, status: 'error', errorMessage });
        results.push({ success: false, file: file.name, error: errorMessage });
      }
    }
    
    setRastreios(currentRastreios => {
        const allRastreios = [...currentRastreios, ...newRastreios];
        const latestRastreiosMap = new Map<string, Rastreio>();
        for (const r of allRastreios) {
          const existing = latestRastreiosMap.get(r.placa);
          if (!existing || (r.kmAtual !== null && (existing.kmAtual === null || r.kmAtual > existing.kmAtual))) {
            latestRastreiosMap.set(r.placa, r);
          }
        }
        const updatedRastreios = Array.from(latestRastreiosMap.values());
        storageService.set('fileData', 'rastreios', updatedRastreios);
        return updatedRastreios;
    });
    
    setIsLoading(false);
    return results;
  }, [addLog]);

  return { frotaBase, rastreios, dashboardData, consolidado, logs, isLoading, addPanelFile, addTrackerFiles, reprocessData, dashboardFilters, updateDashboardFilters };
};