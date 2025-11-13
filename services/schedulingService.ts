import { storageService } from './storageService';
// FIX: `KanbanColumnId` is an enum used as a value, so it cannot be a type-only import. -> This is now fixed in types.ts
import { type Agendamento, type AgendamentoHistoryEvent, KanbanColumnId, type Consolidado } from '../types';

const createHistoryEvent = (action: string, meta?: Record<string, any>): AgendamentoHistoryEvent => ({
    at: new Date().toISOString(),
    action,
    meta,
});

export const schedulingService = {
    async list(): Promise<Agendamento[]> {
        return storageService.schedules.list();
    },

    async get(id: string): Promise<Agendamento | undefined> {
        return storageService.schedules.get(id);
    },

    async update(id: string, patch: Partial<Omit<Agendamento, 'id' | 'history'>>, action: string): Promise<Agendamento> {
        const existing = await this.get(id);
        if (!existing) throw new Error('Agendamento não encontrado.');

        const updated: Agendamento = {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString(),
            history: [...existing.history, createHistoryEvent(action, patch)],
        };
        await storageService.schedules.update(updated);
        return updated;
    },

    async remove(id: string): Promise<void> {
        return storageService.schedules.remove(id);
    },
    
    async bulkCreate(vehicles: Consolidado[], defaults: Partial<Agendamento>): Promise<{ createdIds: string[], conflicts: string[] }> {
        const allSchedules = await this.list();
        const activeSchedulesByPlaca = new Map<string, Agendamento>();
        
        allSchedules
            .filter(s => s.coluna !== KanbanColumnId.CONCLUIDO)
            .forEach(s => activeSchedulesByPlaca.set(s.placa, s));

        const createdIds: string[] = [];
        const conflicts: string[] = [];
        
        for (const v of vehicles) {
            if (activeSchedulesByPlaca.has(v.placa)) {
                conflicts.push(v.placa);
                continue;
            }
            
            const now = new Date().toISOString();
            const newSchedule: Agendamento = {
                id: crypto.randomUUID(),
                placa: v.placa,
                modelo: v.modelo,
                kmAtual: v.kmAtual,
                kmUltimaRevisao: v.kmUltimaRevisao,
                kmDesdeUltimaRevisao: v.kmDesdeUltimaRevisao,
                fonteUsada: v.fonteUsada,
                statusPainel: v.status,
                coluna: KanbanColumnId.AGENDAR,
                ...defaults,
                createdAt: now,
                updatedAt: now,
                history: [createHistoryEvent('CREATE', { from: 'dashboard' })],
            };
            
            await storageService.schedules.add(newSchedule);
            createdIds.push(newSchedule.id);
        }
        
        return { createdIds, conflicts };
    }
};