import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// FIX: `KanbanColumnId` is an enum used as a value, so it cannot be a type-only import. -> This is now fixed in types.ts
import { type Agendamento, KanbanColumnId } from '../../types';
import { formatNumber, getStatusColor, getSourceColor } from '../../utils/helpers';
import { PencilIcon, TrashIcon, WrenchScrewdriverIcon, ArrowRightIcon } from '../icons';

interface KanbanCardProps {
    item: Agendamento;
    onEdit: (item: Agendamento) => void;
    onDelete: (id: string) => void;
    onMove: (id: string, column: KanbanColumnId) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ item, onEdit, onDelete, onMove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const formattedDate = item.dataAgendada ? new Date(item.dataAgendada + 'T00:00:00').toLocaleDateString('pt-BR') : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 mb-3 touch-none"
        >
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg text-gray-800 dark:text-white">{item.placa}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.modelo}</p>
                </div>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.statusPainel)}`}>
                    {item.statusPainel.replace(' 10.000', '')}
                </span>
            </div>

            <div className="mt-2 text-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-300">KM Rodado</p>
                <p className="font-bold text-xl text-gray-900 dark:text-white">{formatNumber(item.kmDesdeUltimaRevisao)}</p>
            </div>
            
            <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {item.dataAgendada && (
                    <p><strong>Data:</strong> {formattedDate} {item.horaAgendada || ''}</p>
                )}
                 {item.oficina && (
                    <p><strong>Oficina:</strong> {item.oficina}</p>
                )}
                {item.fonteUsada && (
                     <p><strong>Fonte:</strong> <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${getSourceColor(item.fonteUsada)}`}>{item.fonteUsada}</span></p>
                )}
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                <button onClick={() => onEdit(item)} className="p-1 text-gray-500 hover:text-blue-500" title="Editar"><PencilIcon className="h-4 w-4" /></button>
                {item.coluna !== KanbanColumnId.OFICINA && item.coluna !== KanbanColumnId.CONCLUIDO && (
                     <button onClick={() => onMove(item.id, KanbanColumnId.OFICINA)} className="p-1 text-gray-500 hover:text-amber-500" title="Enviar p/ Oficina"><WrenchScrewdriverIcon className="h-4 w-4" /></button>
                )}
                {item.coluna !== KanbanColumnId.CONCLUIDO && (
                     <button onClick={() => onMove(item.id, KanbanColumnId.CONCLUIDO)} className="p-1 text-gray-500 hover:text-green-500" title="Concluir"><ArrowRightIcon className="h-4 w-4" /></button>
                )}
                <button onClick={() => onDelete(item.id)} className="p-1 text-gray-500 hover:text-red-500" title="Excluir"><TrashIcon className="h-4 w-4" /></button>
            </div>
        </div>
    );
};

export default KanbanCard;