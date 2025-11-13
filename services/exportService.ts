
import type { Consolidado } from '../types';

declare const XLSX: any;

const getFilename = (extension: 'csv' | 'xlsx') => {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `Consolidado_${YYYY}${MM}${DD}_${HH}${mm}${ss}.${extension}`;
};

export const exportService = {
  exportToXLSX: (data: Consolidado[]) => {
    const worksheetData = data.map(item => ({
      'Placa': item.placa,
      'Modelo': item.modelo,
      'Km Última Revisão': item.kmUltimaRevisao,
      'Data Última Revisão': item.dataUltimaRevisao,
      'Km Atual': item.kmAtual,
      'Km desde a última revisão': item.kmDesdeUltimaRevisao,
      'Status': item.status,
      'Fonte do KM': item.fonteUsada,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado');
    XLSX.writeFile(workbook, getFilename('xlsx'));
  },

  exportToCSV: (data: Consolidado[]) => {
    const headers = ['Placa', 'Modelo', 'Km Última Revisão', 'Data Última Revisão', 'Km Atual', 'Km desde a última revisão', 'Status', 'Fonte do KM'];
    const csvRows = [headers.join(',')];
    
    data.forEach(item => {
        const row = [
            item.placa,
            item.modelo,
            item.kmUltimaRevisao,
            item.dataUltimaRevisao,
            item.kmAtual ?? '',
            item.kmDesdeUltimaRevisao ?? '',
            item.status,
            item.fonteUsada ?? '',
        ].join(',');
        csvRows.push(row);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', getFilename('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
