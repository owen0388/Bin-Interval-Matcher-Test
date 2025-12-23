export interface ExcelRow {
  // The mandatory bin columns used for matching
  's5_now_bin': string;
  's10_now_bin': string;
  's20_now_bin': string;
  
  // Other columns can vary, so we allow any key
  [key: string]: string | number;
}

export interface SearchInputs {
  s5: string;
  s10: string;
  s20: string;
}

export type MatchResult = {
  found: boolean;
  row?: ExcelRow;
  error?: string;
};
