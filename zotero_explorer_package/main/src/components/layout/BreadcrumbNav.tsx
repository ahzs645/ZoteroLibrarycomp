import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type View = 'overview' | 'section' | 'collection';
type Selection = 'portal' | 'search' | 'overlap' | null;

interface BreadcrumbNavProps {
  currentView: View;
  currentSelection: Selection;
  currentCollection?: string | null;
  onNavigate: (view: View, selection?: Selection, collection?: string | null) => void;
}

export function BreadcrumbNav({
  currentView,
  currentSelection,
  currentCollection,
  onNavigate,
}: BreadcrumbNavProps) {
  return (
    <Breadcrumb className="bg-gradient-to-r from-gray-100 to-gray-200 p-3 rounded-lg">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink 
            onClick={() => onNavigate('overview')}
            className={`flex items-center ${currentView === 'overview' ? 'font-bold' : 'cursor-pointer hover:text-indigo-600 transition-colors'}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Library Overview
          </BreadcrumbLink>
        </BreadcrumbItem>

        {(currentView === 'section' || currentView === 'collection') && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => onNavigate('section', currentSelection)}
                className={`${currentView === 'section' ? 'font-bold' : 'cursor-pointer hover:text-indigo-600 transition-colors'}`}
              >
                {currentSelection === 'portal' ? 'Portal Library' : 
                 currentSelection === 'search' ? 'Search Library' : 'Overlapping Articles'}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {currentView === 'collection' && currentCollection && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="font-bold">
                {currentCollection.split('/').pop()}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}