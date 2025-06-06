# Zotero Library Comparison Tool

This tool analyzes and compares two Zotero libraries, identifying overlaps, gaps, and providing detailed collection-based analysis with proper hierarchical context.

## Features

- **Library Overlap Analysis**: Identifies common titles between libraries
- **Collection Hierarchy Visualization**: Displays the complete collection structure as seen on the Zotero website
- **Collection Statistics**: Provides detailed statistics on items per collection with overlap percentages
- **Gap Analysis**: Identifies collections with minimal overlap, suggesting potential research gaps
- **Interactive HTML Interface**: Explore all results through a user-friendly web interface

## Contents

- `zotero_analyzer_website_hierarchy.py`: Main analysis script with website hierarchy integration
- `parse_website_hierarchy.py`: Script to parse Zotero website collection hierarchy
- `output/`: Directory containing all generated visualizations and data files
  - `zotero_interface.html`: Interactive HTML interface for exploring results
  - `library_overlap.png`: Venn diagram showing library overlap
  - `website_hierarchy.png`: Visualization of the collection hierarchy
  - `collection_distribution.png`: Bar chart of top collections by item count
  - `collection_overlap_heatmap.png`: Heatmap showing overlap between collections
  - `document_types.png`: Distribution of document types across libraries
  - `matched_records.csv`: CSV file with all matched records between libraries
  - `collection_analysis.csv`: Detailed collection statistics
  - `gap_analysis.csv`: Collections with minimal overlap
  - `title_collections.csv`: Mapping of titles to their collections
  - `website_hierarchy.csv`: Complete collection hierarchy structure
  - `analysis_results.json`: Summary of analysis results in JSON format

## Requirements

- Python 3.6+
- Required packages:
  - pandas
  - numpy
  - matplotlib
  - seaborn
  - matplotlib-venn
  - networkx
  - beautifulsoup4

## Usage

1. Ensure you have the required Python packages installed:
   ```
   pip install pandas numpy matplotlib seaborn matplotlib-venn networkx beautifulsoup4
   ```

2. Run the main analysis script:
   ```
   python zotero_analyzer_website_hierarchy.py
   ```

3. Open the generated HTML interface to explore results:
   ```
   output/zotero_interface.html
   ```

## Data Sources

The tool uses the following data sources:
- RDF files exported from Zotero libraries
- Deduplicated XML files from the Deduplicator tool
- Website collection hierarchy structure (parsed from HTML)

## Customization

You can modify the script parameters to:
- Change input file paths
- Adjust visualization settings
- Filter collections by minimum item count
- Change output directory

## License

This tool is provided for research and educational purposes.
