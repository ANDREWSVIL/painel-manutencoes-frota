import React from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './icons';

interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
}

const Toast: React.FC<ToastProps> = ({ type, message }) => {
  const config = {
      success: {
          bgColor: 'bg-green-500',
          Icon: CheckCircleIcon
      },
      error: {
          bgColor: 'bg-red-500',
          Icon: XCircleIcon
      },
      info: {
          bgColor: 'bg-blue-500',
          Icon: InformationCircleIcon
      }
  };
  
  const { bgColor, Icon } = config[type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-md shadow-lg flex items-center space-x-3 animate-fade-in-out`}
      role="alert"
    >
      <Icon className="w-6 h-6" />
      <span className="font-medium">{message}</span>
      <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(10px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 5s forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;