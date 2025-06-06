'use client';

import { useState, useEffect } from 'react';
import { useZoteroData } from '@/lib/hooks/useZoteroData';
import { Header } from '@/components/layout/Header';
import { BreadcrumbNav } from '@/components/layout/BreadcrumbNav';
import { StatusBanner } from '@/components/layout/StatusBanner';
import { VennDiagram } from '@/components/visualization/VennDiagram';
import { BubbleChart } from '@/components/visualization/BubbleChart';
import { StatsPanel } from '@/components/panels/StatsPanel';
import { ArticleList } from '@/components/panels/ArticleList';
import { ArticleModal } from '@/components/panels/ArticleModal';
import { HierarchyPanel } from '@/components/panels/HierarchyPanel';
import { Button } from '@/components/ui/button';

export default function Home() {
  // Data loading
  const { data, status, error } = useZoteroData();
  
  // UI state
  const [currentView, setCurrentView] = useState<'overview' | 'section' | 'collection'>('overview');
  const [currentSelection, setCurrentSelection] = useState<'portal' | 'search' | 'overlap'>('portal');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{title: string, path: string}[]>([{title: 'Home', path: '/'}]);
  const [navigationHistory, setNavigationHistory] = useState<{view: 'overview' | 'section' | 'collection', selection: 'portal' | 'search' | 'overlap', path?: string}[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  
  // Handle article selection
  const handleArticleClick = (article: any) => {
    setSelectedArticle(article);
    setIsArticleModalOpen(true);
  };

  // Handle navigation
  const handleNavigation = (view: 'overview' | 'section' | 'collection', selection: 'portal' | 'search' | 'overlap', path?: string) => {
    // Save current state to history
    setNavigationHistory(prev => [...prev, {view: currentView, selection: currentSelection, path: selectedCollectionId || undefined}]);
    
    setCurrentView(view);
    setCurrentSelection(selection);
    setSelectedCollectionId(path || null);
    
    // Update breadcrumbs
    const newBreadcrumbs = [{title: 'Home', path: '/'}];
    if (view === 'section') {
      newBreadcrumbs.push({title: selection === 'portal' ? 'Portal' : selection === 'search' ? 'Search' : 'Overlap', path: `/${selection}`});
    } else if (view === 'collection' && path) {
      const pathParts = path.split('/');
      let currentPath = '';
      pathParts.forEach((part, index) => {
        if (part) {
          currentPath += `/${part}`;
          newBreadcrumbs.push({title: part, path: currentPath});
        }
      });
    }
    setBreadcrumbs(newBreadcrumbs);
  };

  // Handle going back in navigation
  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const prevState = navigationHistory[navigationHistory.length - 1];
      setCurrentView(prevState.view);
      setCurrentSelection(prevState.selection);
      setSelectedCollectionId(prevState.path || null);
      
      // Update breadcrumbs
      const newBreadcrumbs = [{title: 'Home', path: '/'}];
      if (prevState.view === 'section') {
        newBreadcrumbs.push({title: prevState.selection === 'portal' ? 'Portal' : prevState.selection === 'search' ? 'Search' : 'Overlap', path: `/${prevState.selection}`});
      } else if (prevState.view === 'collection' && prevState.path) {
        const pathParts = prevState.path.split('/');
        let currentPath = '';
        pathParts.forEach((part, index) => {
          if (part) {
            currentPath += `/${part}`;
            newBreadcrumbs.push({title: part, path: currentPath});
          }
        });
      }
      setBreadcrumbs(newBreadcrumbs);
      
      // Remove the last item from history
      setNavigationHistory(prev => prev.slice(0, -1));
    }
  };

  // Get current articles based on selection
  const getCurrentArticles = () => {
    if (!data) return [];
    
    switch (currentSelection) {
      case 'portal':
        return data.articles.portal_only.map(article => ({
          ...article,
          source: 'portal' as const
        }));
      case 'search':
        return data.articles.search_only.map(article => ({
          ...article,
          source: 'search' as const
        }));
      case 'overlap':
        return data.articles.overlap.map(article => ({
          ...article,
          source: 'both' as const
        }));
      default:
        return [];
    }
  };

  // Transform hierarchy data to match HierarchyPanel component expectations
  const transformHierarchy = () => {
    if (!data || !data.hierarchy) return [];
    
    // Filter hierarchy based on current selection
    let filteredHierarchy = Object.values(data.hierarchy).filter(item => {
      if (currentSelection === 'portal') {
        return item.source === 'portal' || item.source === 'both';
      } else if (currentSelection === 'search') {
        return item.source === 'search' || item.source === 'both';
      } else {
        return item.source === 'both';
      }
    });
    
    // If we have a selected collection, filter to only show its children
    if (currentView === 'collection' && selectedCollectionId) {
      filteredHierarchy = filteredHierarchy.filter(item => {
        // Include the selected collection and its direct children
        return item.id === selectedCollectionId || 
               item.parent_id === selectedCollectionId;
      });
    }
    
    return filteredHierarchy.map(item => ({
      id: item.id,
      name: item.title,
      level: item.depth,
      parent_id: item.parent_id,
      article_count: item.articles.length,
    }));
  };

  // Check if a collection has hierarchy
  const hasHierarchy = (selection: 'portal' | 'search' | 'overlap') => {
    if (!data || !data.hierarchy) return false;
    
    // Check if there are any hierarchy items for this selection
    const hasItems = Object.values(data.hierarchy).some(item => {
      if (selection === 'portal') {
        return (item.source === 'portal' || item.source === 'both') && item.articles.length > 0;
      } else if (selection === 'search') {
        return (item.source === 'search' || item.source === 'both') && item.articles.length > 0;
      } else {
        return item.source === 'both' && item.articles.length > 0;
      }
    });
    
    return hasItems;
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-4">
        {/* Status Banner */}
        {status === 'loading' && (
          <StatusBanner 
            status="loading"
            message="Loading Zotero data..."
          />
        )}
        
        {status === 'error' && (
          <StatusBanner 
            status="error"
            message={`Error loading data: ${error || 'Unknown error'}`}
          />
        )}
        
        {/* Navigation */}
        <div className="flex justify-between items-center mb-4">
          <BreadcrumbNav 
            currentView={currentView}
            currentSelection={currentSelection}
            currentCollection={selectedCollectionId}
            onNavigate={(view, selection, collection) => {
              if (view === 'overview') {
                handleNavigation('overview', 'portal');
              } else if (view === 'section') {
                handleNavigation('section', selection || 'portal');
              } else if (view === 'collection' && collection) {
                handleNavigation('collection', currentSelection, collection);
              }
            }}
          />
          
          {navigationHistory.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGoBack}
              className="flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
          )}
        </div>
        
        {/* Main Content */}
        {status === 'success' && data && (
          <div className="mt-4">
            {/* Stats Panel - Full Width */}
            <div className="mb-6">
              <StatsPanel 
                data={data}
                view={currentView}
                selection={currentSelection}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left and Center Content */}
              <div className="md:col-span-2 space-y-6">
                {/* Visualization Section */}
                <div className="bg-white rounded-lg shadow-sm p-4 transition-all duration-500 transition-view">
                  {currentView === 'overview' && (
                    <div className="fade-enter-active">
                      <VennDiagram 
                        portalCount={data.statistics.portal_only}
                        searchCount={data.statistics.search_only}
                        overlapCount={data.statistics.overlap}
                        onSelect={(selection) => {
                          setCurrentSelection(selection);
                          
                          // If the section has a hierarchy, navigate to bubble chart
                          if (hasHierarchy(selection)) {
                            handleNavigation('section', selection);
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  {(currentView === 'section' || currentView === 'collection') && (
                    <div className="fade-enter-active">
                      <BubbleChart 
                        data={data.collections[currentSelection === 'overlap' ? 'portal' : currentSelection].map(collection => ({
                          name: collection.name,
                          value: collection.count,
                          id: collection.path
                        }))}
                        onBubbleClick={(id) => {
                          handleNavigation('collection', currentSelection, id);
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Hierarchy Panel */}
                <div>
                  <HierarchyPanel 
                    hierarchy={transformHierarchy()}
                    onCollectionClick={(collection) => {
                      if (collection) {
                        handleNavigation('collection', currentSelection, collection.id);
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Right Panel - Articles */}
              <div className="md:col-span-1">
                <ArticleList 
                  articles={getCurrentArticles()}
                  onArticleClick={handleArticleClick}
                  title={`${currentSelection === 'portal' ? 'Portal' : currentSelection === 'search' ? 'Search' : 'Overlap'} Articles`}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Fallback content when data is not available */}
        {status !== 'loading' && (!data || status === 'error') && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Using Demo Data</h2>
            <p className="text-gray-600 mb-6">We're currently using demo data as we couldn't load the actual Zotero data.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Demo content would be similar to the real content structure */}
              {/* Left Panel */}
              <div className="md:col-span-1">
                <HierarchyPanel 
                  hierarchy={data?.hierarchy ? transformHierarchy() : []}
                  onCollectionClick={() => {}}
                />
              </div>
              
              {/* Center Panel */}
              <div className="md:col-span-1">
                <div className="space-y-6">
                  <VennDiagram 
                    portalCount={data?.statistics.portal_only || 0}
                    searchCount={data?.statistics.search_only || 0}
                    overlapCount={data?.statistics.overlap || 0}
                    onSelect={(selection) => {
                      setCurrentSelection(selection);
                    }}
                  />
                  <StatsPanel 
                    data={data || createFallbackData()}
                    view={currentView}
                    selection={currentSelection}
                  />
                </div>
              </div>
              
              {/* Right Panel */}
              <div className="md:col-span-1">
                <ArticleList 
                  articles={getCurrentArticles()}
                  onArticleClick={handleArticleClick}
                  title="Demo Articles"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Article Modal */}
      <ArticleModal 
        article={selectedArticle}
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
      />
    </main>
  );
}

// Helper function to create fallback data if needed
function createFallbackData() {
  return {
    statistics: {
      portal_total: 1677,
      search_total: 765,
      overlap: 689,
      portal_only: 988,
      search_only: 76
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
}
