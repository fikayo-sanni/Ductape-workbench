/** Extract {{key}} and :key placeholders from a URL (mirrors sdk/ts extractBaseUrlVariables). */
export const extractBaseUrlVariables = (url: string): string[] => {
  if (!url || typeof url !== 'string') return [];
  const doubleBraces = [...url.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((m) => m[1]);
  const pathParams = [...url.matchAll(/:([a-zA-Z0-9_]+)(?=\/|$)/g)].map((m) => m[1]);
  return [...new Set([...doubleBraces, ...pathParams])];
};
