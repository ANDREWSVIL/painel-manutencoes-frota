
import React, { useState } from 'react';
import Uploader from '../components/Uploader';
import { useConsolidatedData } from '../hooks/useConsolidatedData';
import type { FrotaBase, ImportLog } from '../types';
import { formatNumber } from '../utils/helpers';
import type { ToastMessage } from '../App';

type UploadPanelPageProps = Pick<ReturnType<typeof useConsolidatedData>, 'addPanelFile' | 'logs' | 'isLoading'> & {
    addToast: (type: ToastMessage['type'], message: string) => void;
};

const UploadPanelPage: React.FC<UploadPanelPageProps> = ({ addPanelFile, logs, isLoading, addToast }) => {
    const [previewData, setPreviewData] = useState<FrotaBase[] | null>(null);

    const handleFileUpload = async (files: File[]) => {
        if (files.length === 0) return;
        const file = files[0];
        const result = await addPanelFile(file);
        if (result.success) {
            setPreviewData(result.data);
            addToast('success', `Arquivo do painel "${file.name}" importado com sucesso.`);
        } else {
            setPreviewData(null);
            addToast('error', `Erro ao importar painel: ${result.error}`);
        }
    };

    const panelLogs = logs.filter(log => log.fonte === 'Painel');

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">Anexar Arquivo do Painel da Frota</h2>
                <Uploader
                    onFilesAccepted={handleFileUpload}
                    title="Importar PAINEL FROTA.xlsx"
                    description="Anexe o arquivo principal com a lista de veículos da frota."
                    multiple={false}
                />
            </div>
            
            {isLoading && <div className="text-center">Processando arquivo...</div>}

            {previewData && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold mb-2">Prévia dos Dados Importados ({previewData.length} registros)</h3>
                     <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Placa</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Modelo</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Km Última Revisão</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Data Última Revisão</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.slice(0, 5).map(item => (
                                    <tr key={item.placa} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{item.placa}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{item.modelo}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{formatNumber(item.kmUltimaRevisao)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{item.dataUltimaRevisao}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewData.length > 5 && <p className="text-center text-sm text-gray-500 mt-2">... e mais {previewData.length - 5} registros.</p>}
                    </div>
                </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                 <h3 className="text-lg font-bold mb-2">Histórico de Importações (Painel)</h3>
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                         <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Data</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Arquivo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Linhas</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {panelLogs.map(log => (
                               <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{log.nomeArquivo}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{log.linhasLidas}</td>
                                    <td className={`px-4 py-2 whitespace-nowrap text-sm ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{log.status === 'success' ? 'Sucesso' : `Erro: ${log.errorMessage}`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UploadPanelPage;
