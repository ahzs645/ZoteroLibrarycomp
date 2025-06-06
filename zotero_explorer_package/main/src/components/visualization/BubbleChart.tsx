import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface BubbleData {
  name: string;
  value: number;
  id: string;
}

interface BubbleChartProps {
  data: BubbleData[];
  onBubbleClick: (id: string) => void;
}

export function BubbleChart({ data, onBubbleClick }: BubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [focusedBubble, setFocusedBubble] = useState<string | null>(null);
  
  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width: 100%; height: auto;');

    // Create a pack layout
    const pack = d3.pack()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .padding(3);

    // Create hierarchy from data
    const root = d3.hierarchy({ children: data })
      .sum(d => (d as any).value);

    // Generate the pack layout
    const nodes = pack(root).descendants().slice(1); // Skip the root node

    // Create a color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create a group for the bubbles
    const bubbleGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create the bubbles
    const bubbles = bubbleGroup
      .selectAll('.bubble')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Add circles with enter/update/exit pattern for smooth transitions
    bubbles
      .append('circle')
      .attr('r', 0) // Start with radius 0 for animation
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('fill-opacity', d => {
        const bubbleData = d.data as BubbleData;
        return focusedBubble === bubbleData.id ? 0.9 : 0.7;
      })
      .attr('stroke', 'white')
      .attr('stroke-width', d => {
        const bubbleData = d.data as BubbleData;
        return focusedBubble === bubbleData.id ? 3 : 2;
      })
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const bubbleData = d.data as BubbleData;
        setFocusedBubble(bubbleData.id);
      })
      .on('mouseout', function() {
        setFocusedBubble(null);
      })
      .on('click', function(event, d) {
        const bubbleData = d.data as BubbleData;
        onBubbleClick(bubbleData.id);
      })
      .transition() // Add transition for animation
      .duration(800)
      .delay((d, i) => i * 50) // Stagger the animations
      .attr('r', d => d.r); // Animate to final radius

    // Add labels to the bubbles
    bubbles
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .style('font-size', d => Math.min(d.r / 3, 14) + 'px')
      .style('pointer-events', 'none') // Make text non-interactive
      .text(d => {
        const bubbleData = d.data as BubbleData;
        // Truncate long names
        const name = bubbleData.name;
        if (name.length > 15) {
          return name.substring(0, 12) + '...';
        }
        return name;
      });

    // Add value labels
    bubbles
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('dy', d => Math.min(d.r / 3, 14) + 2 + 'px')
      .attr('fill', 'white')
      .style('font-size', d => Math.min(d.r / 4, 12) + 'px')
      .style('pointer-events', 'none') // Make text non-interactive
      .text(d => {
        const bubbleData = d.data as BubbleData;
        return bubbleData.value;
      });

  }, [data, focusedBubble, onBubbleClick]); // Add focusedBubble to dependencies

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center p-8 text-center">
        <p className="text-gray-500">No collections available for this section.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-center items-center">
      <svg 
        ref={svgRef} 
        className={`transition-all duration-300 ${focusedBubble ? 'zoom-in' : ''}`}
      />
    </div>
  );
}