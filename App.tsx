import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { ExcelRow, SearchInputs, MatchResult } from './types';
import { isValueInInterval } from './utils/intervalParser';
import { Search, Loader2, Database, FileUp, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

// 扩展文件路径候选项，包含相对路径以适配不同的部署环境
const FILE_CANDIDATES = [
  '/Slope_Combination_Analysis.xlsx',       // 根目录大写 (标准 Vercel/Public)
  '/slope_combination_analysis.xlsx',       // 根目录小写
  './Slope_Combination_Analysis.xlsx',      // 相对当前路径大写
  './slope_combination_analysis.xlsx',      // 相对当前路径小写
  'Slope_Combination_Analysis.xlsx',        // 纯文件名
];

export default function App() {
  const [data, setData] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutoLoaded, setIsAutoLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const [inputs, setInputs] = useState<SearchInputs>({
    s5: '',
    s10: '',
    s20: ''
  });

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // 辅助函数：将buffer转为十六进制字符串，用于调试
  const getHexHeader = (u8: Uint8Array, length: number = 8) => {
    return Array.from(u8.slice(0, length))
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  };

  const parseExcelData = (buffer: ArrayBuffer | Uint8Array, name: string, auto: boolean = false) => {
    try {
      let dataArr: Uint8Array;
      if (buffer instanceof Uint8Array) {
        dataArr = buffer;
      } else {
        dataArr = new Uint8Array(buffer);
      }

      // --- Magic Bytes 校验 ---
      // 标准 XLSX (ZIP) 文件头: 50 4B 03 04
      if (dataArr.length < 4) {
        throw new Error("文件太小，不是有效的 Excel 文件");
      }
      
      const header = getHexHeader(dataArr, 4);
      // 允许标准的 ZIP 头 (50 4B 03 04) 或常见的 OLE 头 (D0 CF 11 E0 - 旧版xls)
      const isZip = dataArr[0] === 0x50 && dataArr[1] === 0x4B && dataArr[2] === 0x03 && dataArr[3] === 0x04;
      const isOle = dataArr[0] === 0xD0 && dataArr[1] === 0xCF && dataArr[2] === 0x11 && dataArr[3] === 0xE0;

      if (!isZip && !isOle) {
        // 如果不是二进制格式，可能是 Git LFS 指针或 HTML 错误页
        const textDecoder = new TextDecoder("utf-8");
        const startText = textDecoder.decode(dataArr.slice(0, 50));
        let errorMsg = `文件头校验失败: [${header}]`;
        
        if (startText.includes("version https://git-lfs")) {
          errorMsg += " (检测到 Git LFS 指针文件，而非真实文件)";
        } else if (startText.trim().startsWith("<!DOCTYPE") || startText.includes("<html")) {
          errorMsg += " (检测到 HTML 内容，可能是 404 页面)";
        }
        throw new Error(errorMsg);
      }

      const workbook = XLSX.read(dataArr, { type: 'array' });
      if (!workbook.SheetNames.length) throw new Error("Excel没有工作表");
      
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws);
      
      if (jsonData.length === 0) throw new Error("数据为空");

      setData(jsonData);
      setFileName(name);
      setIsAutoLoaded(auto);
      setMatchResult(null);
      setLoadError(null);
      return true;
    } catch (error: any) {
      console.error("Error parsing excel", error);
      const msg = error.message || "未知错误";
      if (auto) {
        throw new Error(msg);
      } else {
        alert(`解析失败: ${msg}`);
      }
      return false;
    }
  };

  const loadDefaultFile = async () => {
    setIsLoading(true);
    setLoadError(null);
    setDebugInfo([]);
    
    let logs: string[] = [];
    const addLog = (msg: string) => {
      console.log(msg);
      logs.push(msg);
    };

    // 遍历尝试列表
    for (const filePath of FILE_CANDIDATES) {
      try {
        const url = `${filePath}?v=${Date.now()}`; // 防止缓存
        addLog(`尝试请求: ${url}`);
        
        const response = await fetch(url);
        addLog(`状态码: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          addLog(`Content-Type: ${contentType}`);

          if (contentType && contentType.includes("text/html")) {
            addLog(`❌ 跳过: 返回了 HTML 内容`);
            continue; 
          }

          const arrayBuffer = await response.arrayBuffer();
          addLog(`下载成功，大小: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

          // 尝试解析
          try {
            const success = parseExcelData(arrayBuffer, filePath.replace(/^.*[\\/]/, ''), true);
            if (success) {
              addLog(`✅ 成功加载并解析: ${filePath}`);
              setIsLoading(false);
              // 将日志保存以便查看（虽然成功了）
              setDebugInfo(prev => [...prev, ...logs]);
              return; 
            }
          } catch (parseErr: any) {
             addLog(`❌ 解析异常: ${parseErr.message}`);
          }
        } else {
           addLog(`❌ 请求失败`);
        }
      } catch (error: any) {
        addLog(`❌ 网络/未知异常: ${error.message}`);
      }
    }

    setDebugInfo(logs);
    setLoadError("无法自动加载分析文件。");
    setIsLoading(false);
  };

  useEffect(() => {
    loadDefaultFile();
  }, []);

  const handleDataLoaded = (loadedData: ExcelRow[], name: string) => {
    setData(loadedData);
    setFileName(name);
    setIsAutoLoaded(false);
    setMatchResult(null);
    setLoadError(null);
  };

  const handleClearFile = () => {
    setData([]);
    setFileName(null);
    setIsAutoLoaded(false);
    setMatchResult(null);
    setLoadError(null);
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
      alert("请输入有效的数字");
      return;
    }

    const foundRow = data.find(row => {
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
                {isAutoLoaded ? '内置数据' : '上传数据'}
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
              {data.length > 0 
                ? `已加载 ${data.length} 条数据，请在下方输入数值进行查询。` 
                : "系统将自动加载分析文件，或请手动上传。"}
            </p>
          </div>

          {/* 加载中状态 */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">正在读取数据文件...</p>
            </div>
          )}

          {/* 加载失败错误提示 */}
          {!isLoading && loadError && data.length === 0 && (
            <div className="bg-white border border-amber-200 p-6 rounded-2xl shadow-sm animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                <div className="flex-1 w-full overflow-hidden">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-900">自动加载失败</h3>
                    <button 
                      onClick={loadDefaultFile}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                    >
                      <RefreshCw className="w-3 h-3" /> 重试
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {loadError}
                  </p>
                  
                  {/* 调试信息折叠面板 */}
                  <details className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200" open>
                    <summary className="cursor-pointer font-medium text-gray-700 flex items-center gap-1">
                      <Info className="w-3 h-3" /> 查看详细日志 (Magic Bytes)
                    </summary>
                    <ul className="mt-2 space-y-1 font-mono pl-1 max-h-48 overflow-y-auto">
                      {debugInfo.map((log, idx) => (
                        <li key={idx} className={`border-b border-gray-100 last:border-0 pb-1 ${log.includes('❌') ? 'text-red-600' : 'text-gray-600'}`}>
                          {log}
                        </li>
                      ))}
                    </ul>
                  </details>

                  <p className="text-xs text-amber-600 mt-3">
                     <strong>提示：</strong> 如果上方日志显示 Magic Bytes 不是 <code>50 4B 03 04</code>，说明服务器上的文件已损坏，请使用下方的<strong>手动上传</strong>。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 数据管理区域 */}
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
              输入数值
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
                  匹配
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
