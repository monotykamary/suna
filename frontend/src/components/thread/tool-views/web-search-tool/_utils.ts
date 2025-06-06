import { extractToolData, extractSearchQuery, extractSearchResults } from '../utils';

export interface WebSearchData {
  query: string | null;
  results: Array<{ title: string; url: string; snippet?: string }>;
  answer: string | null;
  images: string[];
  success?: boolean;
  timestamp?: string;
}

const parseContent = (content: any): any => {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content; 
    }
  }
  return content;
};

const extractFromNewFormat = (content: any): WebSearchData => {
  const parsedContent = parseContent(content);
  
  if (!parsedContent || typeof parsedContent !== 'object') {
    return { query: null, results: [], answer: null, images: [], success: undefined, timestamp: undefined };
  }

  if ('tool_execution' in parsedContent && typeof parsedContent.tool_execution === 'object') {
    const toolExecution = parsedContent.tool_execution;
    const args = toolExecution.arguments || {};
    
    let parsedOutput = toolExecution.result?.output;
    if (typeof parsedOutput === 'string') {
      try {
        parsedOutput = JSON.parse(parsedOutput);
      } catch (e) {
      }
    }
    parsedOutput = parsedOutput || {};

    const extractedData = {
      query: args.query || parsedOutput?.query || null,
      results: parsedOutput?.results?.map((result: any) => ({
        title: result.title || '',
        url: result.url || '',
        snippet: result.content || result.snippet || ''
      })) || [],
      answer: parsedOutput?.answer || null,
      images: parsedOutput?.images || [],
      success: toolExecution.result?.success,
      timestamp: toolExecution.execution_details?.timestamp
    };
    return extractedData;
  }

  if ('role' in parsedContent && 'content' in parsedContent) {
    return extractFromNewFormat(parsedContent.content);
  }

  return { query: null, results: [], answer: null, images: [], success: undefined, timestamp: undefined };
};


const extractFromLegacyFormat = (content: any): Omit<WebSearchData, 'success' | 'timestamp'> => {
  const toolData = extractToolData(content);
  
  if (toolData.toolResult) {
    const args = toolData.arguments || {};
    
    console.log('WebSearchToolView: Extracted from legacy format (extractToolData):', {
      query: toolData.query || args.query,
      resultsCount: 0 
    });
    
    return {
      query: toolData.query || args.query || null,
      results: [], 
      answer: null,
      images: []
    };
  }

  const legacyQuery = extractSearchQuery(content);
  
  console.log('WebSearchToolView: Extracted from legacy format (fallback):', {
    query: legacyQuery,
    resultsCount: 0 
  });
  
  return {
    query: legacyQuery,
    results: [],
    answer: null,
    images: []
  };
};

export function extractWebSearchData(
  assistantContent: any,
  toolContent: any,
  isSuccess: boolean,
  toolTimestamp?: string,
  assistantTimestamp?: string
): {
  query: string | null;
  searchResults: Array<{ title: string; url: string; snippet?: string }>;
  answer: string | null;
  images: string[];
  actualIsSuccess: boolean;
  actualToolTimestamp?: string;
  actualAssistantTimestamp?: string;
} {
  let query: string | null = null;
  let searchResults: Array<{ title: string; url: string; snippet?: string }> = [];
  let answer: string | null = null;
  let images: string[] = [];
  let actualIsSuccess = isSuccess;
  let actualToolTimestamp = toolTimestamp;
  let actualAssistantTimestamp = assistantTimestamp;

  const assistantNewFormat = extractFromNewFormat(assistantContent);
  const toolNewFormat = extractFromNewFormat(toolContent);

  console.log('WebSearchToolView: Format detection results:', {
    assistantNewFormat: {
      hasQuery: !!assistantNewFormat.query,
      resultsCount: assistantNewFormat.results.length,
      hasAnswer: !!assistantNewFormat.answer,
      imagesCount: assistantNewFormat.images.length
    },
    toolNewFormat: {
      hasQuery: !!toolNewFormat.query,
      resultsCount: toolNewFormat.results.length,
      hasAnswer: !!toolNewFormat.answer,
      imagesCount: toolNewFormat.images.length
    }
  });

  if (assistantNewFormat.query || assistantNewFormat.results.length > 0) {
    query = assistantNewFormat.query;
    searchResults = assistantNewFormat.results;
    answer = assistantNewFormat.answer;
    images = assistantNewFormat.images;
    if (assistantNewFormat.success !== undefined) {
      actualIsSuccess = assistantNewFormat.success;
    }
    if (assistantNewFormat.timestamp) {
      actualAssistantTimestamp = assistantNewFormat.timestamp;
    }
    console.log('WebSearchToolView: Using assistant new format data');
  } else if (toolNewFormat.query || toolNewFormat.results.length > 0) {
    query = toolNewFormat.query;
    searchResults = toolNewFormat.results;
    answer = toolNewFormat.answer;
    images = toolNewFormat.images;
    if (toolNewFormat.success !== undefined) {
      actualIsSuccess = toolNewFormat.success;
    }
    if (toolNewFormat.timestamp) {
      actualToolTimestamp = toolNewFormat.timestamp;
    }
    console.log('WebSearchToolView: Using tool new format data');
  } else {
    const assistantLegacy = extractFromLegacyFormat(assistantContent);
    const toolLegacy = extractFromLegacyFormat(toolContent);

    query = assistantLegacy.query || toolLegacy.query;
    
    const legacyResults = extractSearchResults(toolContent);
    searchResults = legacyResults;
    
    console.log('WebSearchToolView: Using legacy format data:', {
      query,
      legacyResultsCount: legacyResults.length,
      firstLegacyResult: legacyResults[0]
    });
    
    if (toolContent) {
      try {
        let parsedContent;
        if (typeof toolContent === 'string') {
          parsedContent = JSON.parse(toolContent);
        } else if (typeof toolContent === 'object' && toolContent !== null) {
          parsedContent = toolContent;
        } else {
          parsedContent = {};
        }

        if (parsedContent.answer && typeof parsedContent.answer === 'string') {
          answer = parsedContent.answer;
        }
        if (parsedContent.images && Array.isArray(parsedContent.images)) {
          images = parsedContent.images;
        }
      } catch (e) {
      }
    }
  }

  if (!query) {
    query = extractSearchQuery(assistantContent) || extractSearchQuery(toolContent);
  }
  
  if (searchResults.length === 0) {
    const fallbackResults = extractSearchResults(toolContent);
    searchResults = fallbackResults;
    console.log('WebSearchToolView: Fallback extraction results:', fallbackResults.length);
  }

  console.log('WebSearchToolView: Final extracted data:', {
    query,
    searchResultsCount: searchResults.length,
    hasAnswer: !!answer,
    imagesCount: images.length,
    actualIsSuccess,
    firstResult: searchResults[0]
  });

  return {
    query,
    searchResults,
    answer,
    images,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  };
} 