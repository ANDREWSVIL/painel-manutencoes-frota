import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons';

interface UploaderProps {
  onFilesAccepted: (files: File[]) => void;
  title: string;
  description: string;
  multiple?: boolean;
}

const Uploader: React.FC<UploaderProps> = ({ onFilesAccepted, title, description, multiple = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // FIX: Explicitly type `file` as `File` to avoid `unknown` type error.
    const files = Array.from(e.dataTransfer.files).filter((file: File) => file.name.endsWith('.xlsx'));
    if (files.length > 0) {
      onFilesAccepted(files);
    }
  }, [onFilesAccepted]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesAccepted(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-300 ${
        isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <UploadIcon className="w-12 h-12 text-gray-400" />
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
        <p className="text-sm text-gray-400">Arraste e solte arquivos aqui, ou clique para selecionar.</p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx"
          multiple={multiple}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default Uploader;