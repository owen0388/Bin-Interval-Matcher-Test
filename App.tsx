import React, { useState, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { ExcelRow, SearchInputs, MatchResult } from './types';
import { isValueInInterval } from './utils/intervalParser';
import { Search, RotateCcw } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [inputs, setInputs] = useState<SearchInputs>({
    s5: '',
    s10: '',
    s20: ''
  });

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const handleDataLoaded = (loadedData: ExcelRow[], name: string) => {
    setData(loadedData);
    setFileName(name);
    setMatchResult(null);
  };

  const handleClearFile = () => {
    setData([]);
    setFileName(null);
    setMatchResult(null);
    setInputs({ s5: '', s10: '', s20: '' });
  };

  const handleInputChange = (field: keyof SearchInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    // Clear previous result when typing new values to avoid confusion
    if (matchResult) setMatchResult(null);
  };

  const findMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputs.s5 || !inputs.s10 || !inputs.s20) return;

    if (data.length === 0) {
      alert("Please upload an Excel file first.");
      return;
    }

    const s5Val = parseFloat(inputs.s5);
    const s10Val = parseFloat(inputs.s10);
    const s20Val = parseFloat(inputs.s20);

    if (isNaN(s5Val) || isNaN(s10Val) || isNaN(s20Val)) {
      alert("Please enter valid numbers for all fields.");
      return;
    }

    // Matching logic
    const foundRow = data.find(row => {
      // Access keys safely. We assume the headers in Excel match these exactly or approximately.
      // If the Excel headers might have spaces or weird casing, we could normalize here.
      // Based on the prompt image: s5_now_bin, s10_now_bin, s20_now_bin
      
      const bin5 = String(row['s5_now_bin'] || row['s5 now bin'] || '');
      const bin10 = String(row['s10_now_bin'] || row['s10 now bin'] || '');
      const bin20 = String(row['s20_now_bin'] || row['s20 now bin'] || '');

      return (
        isValueInInterval(s5Val, bin5) &&
        isValueInInterval(s10Val, bin10) &&
        isValueInInterval(s20Val, bin20)
      );
    });

    if (foundRow) {
      setMatchResult({ found: true, row: foundRow });
    } else {
      setMatchResult({ found: false });
    }
  };

  // Determine button state
  const isFormValid = inputs.s5 !== '' && inputs.s10 !== '' && inputs.s20 !== '' && data.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-1.5">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">BinFinder</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          
          {/* Header Section */}
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Interval Data Matcher
            </h1>
            <p className="mt-3 text-lg text-gray-500">
              Upload your Excel dataset containing interval bins. Enter your current values to automatically find the corresponding historical statistics.
            </p>
          </div>

          {/* Step 1: Upload */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
              Upload Dataset
            </h2>
            <FileUpload 
              onDataLoaded={handleDataLoaded} 
              onClear={handleClearFile} 
              fileName={fileName}
            />
            {data.length > 0 && (
              <p className="mt-2 text-sm text-green-600 text-right">
                {data.length} rows loaded successfully.
              </p>
            )}
          </section>

          {/* Step 2: Input Values - Only visible if data is loaded */}
          <section className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-opacity duration-500 ${data.length === 0 ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
             <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
              Enter Values
            </h2>
            
            <form onSubmit={findMatch}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="s5" className="block text-sm font-medium text-gray-700 mb-2">
                    s5_now_bin Value
                  </label>
                  <input
                    type="number"
                    id="s5"
                    step="any"
                    placeholder="e.g. -48.5"
                    value={inputs.s5}
                    onChange={(e) => handleInputChange('s5', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="s10" className="block text-sm font-medium text-gray-700 mb-2">
                    s10_now_bin Value
                  </label>
                  <input
                    type="number"
                    id="s10"
                    step="any"
                    placeholder="e.g. -20"
                    value={inputs.s10}
                    onChange={(e) => handleInputChange('s10', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="s20" className="block text-sm font-medium text-gray-700 mb-2">
                    s20_now_bin Value
                  </label>
                  <input
                    type="number"
                    id="s20"
                    step="any"
                    placeholder="e.g. -72"
                    value={inputs.s20}
                    onChange={(e) => handleInputChange('s20', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border transition-shadow outline-none focus:ring-2"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm transition-all
                    ${isFormValid 
                      ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-md cursor-pointer' 
                      : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  <Search className="w-4 h-4" />
                  Find Matching Row
                </button>
              </div>
            </form>
          </section>

          {/* Step 3: Results */}
          <ResultDisplay result={matchResult} />

        </div>
      </main>
    </div>
  );
}
