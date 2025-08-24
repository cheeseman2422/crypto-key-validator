import React, { useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface DropZoneProps {
  onToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export function DropZone({ onToast }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const files = Array.from(e.dataTransfer.files);
      
      if (files.length === 0) {
        onToast('warning', 'No files dropped');
        return;
      }

      // Handle single file/directory drop
      const file = files[0];
      
      // For now, treat everything as a directory scan
      // In a full implementation, we'd check if it's a file vs directory
      onToast('info', `Processing dropped item: ${file.name}`);
      
      // Note: file.path is available in Electron for file system access
      const path = (file as any).path || file.name;
      
      const scanConfig = {
        deepScan: true,
        maxFileSize: 100 * 1024 * 1024,
        fileTypes: ['.dat', '.wallet', '.json', '.keys', '.txt']
      };
      
      await window.cryptoValidator.scanFileSystem(path, scanConfig);
      
    } catch (error: any) {
      console.error('Drop processing failed:', error);
      onToast('error', `Failed to process drop: ${error.message}`);
    }
  };

  return (
    <div className="card p-8">
      <h3 className="text-lg font-semibold text-crypto-primary mb-4">
        Drag & Drop Files or Folders
      </h3>
      
      <div
        className={`drop-zone p-12 text-center ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudArrowUpIcon className="w-16 h-16 text-crypto-light mx-auto mb-4" />
        
        <p className="text-lg font-medium text-gray-300 mb-2">
          Drop files or folders here
        </p>
        
        <p className="text-sm text-gray-500">
          Supports: Wallet files (.dat, .wallet), Autopsy cases (.db), Text files, and more
        </p>
        
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={async () => {
              try {
                const result = await window.cryptoValidator.selectDirectory();
                if (!result.canceled && result.filePaths.length > 0) {
                  onToast('info', 'Starting directory scan...');
                  await window.cryptoValidator.scanFileSystem(result.filePaths[0]);
                }
              } catch (error: any) {
                onToast('error', `Scan failed: ${error.message}`);
              }
            }}
            className="btn-primary"
          >
            Browse Folder
          </button>
          
          <button
            onClick={async () => {
              try {
                const result = await window.cryptoValidator.selectFile();
                if (!result.canceled && result.filePaths.length > 0) {
                  onToast('info', 'Starting file scan...');
                  await window.cryptoValidator.scanAutopsyCase(result.filePaths[0]);
                }
              } catch (error: any) {
                onToast('error', `Scan failed: ${error.message}`);
              }
            }}
            className="btn-secondary"
          >
            Browse File
          </button>
        </div>
      </div>
    </div>
  );
}
