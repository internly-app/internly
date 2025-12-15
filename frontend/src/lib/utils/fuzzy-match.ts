/**
 * Simple fuzzy matching utility for search
 * Returns a score between 0 and 1 indicating how well the query matches the text
 * Higher score = better match
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if query matches text with fuzzy matching
 * Returns a score between 0 and 1 (1 = perfect match, 0 = no match)
 */
export function fuzzyMatch(query: string, text: string): number {
  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase().trim();

  // Exact match
  if (textLower === queryLower) {
    return 1.0;
  }

  // Exact substring match
  if (textLower.includes(queryLower)) {
    return 0.9;
  }

  // Check if all query words are present (in any order)
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const textWords = textLower.split(/\s+/).filter(w => w.length > 0);
  
  const allWordsPresent = queryWords.every(qWord => 
    textWords.some(tWord => tWord.includes(qWord))
  );

  if (allWordsPresent) {
    return 0.8;
  }

  // Fuzzy match using Levenshtein distance
  // Only use fuzzy matching for shorter queries (to avoid false positives)
  if (queryLower.length <= 20) {
    const distance = levenshteinDistance(queryLower, textLower);
    const maxLength = Math.max(queryLower.length, textLower.length);
    const similarity = 1 - (distance / maxLength);
    
    // Only return fuzzy matches above 0.6 threshold
    if (similarity >= 0.6) {
      return similarity * 0.7; // Scale down fuzzy matches
    }
  }

  // Check individual word fuzzy matches
  let bestWordMatch = 0;
  for (const qWord of queryWords) {
    if (qWord.length < 3) continue; // Skip very short words
    
    for (const tWord of textWords) {
      if (tWord.length < 3) continue;
      
      const wordDistance = levenshteinDistance(qWord, tWord);
      const wordSimilarity = 1 - (wordDistance / Math.max(qWord.length, tWord.length));
      
      if (wordSimilarity >= 0.7) {
        bestWordMatch = Math.max(bestWordMatch, wordSimilarity * 0.6);
      }
    }
  }

  return bestWordMatch;
}

/**
 * Check if query matches any part of the searchable text array
 * Returns the best match score
 */
export function fuzzyMatchMultiple(query: string, searchableTexts: string[]): number {
  if (searchableTexts.length === 0) return 0;
  
  return Math.max(...searchableTexts.map(text => fuzzyMatch(query, text)));
}

