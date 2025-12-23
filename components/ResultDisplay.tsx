import React from 'react';
import { ExcelRow, MatchResult } from '../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResultDisplayProps {
  result: MatchResult | null;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  if (!result) return null;

  if (!result.found || result.error) {
    return (
      <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-800">No Match Found</h3>
          <p className="text-sm text-red-600 mt-1">
            {result.error || "The input values do not fall into any of the provided bin combinations."}
          </p>
        </div>
      </div>
    );
  }

  const row = result.row!;

  // We prioritize specific columns for the "Header" of the card, and dump the rest in a grid
  const mainKeys = ['s5_now_bin', 's10_now_bin', 's20_now_bin'];
  const otherKeys = Object.keys(row).filter(k => !mainKeys.includes(k));

  return (
    <div className="mt-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-6 h-6 text-green-500" />
        <h2 className="text-xl font-bold text-gray-800">Matched Result</h2>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header Section: The Bins */}
        <div className="bg-blue-600 p-6 text-white">
          <h3 className="text-sm uppercase tracking-wider font-semibold opacity-80 mb-4">Matched Intervals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mainKeys.map(key => (
              <div key={key} className="bg-blue-700/50 p-3 rounded-lg backdrop-blur-sm">
                <span className="text-xs text-blue-100 block mb-1">{key.replace(/_/g, ' ').toUpperCase()}</span>
                <span className="text-lg font-mono font-medium">{row[key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body Section: The Stats */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Statistical Data</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherKeys.map((key) => {
              const value = row[key];
              const isPercentage = key.includes('%') || (typeof value === 'number' && value <= 1 && value > 0 && !Number.isInteger(value)); // Heuristic for percentage
              
              return (
                <div key={key} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                  <dt className="text-xs text-gray-500 font-medium mb-1 break-words">{key}</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {value}
                  </dd>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
