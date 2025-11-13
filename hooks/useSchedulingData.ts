import { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: `KanbanColumnId` is an enum used as a value, so it cannot be a type-only import. -> This is now fixed in types.ts
import { type Agendamento, KanbanColumnId } from '../types';
import { schedulingService } from '../services/schedulingService';

export const useSchedulingData = () => {
    const [schedules, setSchedules] = useState<Agendamento[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshSchedules = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await schedulingService.list();
            setSchedules(data);
            setError(null);
        } catch (e) {
            setError('Falha ao carregar agendamentos.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSchedules();
    }, [refreshSchedules]);

    const updateSchedule = useCallback(async (id: string, patch: Partial<Agendamento>, action: string) => {
        try {
            const updated = await schedulingService.update(id, patch, action);
            setSchedules(prev => prev.map(s => s.id === id ? updated : s));
            return updated;
        } catch (e) {
            setError('Falha ao atualizar agendamento.');
            console.error(e);
            return null;
        }
    }, []);
    
    const moveSchedule = useCallback(async (id: string, newColumn: KanbanColumnId) => {
        const item = schedules.find(s => s.id === id);
        if (!item) return;

        const action = `MOVE:${item.coluna}->${newColumn}`;
        await updateSchedule(id, { coluna: newColumn }, action);
    }, [schedules, updateSchedule]);
    
    const removeSchedule = useCallback(async (id: string) => {
        try {
            await schedulingService.remove(id);
            setSchedules(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            setError('Falha ao remover agendamento.');
            console.error(e);
        }
    }, []);

    const schedulesByColumn = useMemo(() => {
        const grouped: Record<KanbanColumnId, Agendamento[]> = {
            [KanbanColumnId.AGENDAR]: [],
            [KanbanColumnId.AGENDADO]: [],
            [KanbanColumnId.HOJE]: [],
            [KanbanColumnId.OFICINA]: [],
            [KanbanColumnId.CONCLUIDO]: [],
        };
        schedules.forEach(s => {
            if (grouped[s.coluna]) {
                grouped[s.coluna].push(s);
            }
        });
        // Sort items within columns, e.g., by creation date
        for (const col of Object.values(grouped)) {
            col.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return grouped;
    }, [schedules]);

    return {
        schedules,
        schedulesByColumn,
        isLoading,
        error,
        refreshSchedules,
        updateSchedule,
        moveSchedule,
        removeSchedule,
    };
};