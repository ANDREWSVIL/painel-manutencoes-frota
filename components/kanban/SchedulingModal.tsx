import React, { useState, useEffect } from 'react';
// FIX: `SchedulingPriority` is an enum used as a value, so it cannot be a type-only import. -> This is now fixed in types.ts
import { type Agendamento, SchedulingPriority } from '../../types';

interface SchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Agendamento | null;
    onSave: (id: string, patch: Partial<Agendamento>, action: string) => Promise<void>;
}

const SchedulingModal: React.FC<SchedulingModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const [formData, setFormData] = useState<Partial<Agendamento>>({});
    
    useEffect(() => {
        if (item) {
            setFormData({
                dataAgendada: item.dataAgendada || '',
                horaAgendada: item.horaAgendada || '',
                oficina: item.oficina || '',
                observacoes: item.observacoes || '',
                prioridade: item.prioridade || SchedulingPriority.MEDIA,
            });
        }
    }, [item]);

    if (!isOpen || !item) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(item.id, formData, 'EDIT');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Editar Agendamento: {item.placa}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="dataAgendada" className="block text-sm font-medium">Data Agendada</label>
                            <input type="date" name="dataAgendada" id="dataAgendada" value={formData.dataAgendada || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                             <label htmlFor="horaAgendada" className="block text-sm font-medium">Hora Agendada</label>
                            <input type="time" name="horaAgendada" id="horaAgendada" value={formData.horaAgendada || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="oficina" className="block text-sm font-medium">Oficina</label>
                        <input type="text" name="oficina" id="oficina" value={formData.oficina || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label htmlFor="prioridade" className="block text-sm font-medium">Prioridade</label>
                         <select name="prioridade" id="prioridade" value={formData.prioridade} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value={SchedulingPriority.ALTA}>Alta</option>
                            <option value={SchedulingPriority.MEDIA}>Média</option>
                            <option value={SchedulingPriority.BAIXA}>Baixa</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="observacoes" className="block text-sm font-medium">Observações</label>
                        <textarea name="observacoes" id="observacoes" value={formData.observacoes || ''} onChange={handleChange} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"></textarea>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-600 rounded-md">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SchedulingModal;