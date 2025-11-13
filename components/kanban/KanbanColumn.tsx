import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Agendamento } from '../../types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
    id: string;
    title: string;
    items: Agendamento[];
    onEditCard: (item: Agendamento) => void;
    onDeleteCard: (id: string) => void;
    onMoveCard: (id: string, column: any) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, items, onEditCard, onDeleteCard, onMoveCard }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div className="flex flex-col flex-shrink-0 w-72">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-200 dark:bg-gray-800 rounded-t-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
                <span className="text-sm font-medium bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
                    {items.length}
                </span>
            </div>
            <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
                <div
                    ref={setNodeRef}
                    className={`flex-grow bg-gray-100 dark:bg-gray-900/70 p-2 rounded-b-lg overflow-y-auto min-h-[200px] transition-colors duration-200 ${isOver ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                >
                    {items.map(item => (
                        <KanbanCard 
                            key={item.id} 
                            item={item}
                            onEdit={onEditCard}
                            onDelete={onDeleteCard}
                            onMove={onMoveCard}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

export default KanbanColumn;
