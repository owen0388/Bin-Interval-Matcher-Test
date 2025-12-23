import React, { useState, useEffect, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { ExcelRow, SearchInputs, MatchResult } from './types';
import { isValueInInterval } from './utils/intervalParser';
import { Search, Loader2, Database, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEFAULT_FILE_PATH = './data.xlsx';

export default function App() {
  const [data, setData] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutoLoaded, setIsAutoLoaded] = useState<boolean>(false);
  
  const [inputs, setInputs] = useState<SearchInputs>({
    s5: '',
    s10: '',
    s20: ''
  });

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // 核心解析逻辑
  const parseExcelData = (arrayBuffer: ArrayBuffer, name: string, auto: boolean = false) => {
    try {
      const dataArr = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(dataArr, { type: 'array' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws);
      
      setData(jsonData);
      setFileName(name);
      setIsAutoLoaded(auto);
      setMatchResult(null);
    } catch (error) {
      console.error("Error parsing excel", error);
      if (!auto) alert("解析 Excel 失败，请检查文件格式。");
    }
  };

  // 自动加载逻辑
  useEffect(() => {
    const loadDefaultFile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(DEFAULT_FILE_PATH);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          parseExcelData(arrayBuffer, 'data.xlsx', true);
        } else {
          console.log(`未找到默认文件 ${DEFAULT_FILE_PATH}，请手动上传。`);
        }
      } catch (error) {
        console.error("自动加载文件失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultFile();
  }, []);

  const handleDataLoaded = (loadedData: ExcelRow[], name: string) => {
    setData(loadedData);
    setFileName(name);
    setIsAutoLoaded(false);
    setMatchResult(null);
  };

  const handleClearFile = () => {
    setData([]);
    setFileName(null);
    setIsAutoLoaded(false);
    setMatchResult(null);
    setInputs({ s5: '', s10: '', s20: '' });
  };

  const handleInputChange = (field: keyof SearchInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    if (matchResult) setMatchResult(null);
  };

  const findMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputs.s5 || !inputs.s10 || !inputs.s20) return;

    const s5Val = parseFloat(inputs.s5);
    const s10Val = parseFloat(inputs.s10);
    const s20Val = parseFloat(inputs.s20);

    if (isNaN(s5Val) || isNaN(s10Val) || isNaN(s20Val)) {
      alert("请输入有效的数字。");
      return;
    }

    const foundRow = data.find(row => {
      // 兼容不同的列名格式（下划线或空格）
      const bin5 = String(row['s5_now_bin'] || row['s5 now bin'] || '');
      const bin10 = String(row['s10_now_bin'] || row['s10 now bin'] || '');
      const bin20 = String(row['s20_now_bin'] || row['s20 now bin'] || '');

      return (
        isValueInInterval(s5Val, bin5) &&
        isValueInInterval(s10Val, bin10) &&
        isValueInInterval(s20Val, bin20)
      );
    });

    setMatchResult(foundRow ? { found: true, row: foundRow } : { found: false });
  };

  const isFormValid = inputs.s5 !== '' && inputs.s10 !== '' && inputs.s20 !== '' && data.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-1.5">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">BinFinder Pro</span>
            </div>
            {data.length > 0 && (
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                {isAutoLoaded ? <Database className="w-4 h-4" /> : <FileUp className="w-4 h-4" />}
                {isAutoLoaded ? '已加载内置数据' : '已加载上传数据'}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              指标区间匹配系统
            </h1>
            <p className="mt-3 text-lg text-gray-500">
              系统将根据输入的数值，自动从 {isAutoLoaded ? 'data.xlsx' : '上传的文件'} 中匹配对应的统计区间及结果。
            </p>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">正在读取内置数据文件...</p>
            </div>
          )}

          {/* 数据管理区域 - 如果没有自动加载成功，显示上传控件 */}
          {!isLoading && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                数据管理
              </h2>
              <FileUpload 
                onDataLoaded={handleDataLoaded} 
                onClear={handleClearFile} 
                fileName={fileName}
              />
            </section>
          )}

          {/* 输入区域 */}
          <section className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-500 ${data.length === 0 ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
             <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
              输入当前指标数值
            </h2>
            
            <form onSubmit={findMatch}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="s5" className="block text-sm font-medium text-gray-700 mb-2">s5_now_bin</label>
                  <input
                    type="number" id="s5" step="any" placeholder="输入数值..."
                    value={inputs.s5}
                    onChange={(e) => handleInputChange('s5', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="s10" className="block text-sm font-medium text-gray-700 mb-2">s10_now_bin</label>
                  <input
                    type="number" id="s10" step="any" placeholder="输入数值..."
                    value={inputs.s10}
                    onChange={(e) => handleInputChange('s10', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="s20" className="block text-sm font-medium text-gray-700 mb-2">s20_now_bin</label>
                  <input
                    type="number" id="s20" step="any" placeholder="输入数值..."
                    value={inputs.s20}
                    onChange={(e) => handleInputChange('s20', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border outline-none focus:ring-2"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg text-white font-bold shadow-sm transition-all
                    ${isFormValid 
                      ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg cursor-pointer transform active:scale-95' 
                      : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  <Search className="w-5 h-5" />
                  即刻匹配
                </button>
              </div>
            </form>
          </section>

          <ResultDisplay result={matchResult} />

        </div>
      </main>
    </div>
  );
}
