import React, { useState, useMemo, useCallback } from 'react';
import type { Consolidado, TrackerSource, DashboardFilters, DashboardRow, AllStatus } from '../types';
import KpiCard from '../components/KpiCard';
import DataTable from '../components/DataTable';
import { useConsolidatedData } from '../hooks/useConsolidatedData';
import { TruckIcon, ExclamationTriangleIcon } from '../components/icons';
import { exportService } from '../services/exportService';
import type { ToastMessage } from '../App';

// FIX: The 'consolidado' property was incorrectly omitted from the props type.
// It is required for sending the correct data to the scheduling page.
type DashboardPageProps = ReturnType<typeof useConsolidatedData> & {
    addToast: (type: ToastMessage['type'], message: string) => void;
    onScheduleAlerts: (vehicles: Consolidado[]) => void;
};

const statusOptions: AllStatus[] = ['EXCEDEU 10.000', 'PRÓXIMO', 'OK', 'SEM DADOS', 'AGENDAR REVISÃO', 'AGENDADO', 'REVISÃO HOJE', 'EM OFICINA', 'CONCLUÍDO'];
const ALL_SOURCES: TrackerSource[] = ['3S', 'Ituran', 'SafeCar'];

const DashboardPage: React.FC<DashboardPageProps> = ({ frotaBase, dashboardData, isLoading, reprocessData, addToast, dashboardFilters, updateDashboardFilters, onScheduleAlerts, consolidado }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof DashboardRow | null; direction: 'asc' | 'desc' }>({ key: 'kmDesdeUltimaRevisao', direction: 'desc' });
  const [selectedPlacas, setSelectedPlacas] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    if (!dashboardFilters) return dashboardData;

    const { searchPlaca, searchModelo, statusFilter, enabledSources } = dashboardFilters;

    const activeStatuses = new Set(statusFilter);
    const activeSources = new Set(enabledSources);
    
    return dashboardData
      .filter(item => {
        const placaMatch = item.placa.toLowerCase().includes(searchPlaca.toLowerCase());
        const modeloMatch = item.modelo.toLowerCase().includes(searchModelo.toLowerCase());
        
        const statusMatch = statusFilter.length === 0 || activeStatuses.has(item.statusExibido);
        
        const sourceMatch = enabledSources.length === 0 
            ? !item.fonteUsada || item.fonteUsada === 'Painel'
            : (item.fonteUsada && activeSources.has(item.fonteUsada as TrackerSource)) || (item.fonteUsada === 'Painel') || !item.fonteUsada;

        return placaMatch && modeloMatch && statusMatch && sourceMatch;
      })
      .sort((a, b) => {
        if (!sortConfig.key) return 0;
        const key = sortConfig.key;
        
        let aValue = a[key];
        let bValue = b[key];

        if (aValue === null || aValue === undefined) aValue = -Infinity;
        if (bValue === null || bValue === undefined) bValue = -Infinity;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
      });
  }, [dashboardData, dashboardFilters, sortConfig]);

  const kpis = useMemo(() => {
    const total = frotaBase.length;
    const excedeu = dashboardData.filter(v => v.status === 'EXCEDEU 10.000').length;
    const agendar = dashboardData.filter(d => d.agendamento?.coluna === 'AGENDAR' || d.agendamento?.coluna === 'AGENDADO').length;
    const hoje = dashboardData.filter(d => d.agendamento?.coluna === 'HOJE').length;
    const oficina = dashboardData.filter(d => d.agendamento?.coluna === 'OFICINA').length;
    return { total, excedeu, agendar, hoje, oficina };
  }, [frotaBase, dashboardData]);

  const handleFilterChange = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    updateDashboardFilters({ [key]: value });
  };
  
  const handleMultiCheckboxChange = (key: 'statusFilter' | 'enabledSources', value: AllStatus | TrackerSource) => {
    if (!dashboardFilters) return;
    const currentValues = dashboardFilters[key] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    updateDashboardFilters({ [key]: newValues });
  };

  const requestSort = (key: keyof DashboardRow) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const handleReprocess = () => {
    reprocessData();
    addToast('success', 'Dados reprocessados com sucesso!');
  };

  const handleExportCSV = () => {
    exportService.exportToCSV(filteredData);
    addToast('success', 'Exportação CSV iniciada.');
  };

  const handleExportXLSX = () => {
    exportService.exportToXLSX(filteredData);
    addToast('success', 'Exportação XLSX iniciada.');
  };
  
  const handleSelectionChange = useCallback((placa: string) => {
      setSelectedPlacas(prev => {
          const newSet = new Set(prev);
          if (newSet.has(placa)) {
              newSet.delete(placa);
          } else {
              newSet.add(placa);
          }
          return newSet;
      });
  }, []);

  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
          setSelectedPlacas(new Set(filteredData.map(item => item.placa)));
      } else {
          setSelectedPlacas(new Set());
      }
  }, [filteredData]);

  const selectedVehicles = useMemo(() => {
      // Use the base consolidado list to ensure we have the full data for scheduling
      return consolidado.filter(v => selectedPlacas.has(v.placa));
  }, [consolidado, selectedPlacas]);

  const handleSendToScheduling = () => {
      if (selectedVehicles.length > 0) {
          onScheduleAlerts(selectedVehicles);
          setSelectedPlacas(new Set()); // Clear selection after sending
      }
  };
  
  if (!dashboardFilters) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total de Veículos" value={kpis.total} icon={<TruckIcon className="h-8 w-8 text-white"/>} colorClass="bg-blue-500" />
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-4">
                <div className="rounded-full p-3 bg-red-500">
                    <ExclamationTriangleIcon className="h-8 w-8 text-white"/>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Manutenção Excedida (por KM)</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white">{kpis.excedeu}</p>
                </div>
            </div>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {kpis.agendar} em agendamento · {kpis.hoje} para hoje · {kpis.oficina} em oficina
            </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar por Placa..."
            value={dashboardFilters.searchPlaca}
            onChange={e => handleFilterChange('searchPlaca', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Buscar por Modelo..."
            value={dashboardFilters.searchModelo}
            onChange={e => handleFilterChange('searchModelo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
           <div className="col-span-1 md:col-span-2 lg:col-span-2 flex items-center justify-end space-x-2">
            {selectedPlacas.size > 0 && (
                <button onClick={handleSendToScheduling} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700">
                    Enviar para Agendamento ({selectedPlacas.size})
                </button>
            )}
            <button onClick={handleReprocess} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Reprocessar</button>
            <button onClick={handleExportCSV} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Exportar CSV</button>
            <button onClick={handleExportXLSX} className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-md hover:bg-green-800">Exportar XLSX</button>
        </div>
        </div>
        
        <div className="space-y-3 pt-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Filtrar por Status:</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {statusOptions.map(status => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={dashboardFilters.statusFilter.includes(status)}
                            onChange={() => handleMultiCheckboxChange('statusFilter', status)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{status}</span>
                    </label>
                ))}
            </div>
          </div>

          <div>
             <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Filtrar por Fonte do Rastreador:</h4>
             <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {ALL_SOURCES.map(source => (
                  <label key={source} className="flex items-center space-x-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                    <input 
                      type="checkbox" 
                      checked={dashboardFilters.enabledSources.includes(source)} 
                      onChange={() => handleMultiCheckboxChange('enabledSources', source)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{source}</span>
                  </label>
                ))}
                <button 
                  onClick={() => handleFilterChange('enabledSources', ALL_SOURCES)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  title="Selecionar todas as fontes"
                >
                  Marcar Todos
                </button>
                 <button 
                  onClick={() => handleFilterChange('enabledSources', [])}
                  className="text-sm text-gray-500 hover:underline"
                  title="Limpar seleção de fontes"
                >
                  Limpar
                </button>
              </div>
              {dashboardFilters.enabledSources.length === 0 && (
                <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">Nenhuma fonte de rastreador selecionada. Apenas dados do painel serão exibidos.</p>
              )}
          </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            Exibindo <strong>{filteredData.length}</strong> de <strong>{dashboardData.length}</strong> veículos.
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Carregando dados...</div>
      ) : (
        <DataTable data={filteredData} sortConfig={sortConfig} requestSort={requestSort} selectedPlacas={selectedPlacas} onSelectionChange={handleSelectionChange} onSelectAll={handleSelectAll} />
      )}
    </div>
  );
};

export default DashboardPage;