
import React, { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  colorClass: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, colorClass }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center space-x-4">
      <div className={`rounded-full p-3 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

export default KpiCard;
