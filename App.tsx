import React, { useState, useCallback } from 'react';
import DashboardPage from './pages/DashboardPage';
import UploadTrackersPage from './pages/UploadTrackersPage';
import UploadPanelPage from './pages/UploadPanelPage';
import SchedulingPage from './pages/SchedulingPage';
import { Layout } from './components/Layout';
import { useConsolidatedData } from './hooks/useConsolidatedData';
import Toast from './components/Toast';
import { Consolidado } from './types';

export type Page = 'dashboard' | 'uploadTrackers' | 'uploadPanel' | 'scheduling';
export type ToastMessage = { id: number; type: 'success' | 'error' | 'info'; message: string };

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const dataHook = useConsolidatedData();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [alertsToSchedule, setAlertsToSchedule] = useState<Consolidado[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const handleScheduleAlerts = useCallback((vehicles: Consolidado[]) => {
    setAlertsToSchedule(vehicles);
    setActivePage('scheduling');
    addToast('info', `${vehicles.length} veículo(s) enviado(s) para a tela de agendamento.`);
  }, [addToast]);
  
  const handleConsumeAlerts = useCallback(() => {
      setAlertsToSchedule([]);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage {...dataHook} addToast={addToast} onScheduleAlerts={handleScheduleAlerts} />;
      case 'uploadTrackers':
        return <UploadTrackersPage {...dataHook} addToast={addToast} />;
      case 'uploadPanel':
        return <UploadPanelPage {...dataHook} addToast={addToast} />;
      case 'scheduling':
        return <SchedulingPage initialFromAlerts={alertsToSchedule} onConsumeInitial={handleConsumeAlerts} />;
      default:
        return <DashboardPage {...dataHook} addToast={addToast} onScheduleAlerts={handleScheduleAlerts} />;
    }
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      <div className="relative">
        {renderPage()}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
          {toasts.map(toast => (
            <Toast key={toast.id} type={toast.type} message={toast.message} />
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default App;