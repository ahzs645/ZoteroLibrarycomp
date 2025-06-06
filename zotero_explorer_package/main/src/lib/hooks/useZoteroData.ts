import { useState, useEffect } from 'react';

// Define types for our data structures
interface AnalysisResults {
  portal_total: number;
  search_total: number;
  overlap: number;
  portal_only: number;
  search_only: number;
}

interface Article {
  title: string;
  normalized_title: string;
  portal_collections: string;
  search_collections: string;
  is_overlap: boolean;
  authors?: string;
  year?: string;
  type?: string;
  journal?: string;
  library?: string;
}

interface Collection {
  id: string;
  name: string;
  path: string;
  count: number;
  overlap: number;
  percentage: number;
  depth: number;
  library: string;
}

interface HierarchyItem {
  id: string;
  title: string;
  path: string;
  depth: number;
  parent_id: string | null;
  parent_path: string;
  children: string[];
  articles: string[];
}

interface ProcessedData {
  statistics: AnalysisResults;
  articles: {
    portal_only: Article[];
    search_only: Article[];
    overlap: Article[];
  };
  collections: {
    portal: Collection[];
    search: Collection[];
  };
  hierarchy: Record<string, HierarchyItem>;
}

interface RawData {
  analysisResults: AnalysisResults | null;
  websiteHierarchy: any[];
  collectionAnalysis: any[];
  titleCollections: any[];
  matchedRecords: any[];
}

type DataStatus = 'idle' | 'loading' | 'success' | 'error';

export function useZoteroData() {
  const [status, setStatus] = useState<DataStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProcessedData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setStatus('loading');
        setError(null);

        // Check if we're running from file:// protocol
        if (window.location.protocol === 'file:') {
          throw new Error('Cannot load data from file:// protocol. Please serve from a web server.');
        }

        // Load all data files
        const rawData: RawData = {
          analysisResults: null,
          websiteHierarchy: [],
          collectionAnalysis: [],
          titleCollections: [],
          matchedRecords: []
        };

        // Load JSON data
        const analysisResponse = await fetch('/data/analysis_results.json');
        if (!analysisResponse.ok) throw new Error(`Failed to load analysis_results.json`);
        rawData.analysisResults = await analysisResponse.json();

        // Load CSV data
        const websiteHierarchyResponse = await fetch('/data/website_hierarchy.csv');
        if (!websiteHierarchyResponse.ok) throw new Error(`Failed to load website_hierarchy.csv`);
        rawData.websiteHierarchy = parseCSV(await websiteHierarchyResponse.text());

        const collectionAnalysisResponse = await fetch('/data/collection_analysis.csv');
        if (!collectionAnalysisResponse.ok) throw new Error(`Failed to load collection_analysis.csv`);
        rawData.collectionAnalysis = parseCSV(await collectionAnalysisResponse.text());

        const titleCollectionsResponse = await fetch('/data/title_collections.csv');
        if (!titleCollectionsResponse.ok) throw new Error(`Failed to load title_collections.csv`);
        rawData.titleCollections = parseCSV(await titleCollectionsResponse.text());

        const matchedRecordsResponse = await fetch('/data/matched_records.csv');
        if (!matchedRecordsResponse.ok) throw new Error(`Failed to load matched_records.csv`);
        rawData.matchedRecords = parseCSV(await matchedRecordsResponse.text());

        // Process the data
        const processedData = processData(rawData);
        setData(processedData);
        setStatus('success');
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
        
        // Create fallback data if needed
        setData(createFallbackData());
      }
    };

    loadData();
  }, []);

  return { data, status, error };
}

// Helper function to parse CSV
function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

// Helper function to parse CSV line with quotes
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

// Process the raw data into our application structure
function processData(rawData: RawData): ProcessedData {
  const processedData: ProcessedData = {
    statistics: rawData.analysisResults || {
      portal_total: 0,
      search_total: 0,
      overlap: 0,
      portal_only: 0,
      search_only: 0
    },
    articles: {
      portal_only: [],
      search_only: [],
      overlap: []
    },
    collections: {
      portal: [],
      search: []
    },
    hierarchy: {}
  };

  // Process articles
  rawData.titleCollections.forEach(row => {
    if (!row.title) return;

    const article: Article = {
      title: row.title,
      normalized_title: row.normalized_title,
      portal_collections: row.portal_collections || '',
      search_collections: row.search_collections || '',
      is_overlap: row.is_overlap === 'True' || row.is_overlap === true
    };

    // Find additional details from matched records
    const matchedRecord = rawData.matchedRecords.find(r => 
      r.normalized_title === row.normalized_title || r.title === row.title
    );

    if (matchedRecord) {
      article.authors = matchedRecord.authors || 'Unknown';
      article.year = matchedRecord.year || 'Unknown';
      article.type = matchedRecord.type || 'Article';
      article.journal = matchedRecord.journal || '';
      article.library = matchedRecord.library || '';
    } else {
      article.authors = 'Unknown';
      article.year = 'Unknown';
      article.type = 'Article';
      article.library = '';
    }

    // Categorize article
    if (article.is_overlap) {
      processedData.articles.overlap.push(article);
    } else if (article.portal_collections && !article.search_collections) {
      processedData.articles.portal_only.push(article);
    } else if (!article.portal_collections && article.search_collections) {
      processedData.articles.search_only.push(article);
    }
  });

  // Process collection hierarchy
  rawData.websiteHierarchy.forEach(row => {
    const collection: HierarchyItem = {
      id: row.collection_id,
      title: row.title,
      path: row.path,
      depth: parseInt(row.depth) || 0,
      parent_id: row.parent_id || null,
      parent_path: row.parent_path || '',
      children: [],
      articles: []
    };

    // Find articles in this collection
    rawData.titleCollections.forEach(titleRow => {
      if (titleRow.portal_collections && titleRow.portal_collections.includes(collection.title) ||
          titleRow.search_collections && titleRow.search_collections.includes(collection.title)) {
        collection.articles.push(titleRow.title);
      }
    });

    processedData.hierarchy[collection.id] = collection;
  });

  // Build parent-child relationships
  Object.values(processedData.hierarchy).forEach(collection => {
    if (collection.parent_id && processedData.hierarchy[collection.parent_id]) {
      processedData.hierarchy[collection.parent_id].children.push(collection.id);
    }
  });

  // Process collections
  rawData.collectionAnalysis.forEach(row => {
    const collection: Collection = {
      id: row.collection_path ? row.collection_path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : '',
      name: row.collection_title,
      path: row.collection_path,
      count: parseInt(row.total_items) || 0,
      overlap: parseInt(row.overlap_items) || 0,
      percentage: parseFloat(row.overlap_percentage) || 0,
      depth: parseInt(row.collection_depth) || 0,
      library: row.library
    };

    if (collection.library === 'Portal') {
      processedData.collections.portal.push(collection);
    } else if (collection.library === 'Search') {
      processedData.collections.search.push(collection);
    }
  });

  return processedData;
}

// Create fallback data for demo purposes
function createFallbackData(): ProcessedData {
  console.log('Creating fallback data for demo purposes');
  return {
    statistics: {
      portal_total: 1677,
      search_total: 765,
      overlap: 689,
      portal_only: 988,
      search_only: 76
    },
    articles: {
      portal_only: [
        {title: "Climate Change Impact on Water Resources in Northern BC", authors: "Smith, J.; Johnson, A.", year: "2020", type: "Journal Article", portal_collections: "Environmental Studies", search_collections: "", is_overlap: false, normalized_title: "climate change impact on water resources in northern bc"},
        {title: "Sustainable Agriculture Practices in Sub-Boreal Ecosystems", authors: "Brown, R.; Davis, M.", year: "2019", type: "Journal Article", portal_collections: "Agriculture Research", search_collections: "", is_overlap: false, normalized_title: "sustainable agriculture practices in sub-boreal ecosystems"},
        {title: "Indigenous Water Management Practices in Northern Territories", authors: "Cardinal, M.; Bear, J.", year: "2021", type: "Book Chapter", portal_collections: "Indigenous Knowledge", search_collections: "", is_overlap: false, normalized_title: "indigenous water management practices in northern territories"},
        {title: "Hydrological Modeling Techniques for Northern Watersheds", authors: "Thompson, K.; Lee, S.", year: "2020", type: "Journal Article", portal_collections: "Hydrology", search_collections: "", is_overlap: false, normalized_title: "hydrological modeling techniques for northern watersheds"},
        {title: "Forest Fire Management in Boreal Ecosystems", authors: "Wilson, T.; Miller, S.", year: "2018", type: "Report", portal_collections: "Forest Management", search_collections: "", is_overlap: false, normalized_title: "forest fire management in boreal ecosystems"}
      ],
      search_only: [
        {title: "Advanced Research Methodologies in Environmental Science", authors: "Garcia, C.; Martinez, L.", year: "2020", type: "Journal Article", portal_collections: "", search_collections: "Research Methods", is_overlap: false, normalized_title: "advanced research methodologies in environmental science"},
        {title: "Collaborative Research Models for Northern Communities", authors: "Johnson, R.; White, S.", year: "2021", type: "Book", portal_collections: "", search_collections: "Research Collaboration", is_overlap: false, normalized_title: "collaborative research models for northern communities"},
        {title: "Data Analysis Techniques for Environmental Studies", authors: "Chen, X.; Williams, D.", year: "2019", type: "Journal Article", portal_collections: "", search_collections: "Data Analysis", is_overlap: false, normalized_title: "data analysis techniques for environmental studies"}
      ],
      overlap: [
        {title: "The Effect of Variable-Retention Riparian Buffer Zones on Water Temperature", authors: "Robinson, F.; White, G.", year: "2020", type: "Journal Article", portal_collections: "Water Management", search_collections: "Environmental Studies", is_overlap: true, normalized_title: "the effect of variable-retention riparian buffer zones on water temperature"},
        {title: "Hydrological Modeling of the Nechako Basin Using Advanced Techniques", authors: "Harris, J.; Clark, R.", year: "2021", type: "Journal Article", portal_collections: "Nechako Studies", search_collections: "Modeling", is_overlap: true, normalized_title: "hydrological modeling of the nechako basin using advanced techniques"},
        {title: "Fisheries Management in Northern British Columbia", authors: "Lewis, M.; Walker, B.", year: "2019", type: "Journal Article", portal_collections: "Fisheries", search_collections: "Wildlife Management", is_overlap: true, normalized_title: "fisheries management in northern british columbia"},
        {title: "Climate Change Adaptation Strategies for Northern Communities", authors: "Young, S.; King, D.", year: "2022", type: "Report", portal_collections: "Climate Studies", search_collections: "Adaptation Research", is_overlap: true, normalized_title: "climate change adaptation strategies for northern communities"}
      ]
    },
    collections: {
      portal: [
        {id: "environmental-studies", name: "Environmental Studies", count: 245, overlap: 89, percentage: 36.3, depth: 0, library: "Portal", path: "Environmental Studies"},
        {id: "nechako-watershed-studies", name: "Nechako Watershed Studies", count: 189, overlap: 67, percentage: 35.4, depth: 0, library: "Portal", path: "Nechako Watershed Studies"},
        {id: "indigenous-knowledge", name: "Indigenous Knowledge", count: 156, overlap: 34, percentage: 21.8, depth: 1, library: "Portal", path: "Indigenous Knowledge"},
        {id: "water-management", name: "Water Management", count: 134, overlap: 78, percentage: 58.2, depth: 1, library: "Portal", path: "Water Management"},
        {id: "climate-research", name: "Climate Research", count: 123, overlap: 45, percentage: 36.6, depth: 0, library: "Portal", path: "Climate Research"}
      ],
      search: [
        {id: "research-methodologies", name: "Research Methodologies", count: 178, overlap: 67, percentage: 37.6, depth: 0, library: "Search", path: "Research Methodologies"},
        {id: "environmental-studies", name: "Environmental Studies", count: 145, overlap: 89, percentage: 61.4, depth: 0, library: "Search", path: "Environmental Studies"},
        {id: "data-analysis", name: "Data Analysis", count: 98, overlap: 23, percentage: 23.5, depth: 1, library: "Search", path: "Data Analysis"},
        {id: "wildlife-management", name: "Wildlife Management", count: 87, overlap: 34, percentage: 39.1, depth: 1, library: "Search", path: "Wildlife Management"}
      ]
    },
    hierarchy: {}
  };
}