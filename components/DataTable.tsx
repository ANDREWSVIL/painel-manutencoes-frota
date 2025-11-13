import React from 'react';
import type { DashboardRow } from '../types';
import { formatNumber, getStatusColor, getSortIcon, getSourceColor } from '../utils/helpers';

interface DataTableProps {
  data: DashboardRow[];
  sortConfig: { key: keyof DashboardRow | null; direction: 'asc' | 'desc' };
  requestSort: (key: keyof DashboardRow) => void;
  selectedPlacas: Set<string>;
  onSelectionChange: (placa: string) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, sortConfig, requestSort, selectedPlacas, onSelectionChange, onSelectAll }) => {
    
  const headers: { key: keyof DashboardRow; label: string }[] = [
    { key: 'placa', label: 'Placa' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'kmUltimaRevisao', label: 'Km Última Revisão' },
    { key: 'dataUltimaRevisao', label: 'Data Última Revisão' },
    { key: 'kmAtual', label: 'Km Atual' },
    { key: 'kmDesdeUltimaRevisao', label: 'Km Rodado' },
    { key: 'fonteUsada', label: 'Fonte do KM'},
    { key: 'statusExibido', label: 'Status' },
  ];
  
  const isAllSelected = data.length > 0 && selectedPlacas.size === data.length;
  const isIndeterminate = selectedPlacas.size > 0 && selectedPlacas.size < data.length;

  if (!data.length) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="text-xl font-medium">Nenhum veículo encontrado</h3>
        <p className="text-gray-500 mt-2">Ajuste os filtros ou anexe os arquivos de dados necessários.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3">
              <input 
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isAllSelected}
                ref={input => {
                    if (input) input.indeterminate = isIndeterminate;
                }}
                onChange={onSelectAll}
               />
            </th>
            {headers.map((header) => (
              <th
                key={header.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort(header.key)}
              >
                <span className="flex items-center">
                    {header.label}
                    <span className="ml-2">{getSortIcon(header.key, sortConfig.key, sortConfig.direction)}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item) => (
            <tr key={item.placa} className={`transition-colors duration-150 ${selectedPlacas.has(item.placa) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
              <td className="px-6 py-4 whitespace-nowrap">
                 <input 
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedPlacas.has(item.placa)}
                    onChange={() => onSelectionChange(item.placa)}
                 />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.placa}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.modelo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatNumber(item.kmUltimaRevisao)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.dataUltimaRevisao}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatNumber(item.kmAtual)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold dark:text-white">{formatNumber(item.kmDesdeUltimaRevisao)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {item.fonteUsada ? (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSourceColor(item.fonteUsada)}`}>
                        {item.fonteUsada}
                    </span>
                ) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex items-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.statusExibido)}`}>
                        {item.statusExibido}
                    </span>
                    {item.agendamento && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 truncate">
                        {item.agendamento.coluna === "AGENDADO" && item.agendamento.dataAgendada
                            ? `· ${new Date(item.agendamento.dataAgendada + 'T00:00:00').toLocaleDateString('pt-BR')}${item.agendamento.horaAgendada ? " " + item.agendamento.horaAgendada : ""}`
                            : "· via Kanban"}
                        </span>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;