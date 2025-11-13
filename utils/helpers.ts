import { AllStatus } from "../types";

export const normalizeHeader = (s: string): string => {
  return (s || '')
    .replace(/\uFEFF/g, '') // BOM
    .replace(/\u00A0/g, ' ') // &nbsp;
    .replace(/\s+/g, ' ') // Collapse whitespace, including newlines
    .trim();
};

const removeAccents = (s: string): string => {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const equalsHeader = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const normA = removeAccents(normalizeHeader(a)).toLowerCase();
  const normB = removeAccents(normalizeHeader(b)).toLowerCase();
  return normA === normB;
};

export const normalizePlate = (plate: string): string => {
  if (!plate) return '';
  return String(plate).toUpperCase().trim().replace(/[\s-]/g, '');
};

export const parsePtBrToIntKm = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    if (!s) return null;

    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    let numStr = s;

    if (hasComma && hasDot) {
        // pt-BR: '.' is for thousands, ',' for decimal
        numStr = s.replace(/\./g, "").replace(",", ".");
    } else if (hasComma && !hasDot) {
        // Only a comma, treat it as a decimal separator
        numStr = s.replace(",", ".");
    }
    // If only a dot, it's treated as a decimal by default.
    // If neither, it's an integer string.

    // Remove anything that is not a digit or the decimal point.
    numStr = numStr.replace(/[^\d\.]/g, "");

    const f = parseFloat(numStr);
    if (isNaN(f)) return null;

    // Use floor to be conservative and get integer km.
    return Math.floor(f);
};

export const formatDateFromExcel = (excelDate: number | string): string => {
    if (typeof excelDate === 'string') {
        // Attempt to parse if it's already a string like dd/mm/yyyy
        const parts = excelDate.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (parts) {
            const day = parts[1].padStart(2, '0');
            const month = parts[2].padStart(2, '0');
            const year = parts[3];
            return `${day}/${month}/${year}`;
        }
        return excelDate; // Return as is if parsing fails
    }
    if (typeof excelDate !== 'number' || isNaN(excelDate)) {
        return '';
    }
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    if (isNaN(year)) return '';
    return `${day}/${month}/${year}`;
};

export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('pt-BR');
};

export const getStatusColor = (status: AllStatus) => {
    switch (status) {
      // Kanban statuses
      case 'AGENDAR REVISÃO':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'REVISÃO HOJE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'EM OFICINA':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'CONCLUÍDO':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
      // KM statuses
      case 'EXCEDEU 10.000':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'PRÓXIMO':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'OK':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'SEM DADOS':
      default:
        return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

export const getSourceColor = (source: string | undefined) => {
    switch (source) {
        case '3S': return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300';
        case 'Ituran': return 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300';
        case 'SafeCar': return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300';
        case 'Painel': return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        default: return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

export const getSortIcon = (
    columnKey: string,
    sortKey: string | null,
    sortDirection: 'asc' | 'desc'
  ) => {
    if (sortKey !== columnKey) {
      return '↕';
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };