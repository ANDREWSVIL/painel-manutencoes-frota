import React, { useState, useMemo } from 'react';
import Uploader from '../components/Uploader';
import { useConsolidatedData } from '../hooks/useConsolidatedData';
import type { ToastMessage } from '../App';
import { Rastreio } from '../types';

type RecentResult = {
    success: boolean;
    file: string;
    source?: string;
    count?: number;
    details?: string[];
    error?: string;
}

type UploadTrackersPageProps = Pick<ReturnType<typeof useConsolidatedData>, 'addTrackerFiles' | 'logs' | 'isLoading' | 'rastreios'> & {
    addToast: (type: ToastMessage['type'], message: string) => void;
};

const UploadTrackersPage: React.FC<UploadTrackersPageProps> = ({ addTrackerFiles, logs, isLoading, rastreios, addToast }) => {
    const [recentResults, setRecentResults] = useState<RecentResult[]>([]);

    const handleFileUpload = async (files: File[]) => {
        const results = await addTrackerFiles(files);
        setRecentResults(results);
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.length - successCount;
        if (successCount > 0) {
            addToast('success', `${successCount} arquivo(s) de rastreador importado(s) com sucesso.`);
        }
        if (errorCount > 0) {
            addToast('error', `${errorCount} arquivo(s) falharam na importação. Verifique os logs.`);
        }
    };
    
    const trackerLogs = logs.filter(log => log.fonte !== 'Painel');

    const sourceCounts = useMemo(() => {
        const counts: { [key: string]: number } = { '3S': 0, 'Ituran': 0, 'SafeCar': 0 };
        (rastreios || []).forEach((r: Rastreio) => {
            if (counts[r.fonte] !== undefined) {
                counts[r.fonte]++;
            }
        });
        return counts;
    }, [rastreios]);

    return (
        <div className="space-y-8">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Resumo dos Dados Armazenados</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-2xl font-bold">{sourceCounts['3S']}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Registros 3S</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-2xl font-bold">{sourceCounts['Ituran']}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Registros Ituran</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-2xl font-bold">{sourceCounts['SafeCar']}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Registros SafeCar</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">Anexar Arquivos dos Rastreadores</h2>
                <Uploader
                    onFilesAccepted={handleFileUpload}
                    title="Importar Dados de Rastreadores"
                    description="Anexe um ou mais arquivos de 3S, Ituran e SafeCar (.xlsx)."
                    multiple={true}
                />
            </div>

            {isLoading && <div className="text-center py-4">Processando arquivos...</div>}

            {recentResults.length > 0 && (
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold mb-2">Resultado da Última Importação</h3>
                    <ul className="divide-y dark:divide-gray-700">
                        {recentResults.map((result, index) => (
                            <li key={index} className="py-3">
                                {result.success ? (
                                    <div>
                                        <p className="text-green-600 dark:text-green-400">✅ <strong>{result.file}</strong> ({result.source}): {result.count} registros lidos.</p>
                                        {result.details && result.details.length > 0 && (
                                            <div className="mt-2 pl-4 text-sm text-gray-600 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-600">
                                                <p className="font-semibold">Detalhes do Mapeamento:</p>
                                                <ul className="list-disc list-inside ml-2">
                                                    {result.details.map((d, i) => <li key={i}>{d}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-red-600 dark:text-red-400">❌ <strong>{result.file}</strong>: Erro - {result.error}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-2">Histórico de Importações (Rastreadores)</h3>
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Data</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Arquivo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Fonte</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Linhas</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trackerLogs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{log.nomeArquivo}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{log.fonte}</td>
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

export default UploadTrackersPage;