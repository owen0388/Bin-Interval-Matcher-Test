import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExcelRow } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: ExcelRow[], fileName: string) => void;
  onClear: () => void;
  fileName: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, onClear, fileName }) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        
        // Assume data is in the first sheet
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json<ExcelRow>(ws);
        onDataLoaded(data, file.name);
      } catch (error) {
        console.error("Error parsing excel", error);
        alert("Failed to parse Excel file. Please ensure it matches the required format.");
      }
    };
    reader.readAsBinaryString(file);
  }, [onDataLoaded]);

  if (fileName) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-full">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Loaded File</p>
            <p className="text-sm text-gray-500">{fileName}</p>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove file"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label 
        htmlFor="file-upload" 
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> excel file</p>
          <p className="text-xs text-gray-500">.xlsx or .xls</p>
        </div>
        <input 
          id="file-upload" 
          type="file" 
          accept=".xlsx, .xls" 
          className="hidden" 
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};
