/**
 * Checks if a numeric value falls within a mathematical interval string.
 * Supports formats: 
 * (a, b) -> a < x < b
 * [a, b] -> a <= x <= b
 * (a, b] -> a < x <= b
 * [a, b) -> a <= x < b
 */
export const isValueInInterval = (value: number, intervalStr: string): boolean => {
  if (!intervalStr || typeof intervalStr !== 'string') return false;

  const cleanStr = intervalStr.trim();
  
  // Check format using regex
  // Matches start bracket, number, comma, number, end bracket
  // Example: (-50, -45]
  const regex = /^([(\[])\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*([)\]])$/;
  const match = cleanStr.match(regex);

  if (!match) {
    console.warn(`Invalid interval format encountered: ${intervalStr}`);
    return false;
  }

  const [, startBracket, startValStr, endValStr, endBracket] = match;
  
  const startVal = parseFloat(startValStr);
  const endVal = parseFloat(endValStr);

  if (isNaN(startVal) || isNaN(endVal)) return false;

  let isGreaterThanStart = false;
  let isLessThanEnd = false;

  // Check lower bound
  if (startBracket === '(') {
    isGreaterThanStart = value > startVal;
  } else if (startBracket === '[') {
    isGreaterThanStart = value >= startVal;
  }

  // Check upper bound
  if (endBracket === ')') {
    isLessThanEnd = value < endVal;
  } else if (endBracket === ']') {
    isLessThanEnd = value <= endVal;
  }

  return isGreaterThanStart && isLessThanEnd;
};
