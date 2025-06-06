import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Article {
  title: string;
  normalized_title: string;
  authors: string;
  year: string;
  journal: string;
  doi?: string;
  url?: string;
  abstract?: string;
  source: 'portal' | 'search' | 'both';
  collections?: string[];
  portal_collections?: string;
  search_collections?: string;
  is_overlap?: boolean;
  type?: string;
  library?: string;
}

interface ArticleListProps {
  articles: Article[];
  onArticleClick: (article: Article) => void;
  title?: string;
  showSource?: boolean;
}

export function ArticleList({ articles, onArticleClick, title = 'Articles', showSource = true }: ArticleListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter articles based on search term
  const filteredArticles = articles.filter(article => {
    const searchLower = searchTerm.toLowerCase();
    return (
      article.title.toLowerCase().includes(searchLower) ||
      article.authors.toLowerCase().includes(searchLower) ||
      (article.journal ? article.journal.toLowerCase().includes(searchLower) : false) ||
      (article.abstract && article.abstract.toLowerCase().includes(searchLower))
    );
  });

  // Get source badge color
  const getSourceBadge = (source: 'portal' | 'search' | 'both') => {
    switch (source) {
      case 'portal':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Portal</Badge>;
      case 'search':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Search</Badge>;
      case 'both':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">Both</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {title} ({filteredArticles.length})
        </h3>
      </div>
      
      <Input
        type="text"
        placeholder="Search articles..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      
      <Separator />
      
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article, index) => (
            <Card 
              key={article.normalized_title || index} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onArticleClick(article)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-medium text-gray-800">
                    {article.title}
                  </CardTitle>
                  {showSource && getSourceBadge(article.source)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{article.authors}</p>
                  <p className="text-gray-500">
                    {article.journal} ({article.year})
                  </p>
                  {article.collections && article.collections.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {article.collections.map((collection, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {collection}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No articles found</p>
            {searchTerm && (
              <p className="text-sm mt-1">
                Try adjusting your search criteria
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}