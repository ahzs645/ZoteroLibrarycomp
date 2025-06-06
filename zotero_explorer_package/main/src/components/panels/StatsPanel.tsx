import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-indigo-100 p-1.5 text-indigo-600">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

interface StatsPanelProps {
  data: {
    statistics: {
      portal_total: number;
      search_total: number;
      overlap: number;
      portal_only: number;
      search_only: number;
    };
    collections: {
      portal: any[];
      search: any[];
    };
  };
  view: 'overview' | 'section' | 'collection';
  selection: 'portal' | 'search' | 'overlap';
}

export function StatsPanel({ data, view, selection }: StatsPanelProps) {
  // Icons
  const documentIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const folderIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );

  const overlapIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  );

  const percentIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  // Calculate total articles
  const totalArticles = data.statistics.portal_total + data.statistics.search_total - data.statistics.overlap;
  
  // Calculate total collections
  const totalCollections = data.collections.portal.length + data.collections.search.length;
  
  // Calculate average articles per collection
  const avgArticlesPerCollection = totalCollections > 0 
    ? Math.round((totalArticles / totalCollections) * 10) / 10 
    : 0;

  // Calculate overlap percentage
  const overlapPercentage = Math.round((data.statistics.overlap / totalArticles) * 100);

  // Render different stats based on view and selection
  if (view === 'overview') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              title="Total Articles" 
              value={totalArticles} 
              icon={documentIcon} 
            />
            <StatCard 
              title="Total Collections" 
              value={totalCollections} 
              icon={folderIcon} 
            />
            <StatCard 
              title="Overlap" 
              value={data.statistics.overlap} 
              icon={overlapIcon} 
              description={`${overlapPercentage}% of total articles`}
            />
            <StatCard 
              title="Avg. Articles/Collection" 
              value={avgArticlesPerCollection} 
              icon={percentIcon} 
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (view === 'section') {
    if (selection === 'portal') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Portal Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                title="Total Articles" 
                value={data.statistics.portal_total} 
                icon={documentIcon} 
              />
              <StatCard 
                title="Collections" 
                value={data.collections.portal.length} 
                icon={folderIcon} 
              />
              <StatCard 
                title="Unique Articles" 
                value={data.statistics.portal_only} 
                icon={documentIcon} 
                description={`${Math.round((data.statistics.portal_only / data.statistics.portal_total) * 100)}% of portal articles`}
              />
              <StatCard 
                title="Overlap with Search" 
                value={data.statistics.overlap} 
                icon={overlapIcon} 
                description={`${Math.round((data.statistics.overlap / data.statistics.portal_total) * 100)}% of portal articles`}
              />
            </div>
          </CardContent>
        </Card>
      );
    } else if (selection === 'search') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Search Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                title="Total Articles" 
                value={data.statistics.search_total} 
                icon={documentIcon} 
              />
              <StatCard 
                title="Collections" 
                value={data.collections.search.length} 
                icon={folderIcon} 
              />
              <StatCard 
                title="Unique Articles" 
                value={data.statistics.search_only} 
                icon={documentIcon} 
                description={`${Math.round((data.statistics.search_only / data.statistics.search_total) * 100)}% of search articles`}
              />
              <StatCard 
                title="Overlap with Portal" 
                value={data.statistics.overlap} 
                icon={overlapIcon} 
                description={`${Math.round((data.statistics.overlap / data.statistics.search_total) * 100)}% of search articles`}
              />
            </div>
          </CardContent>
        </Card>
      );
    } else if (selection === 'overlap') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Overlap Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                title="Overlap Articles" 
                value={data.statistics.overlap} 
                icon={overlapIcon} 
              />
              <StatCard 
                title="% of Portal" 
                value={`${Math.round((data.statistics.overlap / data.statistics.portal_total) * 100)}%`} 
                icon={percentIcon} 
              />
              <StatCard 
                title="% of Search" 
                value={`${Math.round((data.statistics.overlap / data.statistics.search_total) * 100)}%`} 
                icon={percentIcon} 
              />
              <StatCard 
                title="% of Total" 
                value={`${overlapPercentage}%`} 
                icon={percentIcon} 
              />
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // Default view for collection or fallback
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatCard 
            title="Total Articles" 
            value={totalArticles} 
            icon={documentIcon} 
          />
          <StatCard 
            title="Collections" 
            value={totalCollections} 
            icon={folderIcon} 
          />
        </div>
      </CardContent>
    </Card>
  );
}