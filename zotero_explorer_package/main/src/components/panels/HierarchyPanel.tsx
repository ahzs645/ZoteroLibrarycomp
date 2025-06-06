import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface HierarchyItem {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  article_count: number;
  children?: HierarchyItem[];
}

interface HierarchyPanelProps {
  hierarchy: HierarchyItem[];
  onCollectionClick: (collection: HierarchyItem) => void;
}

export function HierarchyPanel({ hierarchy, onCollectionClick }: HierarchyPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Build a tree structure from the flat hierarchy
  const buildTree = (items: HierarchyItem[]): HierarchyItem[] => {
    // Filter out items with 0 articles
    const filteredItems = items.filter(item => item.article_count > 0);
    
    const itemMap: Record<string, HierarchyItem> = {};
    const rootItems: HierarchyItem[] = [];

    // First pass: create a map of all items
    filteredItems.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });

    // Second pass: build the tree structure
    filteredItems.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        if (!itemMap[item.parent_id].children) {
          itemMap[item.parent_id].children = [];
        }
        itemMap[item.parent_id].children!.push(itemMap[item.id]);
      } else {
        rootItems.push(itemMap[item.id]);
      }
    });

    return rootItems;
  };

  const treeData = buildTree(hierarchy);

  // Toggle expanded state for an item
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Render a single hierarchy item
  const renderItem = (item: HierarchyItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.id] || false;

    return (
      <div key={item.id} className="mb-1">
        <div
          className={`flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors ${depth > 0 ? 'ml-' + (depth * 4) : ''}`}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(item.id)}
              className="mr-2 h-5 w-5 flex items-center justify-center rounded hover:bg-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          {!hasChildren && <div className="w-5 mr-2"></div>}
          
          <div
            className="flex-1 flex items-center cursor-pointer"
            onClick={() => onCollectionClick(item)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span className="text-sm">{item.name}</span>
          </div>
          
          <Badge variant="outline" className="ml-2 text-xs">
            {item.article_count}
          </Badge>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children!.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Collection Hierarchy
      </h3>
      
      <Separator />
      
      <Card>
        <CardContent className="p-4 max-h-[500px] overflow-y-auto">
          {treeData.length > 0 ? (
            <div className="space-y-1">
              {treeData.map(item => renderItem(item))}
            </div>
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <p>No collection hierarchy available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}