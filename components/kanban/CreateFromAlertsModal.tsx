import React, { useState } from 'react';
import { Consolidado, SchedulingPriority } from '../../types';
import { schedulingService } from '../../services/schedulingService';

interface CreateFromAlertsModalProps {
    isOpen: boolean;
    onClose: (createdIds: string[] | null) => void;
    vehicles: Consolidado[];
    addToast: (type: 'success' | 'error', message: string) => void;
}

const CreateFromAlertsModal: React.FC<CreateFromAlertsModalProps> = ({ isOpen, onClose, vehicles, addToast }) => {
    const [defaults, setDefaults] = useState({
        dataAgendada: '',
        horaAgendada: '',
        oficina: '',
        observacoes: '',
        prioridade: SchedulingPriority.MEDIA,
    });
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const getSuggestedPriority = (status: string) => {
        if (status === 'EXCEDEU 10.000') return SchedulingPriority.ALTA;
        if (status === 'PRÓXIMO') return SchedulingPriority.MEDIA;
        return SchedulingPriority.BAIXA;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const vehiclesWithPriority = vehicles.map(v => ({
            ...v,
            prioridade: getSuggestedPriority(v.status),
        }));

        const finalData = vehiclesWithPriority.map(v => ({
            ...v,
            ...defaults,
            prioridade: defaults.prioridade || v.prioridade,
        }))

        const { createdIds, conflicts } = await schedulingService.bulkCreate(finalData, defaults);

        if (conflicts.length > 0) {
            addToast('error', `Agendamento já existe para: ${conflicts.join(', ')}.`);
        }
        if (createdIds.length > 0) {
            addToast('success', `${createdIds.length} agendamento(s) criado(s) com sucesso.`);
        }
        setIsLoading(false);
        onClose(createdIds);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Criar Agendamentos para {vehicles.length} Veículos</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Prioridade Padrão</label>
                         <select
                            value={defaults.prioridade}
                            onChange={(e) => setDefaults(d => ({ ...d, prioridade: e.target.value as SchedulingPriority }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value={SchedulingPriority.ALTA}>Alta</option>
                            <option value={SchedulingPriority.MEDIA}>Média</option>
                            <option value={SchedulingPriority.BAIXA}>Baixa</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">A prioridade será ALTA para status "EXCEDEU" e MÉDIA para "PRÓXIMO" se não for definida.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Data Padrão</label>
                            <input type="date" value={defaults.dataAgendada} onChange={e => setDefaults(d => ({ ...d, dataAgendada: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Hora Padrão</label>
                            <input type="time" value={defaults.horaAgendada} onChange={e => setDefaults(d => ({ ...d, horaAgendada: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Oficina Padrão</label>
                        <input type="text" value={defaults.oficina} onChange={e => setDefaults(d => ({ ...d, oficina: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Observações Padrão</label>
                        <textarea value={defaults.observacoes} onChange={e => setDefaults(d => ({ ...d, observacoes: e.target.value }))} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"></textarea>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => onClose(null)} className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-600 rounded-md">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:bg-blue-300">{isLoading ? 'Criando...' : 'Criar Agendamentos'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFromAlertsModal;