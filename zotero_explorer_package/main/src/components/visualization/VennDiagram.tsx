import { useEffect, useRef, useState } from 'react';

interface VennDiagramProps {
  portalCount: number;
  searchCount: number;
  overlapCount: number;
  onSelect: (section: 'portal' | 'search' | 'overlap') => void;
}

export function VennDiagram({ portalCount, searchCount, overlapCount, onSelect }: VennDiagramProps) {
  // Add hover state for visual feedback
  const [hoveredSection, setHoveredSection] = useState<'portal' | 'search' | 'overlap' | null>(null);
  
  // Calculate total values for sizing
  const totalArticles = portalCount + searchCount + overlapCount;
  
  // If there are no articles, show a message instead
  if (totalArticles === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center p-8 text-center">
        <p className="text-gray-500">No articles available. Please add some articles to see the visualization.</p>
      </div>
    );
  }
  
  // Calculate circle sizes based on data
  // Use square root scale to make area proportional to count
  const width = 600;
  const height = 400;
  const maxRadius = Math.min(width, height) / 3.5;
  const portalRadius = Math.sqrt((portalCount + overlapCount) / totalArticles) * maxRadius * 1.5;
  const searchRadius = Math.sqrt((searchCount + overlapCount) / totalArticles) * maxRadius * 1.5;
  
  // Calculate distance between circle centers based on counts
  // Adjust distance to create proper overlap
  const baseDistance = (portalRadius + searchRadius) * 0.7;
  const distance = baseDistance * (1 - (overlapCount / totalArticles) * 0.5);
  
  // Calculate overlap path
  const overlapPath = calculateOverlapPath(
    -distance / 2, 0, portalRadius,
    distance / 2, 0, searchRadius
  );
  
  return (
    <div className="w-full h-full flex justify-center items-center">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="transition-all duration-300"
      >
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {/* Portal Circle */}
          <circle
            cx={-distance / 2}
            cy={0}
            r={portalRadius}
            fill="#4299e1"
            fillOpacity={hoveredSection === 'portal' ? 0.9 : 0.7}
            stroke="none"
            className="transition-all duration-300"
            onClick={() => onSelect('portal')}
            onMouseEnter={() => setHoveredSection('portal')}
            onMouseLeave={() => setHoveredSection(null)}
            cursor="pointer"
          />
          <text
            x={-distance / 2}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontWeight="bold"
            fontSize={16}
            pointerEvents="none"
          >
            Portal
          </text>
          <text
            x={-distance / 2}
            y={20}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={14}
            pointerEvents="none"
          >
            {portalCount}
          </text>

          {/* Search Circle */}
          <circle
            cx={distance / 2}
            cy={0}
            r={searchRadius}
            fill="#f56565"
            fillOpacity={hoveredSection === 'search' ? 0.9 : 0.7}
            stroke="none"
            className="transition-all duration-300"
            onClick={() => onSelect('search')}
            onMouseEnter={() => setHoveredSection('search')}
            onMouseLeave={() => setHoveredSection(null)}
            cursor="pointer"
          />
          <text
            x={distance / 2}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontWeight="bold"
            fontSize={16}
            pointerEvents="none"
          >
            Search
          </text>
          <text
            x={distance / 2}
            y={20}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={14}
            pointerEvents="none"
          >
            {searchCount}
          </text>

          {/* Overlap Area */}
          {overlapPath && (
            <>
              <path
                d={overlapPath}
                fill="#805ad5"
                fillOpacity={hoveredSection === 'overlap' ? 0.9 : 0.8}
                className="transition-all duration-300"
                onClick={() => onSelect('overlap')}
                onMouseEnter={() => setHoveredSection('overlap')}
                onMouseLeave={() => setHoveredSection(null)}
                cursor="pointer"
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontWeight="bold"
                fontSize={14}
                pointerEvents="none"
              >
                Overlap
              </text>
              <text
                x={0}
                y={20}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={12}
                pointerEvents="none"
              >
                {overlapCount}
              </text>
            </>
          )}
          
          {/* Add invisible clickable areas for better UX */}
          <circle
            cx={-distance / 2}
            cy={0}
            r={portalRadius}
            fill="transparent"
            onClick={() => onSelect('portal')}
            onMouseEnter={() => setHoveredSection('portal')}
            onMouseLeave={() => setHoveredSection(null)}
            cursor="pointer"
          />
          <circle
            cx={distance / 2}
            cy={0}
            r={searchRadius}
            fill="transparent"
            onClick={() => onSelect('search')}
            onMouseEnter={() => setHoveredSection('search')}
            onMouseLeave={() => setHoveredSection(null)}
            cursor="pointer"
          />
          {overlapPath && (
            <path
              d={overlapPath}
              fill="transparent"
              onClick={() => onSelect('overlap')}
              onMouseEnter={() => setHoveredSection('overlap')}
              onMouseLeave={() => setHoveredSection(null)}
              cursor="pointer"
              style={{ pointerEvents: 'all' }}
            />
          )}
        </g>
      </svg>
    </div>
  );
}

// Helper function to calculate the path for the overlap area
function calculateOverlapPath(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  
  // If circles don't overlap or one is inside the other
  if (d > r1 + r2 || d < Math.abs(r1 - r2)) {
    return null;
  }
  
  const a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(r1 ** 2 - a ** 2);
  
  const x3 = x1 + a * (x2 - x1) / d;
  const y3 = y1 + a * (y2 - y1) / d;
  
  const x4 = x3 + h * (y2 - y1) / d;
  const y4 = y3 - h * (x2 - x1) / d;
  
  const x5 = x3 - h * (y2 - y1) / d;
  const y5 = y3 + h * (x2 - x1) / d;
  
  // Create path
  let path = `M ${x4} ${y4} A ${r1} ${r1} 0 0 1 ${x5} ${y5} A ${r2} ${r2} 0 0 1 ${x4} ${y4}`;
  
  return path;
}