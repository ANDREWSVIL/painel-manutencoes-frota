import React, { ReactNode } from 'react';
import type { Page } from '../App';
import { TruckIcon, HomeIcon, UploadIcon, DocumentAddIcon, ClipboardDocumentListIcon } from './icons';

interface LayoutProps {
  children: ReactNode;
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
                <TruckIcon className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-800 dark:text-white">Painel de Manutenções</h1>
            </div>
            <nav className="flex space-x-2">
              <NavItem
                label="Dashboard"
                icon={<HomeIcon className="h-5 w-5" />}
                isActive={activePage === 'dashboard'}
                onClick={() => setActivePage('dashboard')}
              />
               <NavItem
                label="Agendamento"
                icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                isActive={activePage === 'scheduling'}
                onClick={() => setActivePage('scheduling')}
              />
              <NavItem
                label="Anexar Rastreadores"
                icon={<UploadIcon className="h-5 w-5" />}
                isActive={activePage === 'uploadTrackers'}
                onClick={() => setActivePage('uploadTrackers')}
              />
              <NavItem
                label="Anexar Painel"
                icon={<DocumentAddIcon className="h-5 w-5" />}
                isActive={activePage === 'uploadPanel'}
                onClick={() => setActivePage('uploadPanel')}
              />
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        Painel de Manutenção de Frota © {new Date().getFullYear()}
      </footer>
    </div>
  );
};