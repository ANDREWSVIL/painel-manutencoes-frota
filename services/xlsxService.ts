import { normalizePlate, parsePtBrToIntKm, formatDateFromExcel, normalizeHeader, equalsHeader } from '../utils/helpers';
import type { Rastreio, FrotaBase, TrackerSource } from '../types';

declare const XLSX: any;

// Find column by aliases using robust header comparison
const findColumn = (
    headerArray: string[],
    aliases: string[],
): { foundHeader: string; index: number } | null => {
    for (const alias of aliases) {
        const foundIndex = headerArray.findIndex(h => equalsHeader(h, alias));
        if (foundIndex !== -1) {
            return { foundHeader: headerArray[foundIndex], index: foundIndex };
        }
    }
    return null;
};

interface TrackerParseConfig {
    sourceName: TrackerSource;
    skipRows: number;
    placa: { aliases: string[]; fallbackIndex: number };
    km: { aliases: string[]; fallbackIndex: number };
}

// Generic parser for all tracker files
const genericTrackerParser = (sheet: any, config: TrackerParseConfig, fileTimestamp: string): { data: Rastreio[], logs: string[] } => {
    const logs: string[] = [];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const dataRows = jsonData.slice(config.skipRows);
    if (dataRows.length < 2) { // Must have at least one header and one data row
        throw new Error('Planilha vazia ou sem dados suficientes.');
    }

    const headerRow = dataRows[0].map(h => String(h || ''));
    const contentRows = dataRows.slice(1);

    let placaColIndex: number;
    let kmColIndex: number;

    // Find Placa column
    const placaMapping = findColumn(headerRow, config.placa.aliases);
    if (placaMapping) {
        placaColIndex = placaMapping.index;
        logs.push(`Coluna 'Placa' mapeada para "${placaMapping.foundHeader}" via alias.`);
    } else {
        placaColIndex = config.placa.fallbackIndex;
        logs.push(`Coluna 'Placa' não encontrada pelos aliases [${config.placa.aliases.join(', ')}]. Usando fallback para a coluna ${String.fromCharCode(65 + placaColIndex)}.`);
    }

    // Find KM column
    const kmMapping = findColumn(headerRow, config.km.aliases);
    if (kmMapping) {
        kmColIndex = kmMapping.index;
        logs.push(`Coluna 'Km Atual' mapeada para "${kmMapping.foundHeader}" via alias.`);
    } else {
        kmColIndex = config.km.fallbackIndex;
        logs.push(`Coluna 'Km Atual' não encontrada pelos aliases [${config.km.aliases.join(', ')}]. Usando fallback para a coluna ${String.fromCharCode(65 + kmColIndex)}.`);
    }
    
    // Find an example for logging the KM normalization
    const firstDataRowWithUnformattedKm = contentRows.find(row => {
        const kmValue = row[kmColIndex];
        // Find a value that is not a number and contains non-digit characters (ignoring signs)
        return kmValue && typeof kmValue !== 'number' && /[^\d]/.test(String(kmValue));
    });

    if (firstDataRowWithUnformattedKm) {
        const originalKm = String(firstDataRowWithUnformattedKm[kmColIndex]);
        const normalizedKm = parsePtBrToIntKm(originalKm);
        logs.push(`Valores de KM normalizados para inteiro (ex: "${originalKm}" → ${normalizedKm}).`);
    }


    // Process content rows
    const data: Rastreio[] = contentRows
        .map(row => {
            const placa = normalizePlate(row[placaColIndex]);
            if (!placa) return null;

            return {
                fonte: config.sourceName,
                placa,
                kmAtual: parsePtBrToIntKm(row[kmColIndex]),
                timestampArquivo: fileTimestamp,
            };
        })
        .filter((item): item is Rastreio => item !== null);

    return { data, logs };
};

const config3S: TrackerParseConfig = {
    sourceName: '3S',
    skipRows: 0,
    placa: { aliases: ['PLACA', 'Placa'], fallbackIndex: 1 }, // B
    km: { aliases: ['Km Atual', 'KM ATUAL'], fallbackIndex: 5 }, // F
};

const configIturan: TrackerParseConfig = {
    sourceName: 'Ituran',
    skipRows: 2,
    placa: { aliases: ['PLACA', 'Placa'], fallbackIndex: 1 }, // B
    km: { aliases: ['Km J', 'KmJ', 'Km', 'KM', 'KM J', 'KMJ'], fallbackIndex: 5 }, // F
};

const configSafeCar: TrackerParseConfig = {
    sourceName: 'SafeCar',
    skipRows: 0,
    placa: { aliases: ['Unidade rastreada'], fallbackIndex: 1 }, // B
    km: { aliases: ['Odômetro', 'Odometro'], fallbackIndex: 13 }, // N
};

export const parseTrackerFile = async (file: File): Promise<{ source: TrackerSource | 'Desconhecida'; data: Rastreio[]; logs: string[] }> => {
    const filename = file.name.toLowerCase();
    let source: TrackerSource | 'Desconhecida' = 'Desconhecida';
    let config: TrackerParseConfig;

    if (filename.includes('3s')) {
        source = '3S';
        config = config3S;
    } else if (filename.includes('ituran')) {
        source = 'Ituran';
        config = configIturan;
    } else if (filename.includes('safecar')) {
        source = 'SafeCar';
        config = configSafeCar;
    } else {
        throw new Error('Fonte do arquivo não reconhecida: use "3S", "Ituran" ou "SafeCar" no nome do arquivo.');
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const { data, logs } = genericTrackerParser(sheet, config, new Date().toISOString());
    return { source, data, logs };
};

const findHeaderRow = (sheet: any, headers: string[]): number => {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const row = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = sheet[cell_ref];
            if (cell && cell.v) {
                row.push(String(cell.v).trim());
            }
        }
        if (headers.every(header => row.some(cellValue => equalsHeader(header, cellValue)))) {
            return R;
        }
    }
    return -1;
};

export const parsePanelFile = async (file: File): Promise<FrotaBase[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const requiredHeaders = ['Placa', 'Modelo', 'Km Última Revisão', 'Data Última Revisão'];
    const headerRowIndex = findHeaderRow(sheet, requiredHeaders);
    if (headerRowIndex === -1) throw new Error(`Colunas obrigatórias ausentes: ${requiredHeaders.join(', ')}`);

    const data: any[] = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
    
    const parsedData = data
        .map((row, index): FrotaBase | null => {
            const placa = normalizePlate(row['Placa']);
            if (!placa || !row['Modelo']) return null;

            const kmUltimaRevisaoRaw = row['Km Última Revisão'];
            const kmUltimaRevisao = parsePtBrToIntKm(kmUltimaRevisaoRaw);
             if (kmUltimaRevisao === null) {
                console.warn(`Placa ${placa} (linha ${index + headerRowIndex + 2}) ignorada: 'Km Última Revisão' inválido ou vazio.`);
                return null;
            }
            
            return {
                placa,
                modelo: String(row['Modelo']).trim(),
                kmUltimaRevisao,
                dataUltimaRevisao: formatDateFromExcel(row['Data Última Revisão']),
                kmAtualPainel: parsePtBrToIntKm(row['Km Atual']) ?? undefined,
            };
        })
        .filter((item): item is FrotaBase => item !== null);
    
    const uniquePlates = new Map<string, FrotaBase>();
    for (const item of parsedData) {
        if (!uniquePlates.has(item.placa)) {
            uniquePlates.set(item.placa, item);
        }
    }
    return Array.from(uniquePlates.values());
};