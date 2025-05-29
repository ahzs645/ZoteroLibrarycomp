#!/usr/bin/env python3
"""
Zotero Library Comparison Tool - With Website Collection Hierarchy

This script implements the matching logic using RDF and XML data sources
following the user's original approach for normalization and overlap detection,
while maintaining the collection hierarchy as displayed on the Zotero website.
"""

import os
import re
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib_venn import venn2
import xml.etree.ElementTree as ET
import json
import warnings
import networkx as nx
from matplotlib.colors import LinearSegmentedColormap
warnings.filterwarnings('ignore')

class ZoteroLibraryAnalyzer:
    """
    A class to analyze Zotero libraries using RDF and XML data sources.
    """
    
    def __init__(self, output_dir='./output', website_hierarchy_file=None):
        """
        Initialize the ZoteroLibraryAnalyzer.
        
        Args:
            output_dir (str): Directory to save output files
            website_hierarchy_file (str): Path to the website hierarchy mapping file
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Define namespaces for RDF parsing
        self.namespaces = {
            'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            'z': 'http://www.zotero.org/namespaces/export#',
            'dc': 'http://purl.org/dc/elements/1.1/',
            'bib': 'http://purl.org/net/biblio#',
            'dcterms': 'http://purl.org/dc/terms/',
            'foaf': 'http://xmlns.com/foaf/0.1/'
        }
        
        # Initialize data containers
        self.portal_items = None
        self.search_items = None
        self.portal_records = None
        self.search_records = None
        self.portal_collections = None
        self.search_collections = None
        self.portal_collection_items = None
        self.search_collection_items = None
        self.analysis_results = None
        
        # Collection hierarchy graphs
        self.portal_hierarchy = nx.DiGraph()
        self.search_hierarchy = nx.DiGraph()
        
        # Load website hierarchy if provided
        self.website_hierarchy = {}
        if website_hierarchy_file and os.path.exists(website_hierarchy_file):
            with open(website_hierarchy_file, 'r') as f:
                self.website_hierarchy = json.load(f)
            print(f"Loaded website hierarchy with {len(self.website_hierarchy)} collections")
    
    def normalize_title(self, title):
        """
        Normalize a title for comparison by removing punctuation and standardizing whitespace.
        
        Args:
            title (str): The title to normalize
            
        Returns:
            str: The normalized title
        """
        if not title:
            return ""
        
        # Remove punctuation and convert to lowercase
        title = re.sub(r'[^\w\s]', '', title.lower())
        
        # Standardize whitespace
        return ' '.join(title.split())
    
    def extract_from_rdf(self, rdf_path, library_name):
        """
        Extract items and collections from RDF file, preserving the collection hierarchy.
        
        Args:
            rdf_path (str): Path to the RDF file
            library_name (str): Name of the library (Portal or Search)
            
        Returns:
            tuple: (items_df, collections_df, collection_items_df)
        """
        print(f"\nProcessing RDF: {rdf_path}")
        
        try:
            tree = ET.parse(rdf_path)
            root = tree.getroot()
            
            # Extract items
            items_data = []
            for item in root.findall(".//*[@rdf:about]", self.namespaces):
                item_id = item.get(f"{{{self.namespaces['rdf']}}}about")
                if item_id:
                    title = item.find(f".//{{{self.namespaces['dc']}}}title")
                    if title is not None and title.text:
                        items_data.append({
                            'item_id': item_id,
                            'title': title.text,
                            'normalized_title': self.normalize_title(title.text),
                            'library': library_name
                        })
            
            # Extract collections with hierarchy
            collections_data = []
            collection_items_data = []
            
            # Create a directed graph for the collection hierarchy
            hierarchy_graph = nx.DiGraph()
            
            for collection in root.findall(f".//{{{self.namespaces['z']}}}Collection"):
                coll_id = collection.get(f"{{{self.namespaces['rdf']}}}about")
                if coll_id:
                    title = collection.find(f".//{{{self.namespaces['dc']}}}title")
                    if title is not None and title.text:
                        # Add node to graph
                        hierarchy_graph.add_node(coll_id, title=title.text)
                        
                        # Check for parent collection
                        parent = None
                        parent_elem = collection.find(f".//{{{self.namespaces['dcterms']}}}isPartOf")
                        if parent_elem is not None:
                            parent = parent_elem.get(f"{{{self.namespaces['rdf']}}}resource")
                            if parent:
                                # Add edge from parent to child
                                hierarchy_graph.add_edge(parent, coll_id)
                        
                        # Get website path if available
                        website_path = self.website_hierarchy.get(coll_id, "")
                        depth = len(website_path.split('/')) - 1 if website_path else 0
                        
                        collections_data.append({
                            'collection_id': coll_id,
                            'title': title.text,
                            'parent_id': parent,
                            'library': library_name,
                            'website_path': website_path,
                            'depth': depth
                        })
                        
                        # Collection items
                        for item_ref in collection.findall(f".//{{{self.namespaces['dcterms']}}}hasPart"):
                            item_id = item_ref.get(f"{{{self.namespaces['rdf']}}}resource")
                            if item_id:
                                collection_items_data.append({
                                    'collection_id': coll_id,
                                    'collection_title': title.text,
                                    'item_id': item_id,
                                    'library': library_name,
                                    'website_path': website_path
                                })
            
            # Store the hierarchy graph
            if library_name == 'Portal':
                self.portal_hierarchy = hierarchy_graph
            else:
                self.search_hierarchy = hierarchy_graph
            
            items_df = pd.DataFrame(items_data)
            collections_df = pd.DataFrame(collections_data)
            collection_items_df = pd.DataFrame(collection_items_data)
            
            print(f"Found {len(items_df)} items in {library_name} RDF")
            print(f"Found {len(collections_df)} collections in {library_name} RDF")
            print(f"Found {len(collection_items_df)} collection-item mappings in {library_name} RDF")
            
            return items_df, collections_df, collection_items_df
            
        except Exception as e:
            print(f"Error in extract_from_rdf: {str(e)}")
            return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()
    
    def extract_from_dedup_xml(self, xml_path, library_name):
        """
        Extract records from deduplicated XML file.
        
        Args:
            xml_path (str): Path to the XML file
            library_name (str): Name of the library (Portal or Search)
            
        Returns:
            pandas.DataFrame: DataFrame containing records
        """
        print(f"\nProcessing deduplicated XML: {xml_path}")
        
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            
            records_data = []
            for record in root.findall('.//record'):
                try:
                    rec_data = {}
                    
                    # Extract title
                    titles = record.find('.//titles')
                    if titles is not None:
                        title = titles.find('title')
                        if title is not None:
                            style = title.find('.//style')
                            if style is not None and style.text:
                                rec_data['title'] = style.text.strip()
                                rec_data['normalized_title'] = self.normalize_title(style.text)
                    
                    # Extract other fields if needed
                    ref_type = record.find('.//ref-type')
                    if ref_type is not None:
                        rec_data['type'] = ref_type.get('name')
                    
                    # Extract authors
                    authors = []
                    contributors = record.find('.//contributors')
                    if contributors is not None:
                        for author in contributors.findall('.//author'):
                            style = author.find('.//style')
                            if style is not None and style.text:
                                authors.append(style.text.strip())
                    rec_data['authors'] = '; '.join(authors)
                    
                    # Extract journal/publication
                    secondary_title = None
                    if titles is not None:
                        secondary = titles.find('secondary-title')
                        if secondary is not None:
                            style = secondary.find('.//style')
                            if style is not None and style.text:
                                secondary_title = style.text.strip()
                    rec_data['journal'] = secondary_title
                    
                    # Extract year
                    dates = record.find('.//dates')
                    if dates is not None:
                        year = dates.find('.//year')
                        if year is not None:
                            style = year.find('.//style')
                            if style is not None and style.text:
                                rec_data['year'] = style.text.strip()
                    
                    if 'title' in rec_data:
                        rec_data['library'] = library_name
                        records_data.append(rec_data)
                        
                except Exception as e:
                    print(f"Error processing record: {str(e)}")
                    continue
            
            records_df = pd.DataFrame(records_data)
            print(f"Extracted {len(records_df)} records from {library_name} XML")
            return records_df
            
        except Exception as e:
            print(f"Error in extract_from_dedup_xml: {str(e)}")
            return pd.DataFrame()
    
    def process_libraries(self, portal_rdf, portal_xml, search_rdf, search_xml):
        """
        Process both libraries and analyze overlap.
        
        Args:
            portal_rdf (str): Path to Portal RDF file
            portal_xml (str): Path to Portal deduplicated XML file
            search_rdf (str): Path to Search RDF file
            search_xml (str): Path to Search deduplicated XML file
            
        Returns:
            dict: Analysis results
        """
        # Process Portal library
        self.portal_items, self.portal_collections, self.portal_collection_items = self.extract_from_rdf(portal_rdf, 'Portal')
        self.portal_records = self.extract_from_dedup_xml(portal_xml, 'Portal')
        
        # Process Search library
        self.search_items, self.search_collections, self.search_collection_items = self.extract_from_rdf(search_rdf, 'Search')
        self.search_records = self.extract_from_dedup_xml(search_xml, 'Search')
        
        # Combine records for analysis
        all_records = pd.concat([self.portal_records, self.search_records], ignore_index=True)
        all_collections = pd.concat([self.portal_collections, self.search_collections], ignore_index=True)
        all_collection_items = pd.concat([self.portal_collection_items, self.search_collection_items], ignore_index=True)
        
        # Analyze overlap based on normalized titles
        portal_titles = set(self.portal_records['normalized_title'].dropna())
        search_titles = set(self.search_records['normalized_title'].dropna())
        common_titles = portal_titles.intersection(search_titles)
        
        # Calculate counts
        portal_only = len(portal_titles) - len(common_titles)
        search_only = len(search_titles) - len(common_titles)
        overlap = len(common_titles)
        
        print(f"\nOverlap Analysis:")
        print(f"Portal unique titles: {len(portal_titles)}")
        print(f"Search unique titles: {len(search_titles)}")
        print(f"Common titles: {len(common_titles)}")
        print(f"Portal-only titles: {portal_only}")
        print(f"Search-only titles: {search_only}")
        
        # Create a mapping of titles to collections with hierarchy
        title_to_collections = {}
        
        # Process Portal collections
        for _, item in self.portal_items.iterrows():
            item_id = item['item_id']
            title = item['title']
            norm_title = item['normalized_title']
            
            # Find collections for this item
            item_collections = self.portal_collection_items[self.portal_collection_items['item_id'] == item_id]
            
            if not item_collections.empty:
                # Get collection details with paths
                collection_details = []
                for _, coll_item in item_collections.iterrows():
                    coll_id = coll_item['collection_id']
                    coll_info = self.portal_collections[self.portal_collections['collection_id'] == coll_id]
                    if not coll_info.empty:
                        website_path = coll_info['website_path'].iloc[0]
                        collection_details.append({
                            'id': coll_id,
                            'title': coll_info['title'].iloc[0],
                            'path': website_path if website_path else coll_info['title'].iloc[0],
                            'depth': coll_info['depth'].iloc[0]
                        })
                
                if norm_title not in title_to_collections:
                    title_to_collections[norm_title] = {'Portal': collection_details, 'Search': []}
                else:
                    title_to_collections[norm_title]['Portal'] = collection_details
        
        # Process Search collections
        for _, item in self.search_items.iterrows():
            item_id = item['item_id']
            title = item['title']
            norm_title = item['normalized_title']
            
            # Find collections for this item
            item_collections = self.search_collection_items[self.search_collection_items['item_id'] == item_id]
            
            if not item_collections.empty:
                # Get collection details with paths
                collection_details = []
                for _, coll_item in item_collections.iterrows():
                    coll_id = coll_item['collection_id']
                    coll_info = self.search_collections[self.search_collections['collection_id'] == coll_id]
                    if not coll_info.empty:
                        website_path = coll_info['website_path'].iloc[0]
                        collection_details.append({
                            'id': coll_id,
                            'title': coll_info['title'].iloc[0],
                            'path': website_path if website_path else coll_info['title'].iloc[0],
                            'depth': coll_info['depth'].iloc[0]
                        })
                
                if norm_title not in title_to_collections:
                    title_to_collections[norm_title] = {'Portal': [], 'Search': collection_details}
                else:
                    title_to_collections[norm_title]['Search'] = collection_details
        
        # Create a DataFrame for collection analysis
        collection_data = []
        
        for norm_title, collections in title_to_collections.items():
            portal_colls = collections.get('Portal', [])
            search_colls = collections.get('Search', [])
            
            # Check if this title is in both libraries
            is_overlap = norm_title in common_titles
            
            # Add Portal collections
            for coll in portal_colls:
                collection_data.append({
                    'normalized_title': norm_title,
                    'library': 'Portal',
                    'collection_id': coll['id'],
                    'collection_title': coll['title'],
                    'collection_path': coll['path'],
                    'collection_depth': coll['depth'],
                    'is_overlap': is_overlap
                })
            
            # Add Search collections
            for coll in search_colls:
                collection_data.append({
                    'normalized_title': norm_title,
                    'library': 'Search',
                    'collection_id': coll['id'],
                    'collection_title': coll['title'],
                    'collection_path': coll['path'],
                    'collection_depth': coll['depth'],
                    'is_overlap': is_overlap
                })
        
        # Create DataFrame
        collection_analysis_df = pd.DataFrame(collection_data)
        
        # Calculate collection statistics
        collection_stats = collection_analysis_df.groupby(['library', 'collection_path', 'collection_title', 'collection_depth']).size().reset_index(name='total_items')
        
        # Calculate overlap by collection
        overlap_by_collection = collection_analysis_df[collection_analysis_df['is_overlap']].groupby(['library', 'collection_path', 'collection_title', 'collection_depth']).size().reset_index(name='overlap_items')
        
        # Merge to get complete stats
        collection_stats = pd.merge(collection_stats, overlap_by_collection, on=['library', 'collection_path', 'collection_title', 'collection_depth'], how='left')
        collection_stats['overlap_items'] = collection_stats['overlap_items'].fillna(0).astype(int)
        collection_stats['overlap_percentage'] = (collection_stats['overlap_items'] / collection_stats['total_items'] * 100).round(2)
        
        # Sort by path for hierarchical display
        collection_stats = collection_stats.sort_values(['library', 'collection_path'])
        
        # Store analysis results
        self.analysis_results = {
            'portal_titles': portal_titles,
            'search_titles': search_titles,
            'common_titles': common_titles,
            'portal_only': portal_only,
            'search_only': search_only,
            'overlap': overlap,
            'all_records': all_records,
            'all_collections': all_collections,
            'all_collection_items': all_collection_items,
            'title_to_collections': title_to_collections,
            'collection_analysis': collection_analysis_df,
            'collection_stats': collection_stats
        }
        
        return self.analysis_results
    
    def visualize_overlap(self, save_path=None):
        """
        Create a Venn diagram showing the overlap between the two libraries.
        
        Args:
            save_path (str, optional): Path to save the visualization
            
        Returns:
            matplotlib.figure.Figure: The figure object
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before visualization")
        
        plt.figure(figsize=(10, 6))
        
        # Create Venn diagram
        venn = venn2(
            subsets=(self.analysis_results['portal_only'], 
                    self.analysis_results['search_only'], 
                    self.analysis_results['overlap']),
            set_labels=('Portal Library', 'Search Library')
        )
        
        # Add count labels
        for text in venn.set_labels:
            text.set_fontsize(14)
        for text in venn.subset_labels:
            text.set_fontsize(12)
        
        plt.title('Overlap Between Portal and Search Libraries', fontsize=16)
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Venn diagram saved to {save_path}")
        
        return plt.gcf()
    
    def visualize_document_types(self, save_path=None):
        """
        Create a bar chart showing the distribution of document types in each library.
        
        Args:
            save_path (str, optional): Path to save the visualization
            
        Returns:
            matplotlib.figure.Figure: The figure object
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before visualization")
        
        all_records = self.analysis_results['all_records']
        
        if 'type' not in all_records.columns:
            print("Document type information not available")
            return None
        
        # Get document type counts by library
        type_counts = all_records.groupby(['library', 'type']).size().reset_index(name='count')
        
        # Create plot
        plt.figure(figsize=(12, 8))
        sns.barplot(x='type', y='count', hue='library', data=type_counts)
        plt.xticks(rotation=45, ha='right')
        plt.title('Document Types Distribution by Library', fontsize=16)
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Document types chart saved to {save_path}")
        
        return plt.gcf()
    
    def visualize_collection_distribution(self, save_path=None, top_n=15):
        """
        Create a bar chart showing the distribution of items across top collections.
        
        Args:
            save_path (str, optional): Path to save the visualization
            top_n (int): Number of top collections to show
            
        Returns:
            matplotlib.figure.Figure: The figure object
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before visualization")
        
        collection_stats = self.analysis_results['collection_stats']
        
        # Get top collections by item count
        top_collections = collection_stats.nlargest(top_n, 'total_items')
        
        # Create plot
        plt.figure(figsize=(15, 8))
        
        # Create a categorical color palette
        palette = {'Portal': '#1f77b4', 'Search': '#ff7f0e'}
        
        # Plot
        ax = sns.barplot(x='collection_title', y='total_items', hue='library', 
                         data=top_collections, palette=palette)
        
        plt.title(f'Top {top_n} Collections by Item Count', fontsize=16)
        plt.xticks(rotation=45, ha='right')
        plt.xlabel('Collection')
        plt.ylabel('Total Items')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Collection distribution chart saved to {save_path}")
        
        return plt.gcf()
    
    def visualize_collection_overlap_heatmap(self, save_path=None, min_items=5):
        """
        Create a heatmap showing the overlap percentage across collections.
        
        Args:
            save_path (str, optional): Path to save the visualization
            min_items (int): Minimum number of items for a collection to be included
            
        Returns:
            matplotlib.figure.Figure: The figure object
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before visualization")
        
        collection_stats = self.analysis_results['collection_stats']
        
        # Filter for collections with at least min_items
        significant_collections = collection_stats[collection_stats['total_items'] >= min_items]
        
        # Create a pivot table for the heatmap
        portal_collections = significant_collections[significant_collections['library'] == 'Portal']
        search_collections = significant_collections[significant_collections['library'] == 'Search']
        
        # Sort by depth and path
        portal_collections = portal_collections.sort_values(['collection_depth', 'collection_path'])
        search_collections = search_collections.sort_values(['collection_depth', 'collection_path'])
        
        # Get top collections from each library
        top_portal = portal_collections.nlargest(15, 'total_items')
        top_search = search_collections.nlargest(15, 'total_items')
        
        # Create a matrix for the heatmap with numeric values
        heatmap_data = np.zeros((len(top_portal), len(top_search)))
        
        # Create row and column labels
        row_labels = top_portal['collection_title'].tolist()
        col_labels = top_search['collection_title'].tolist()
        
        # Fill with overlap percentages
        for i, (p_idx, p_row) in enumerate(top_portal.iterrows()):
            for j, (s_idx, s_row) in enumerate(top_search.iterrows()):
                # Calculate overlap between these collections
                p_titles = set(self.analysis_results['collection_analysis'][
                    (self.analysis_results['collection_analysis']['library'] == 'Portal') & 
                    (self.analysis_results['collection_analysis']['collection_title'] == p_row['collection_title'])
                ]['normalized_title'])
                
                s_titles = set(self.analysis_results['collection_analysis'][
                    (self.analysis_results['collection_analysis']['library'] == 'Search') & 
                    (self.analysis_results['collection_analysis']['collection_title'] == s_row['collection_title'])
                ]['normalized_title'])
                
                if p_titles and s_titles:
                    overlap = len(p_titles.intersection(s_titles))
                    overlap_pct = (overlap / len(p_titles)) * 100
                    heatmap_data[i, j] = overlap_pct
        
        # Create plot
        plt.figure(figsize=(14, 10))
        
        # Create custom colormap
        cmap = LinearSegmentedColormap.from_list('custom_cmap', ['#f7fbff', '#08306b'])
        
        # Plot heatmap with numeric data
        ax = sns.heatmap(heatmap_data, cmap=cmap, annot=True, fmt='.1f', 
                         linewidths=0.5, cbar_kws={'label': 'Overlap %'},
                         xticklabels=col_labels, yticklabels=row_labels)
        
        plt.title('Collection Overlap Heatmap (% of Portal Collection in Search Collection)', fontsize=16)
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Collection overlap heatmap saved to {save_path}")
        
        return plt.gcf()
    
    def visualize_website_hierarchy(self, save_path=None):
        """
        Create a visualization of the website collection hierarchy.
        
        Args:
            save_path (str, optional): Path to save the visualization
            
        Returns:
            matplotlib.figure.Figure: The figure object
        """
        if not self.website_hierarchy:
            print("No website hierarchy data available")
            return None
        
        # Create a tree structure from the website hierarchy
        G = nx.DiGraph()
        
        # Add nodes for all collections
        for coll_id, path in self.website_hierarchy.items():
            G.add_node(coll_id, label=path.split('/')[-1], path=path)
        
        # Add edges based on path structure
        for coll_id, path in self.website_hierarchy.items():
            parts = path.split('/')
            if len(parts) > 1:
                # Find parent by path
                parent_path = '/'.join(parts[:-1])
                for parent_id, p_path in self.website_hierarchy.items():
                    if p_path == parent_path:
                        G.add_edge(parent_id, coll_id)
                        break
        
        # Create plot
        plt.figure(figsize=(15, 10))
        
        # Use spring layout
        pos = nx.spring_layout(G, seed=42)
        
        # Draw the graph
        nx.draw(G, pos, 
                node_color='lightblue',
                node_size=1000,
                font_size=8,
                font_weight='bold',
                with_labels=False,
                arrows=True)
        
        # Draw labels
        labels = {node: G.nodes[node]['label'] for node in G.nodes()}
        nx.draw_networkx_labels(G, pos, labels=labels, font_size=8)
        
        plt.title('Website Collection Hierarchy', fontsize=16)
        plt.axis('off')
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Website hierarchy visualization saved to {save_path}")
        
        return plt.gcf()
    
    def identify_collection_gaps(self, min_items=5):
        """
        Identify collections with low overlap, suggesting potential gaps.
        
        Args:
            min_items (int): Minimum number of items for a collection to be considered
            
        Returns:
            pandas.DataFrame: DataFrame with collection gap analysis
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before analysis")
        
        collection_stats = self.analysis_results['collection_stats']
        
        # Filter for collections with at least min_items
        significant_collections = collection_stats[collection_stats['total_items'] >= min_items]
        
        # Sort by overlap percentage (ascending) and path
        gap_analysis = significant_collections.sort_values(['overlap_percentage', 'collection_path'])
        
        return gap_analysis
    
    def export_analysis_results(self, output_path=None):
        """
        Export the analysis results to a JSON file.
        
        Args:
            output_path (str, optional): Path to save the JSON file
            
        Returns:
            str: The path to the saved file
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before exporting")
        
        if output_path is None:
            output_path = os.path.join(self.output_dir, 'analysis_results.json')
        
        # Create a serializable version of the results
        serializable_results = {
            'portal_only': self.analysis_results['portal_only'],
            'search_only': self.analysis_results['search_only'],
            'overlap': self.analysis_results['overlap'],
            'portal_total': len(self.analysis_results['portal_titles']),
            'search_total': len(self.analysis_results['search_titles']),
            'common_total': len(self.analysis_results['common_titles'])
        }
        
        with open(output_path, 'w') as f:
            json.dump(serializable_results, f, indent=2)
        
        print(f"Analysis results exported to {output_path}")
        
        return output_path
    
    def export_matched_records(self, output_path=None):
        """
        Export the matched records to a CSV file.
        
        Args:
            output_path (str, optional): Path to save the CSV file
            
        Returns:
            str: The path to the saved file
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before exporting")
        
        if output_path is None:
            output_path = os.path.join(self.output_dir, 'matched_records.csv')
        
        # Get records with common titles
        all_records = self.analysis_results['all_records']
        common_titles = self.analysis_results['common_titles']
        
        matched_records = all_records[all_records['normalized_title'].isin(common_titles)]
        matched_records.to_csv(output_path, index=False)
        
        print(f"Matched records exported to {output_path}")
        
        return output_path
    
    def export_collection_analysis(self, output_path=None):
        """
        Export the collection analysis to a CSV file.
        
        Args:
            output_path (str, optional): Path to save the CSV file
            
        Returns:
            str: The path to the saved file
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before exporting")
        
        if output_path is None:
            output_path = os.path.join(self.output_dir, 'collection_analysis.csv')
        
        # Get collection stats
        collection_stats = self.analysis_results['collection_stats']
        collection_stats.to_csv(output_path, index=False)
        
        print(f"Collection analysis exported to {output_path}")
        
        return output_path
    
    def export_gap_analysis(self, output_path=None, min_items=5):
        """
        Export the gap analysis to a CSV file.
        
        Args:
            output_path (str, optional): Path to save the CSV file
            min_items (int): Minimum number of items for a collection to be considered
            
        Returns:
            str: The path to the saved file
        """
        if output_path is None:
            output_path = os.path.join(self.output_dir, 'gap_analysis.csv')
        
        # Get gap analysis
        gap_analysis = self.identify_collection_gaps(min_items=min_items)
        gap_analysis.to_csv(output_path, index=False)
        
        print(f"Gap analysis exported to {output_path}")
        
        return output_path
    
    def export_title_collections(self, output_path=None):
        """
        Export the mapping of titles to collections to a CSV file.
        
        Args:
            output_path (str, optional): Path to save the CSV file
            
        Returns:
            str: The path to the saved file
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before exporting")
        
        if output_path is None:
            output_path = os.path.join(self.output_dir, 'title_collections.csv')
        
        # Get title to collections mapping
        title_to_collections = self.analysis_results['title_to_collections']
        
        # Convert to DataFrame
        title_collections_data = []
        for title, collections in title_to_collections.items():
            # Get a record from all_records to get the actual title
            record = self.analysis_results['all_records'][self.analysis_results['all_records']['normalized_title'] == title]
            actual_title = record['title'].iloc[0] if not record.empty else title
            
            # Format collection paths
            portal_colls = '; '.join([c['path'] for c in collections.get('Portal', [])])
            search_colls = '; '.join([c['path'] for c in collections.get('Search', [])])
            
            title_collections_data.append({
                'title': actual_title,
                'normalized_title': title,
                'portal_collections': portal_colls,
                'search_collections': search_colls,
                'is_overlap': title in self.analysis_results['common_titles']
            })
        
        title_collections_df = pd.DataFrame(title_collections_data)
        title_collections_df.to_csv(output_path, index=False)
        
        print(f"Title-collections mapping exported to {output_path}")
        
        return output_path
    
    def export_website_hierarchy(self, output_path=None):
        """
        Export the website collection hierarchy to a CSV file.
        
        Args:
            output_path (str, optional): Path to save the CSV file
            
        Returns:
            str: The path to the saved file
        """
        if not self.website_hierarchy:
            print("No website hierarchy data available")
            return None
        
        if output_path is None:
            output_path = os.path.join(self.output_dir, 'website_hierarchy.csv')
        
        # Convert to DataFrame
        hierarchy_data = []
        for coll_id, path in self.website_hierarchy.items():
            parts = path.split('/')
            title = parts[-1]
            depth = len(parts) - 1
            parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else ""
            
            # Find parent ID
            parent_id = ""
            for p_id, p_path in self.website_hierarchy.items():
                if p_path == parent_path:
                    parent_id = p_id
                    break
            
            hierarchy_data.append({
                'collection_id': coll_id,
                'title': title,
                'path': path,
                'depth': depth,
                'parent_id': parent_id,
                'parent_path': parent_path
            })
        
        hierarchy_df = pd.DataFrame(hierarchy_data)
        hierarchy_df.to_csv(output_path, index=False)
        
        print(f"Website hierarchy exported to {output_path}")
        
        return output_path
    
    def generate_html_interface(self, output_path=None):
        """
        Generate an HTML interface for the analysis results.
        
        Args:
            output_path (str, optional): Path to save the HTML file
            
        Returns:
            str: The path to the saved file
        """
        if not self.analysis_results:
            raise ValueError("Must run process_libraries before generating interface")
        
        if output_path is None:
            output_path = os.path.join(self.output_dir, 'zotero_interface.html')
        
        # Generate visualizations
        venn_path = os.path.join(self.output_dir, 'library_overlap.png')
        self.visualize_overlap(save_path=venn_path)
        
        doc_types_path = os.path.join(self.output_dir, 'document_types.png')
        self.visualize_document_types(save_path=doc_types_path)
        
        collection_distribution_path = os.path.join(self.output_dir, 'collection_distribution.png')
        self.visualize_collection_distribution(save_path=collection_distribution_path)
        
        overlap_heatmap_path = os.path.join(self.output_dir, 'collection_overlap_heatmap.png')
        self.visualize_collection_overlap_heatmap(save_path=overlap_heatmap_path)
        
        website_hierarchy_path = os.path.join(self.output_dir, 'website_hierarchy.png')
        self.visualize_website_hierarchy(save_path=website_hierarchy_path)
        
        # Export data
        analysis_json_path = self.export_analysis_results()
        matched_records_path = self.export_matched_records()
        collection_analysis_path = self.export_collection_analysis()
        gap_analysis_path = self.export_gap_analysis()
        title_collections_path = self.export_title_collections()
        website_hierarchy_csv_path = self.export_website_hierarchy()
        
        # Get collection gap analysis for HTML display
        gap_analysis = self.identify_collection_gaps()
        top_gaps = gap_analysis.head(10)  # Top 10 collections with lowest overlap
        
        # Create HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Zotero Library Comparison with Website Collection Hierarchy</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                }}
                h1, h2, h3 {{
                    color: #2c3e50;
                }}
                .container {{
                    max-width: 1200px;
                    margin: 0 auto;
                }}
                .card {{
                    background: #fff;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    padding: 20px;
                    margin-bottom: 20px;
                }}
                .visualization {{
                    text-align: center;
                    margin: 20px 0;
                }}
                .visualization img {{
                    max-width: 100%;
                    height: auto;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }}
                th, td {{
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }}
                th {{
                    background-color: #f2f2f2;
                }}
                tr:hover {{
                    background-color: #f5f5f5;
                }}
                .stats {{
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                }}
                .stat-card {{
                    flex: 1;
                    min-width: 200px;
                    background: #f8f9fa;
                    padding: 15px;
                    margin: 10px;
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }}
                .hierarchy-table {{
                    margin-top: 20px;
                }}
                .hierarchy-table td.indent {{
                    padding-left: calc(15px * var(--depth));
                }}
                .hierarchy-table tr.level-0 {{
                    font-weight: bold;
                    background-color: #f8f9fa;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Zotero Library Comparison with Website Collection Hierarchy</h1>
                
                <div class="card">
                    <h2>Library Statistics</h2>
                    <div class="stats">
                        <div class="stat-card">
                            <h3>Portal Library</h3>
                            <p>Total Titles: {len(self.analysis_results['portal_titles'])}</p>
                            <p>Portal-Only Titles: {self.analysis_results['portal_only']}</p>
                        </div>
                        <div class="stat-card">
                            <h3>Search Library</h3>
                            <p>Total Titles: {len(self.analysis_results['search_titles'])}</p>
                            <p>Search-Only Titles: {self.analysis_results['search_only']}</p>
                        </div>
                        <div class="stat-card">
                            <h3>Overlap</h3>
                            <p>Common Titles: {self.analysis_results['overlap']}</p>
                            <p>Portal Overlap: {(self.analysis_results['overlap'] / len(self.analysis_results['portal_titles']) * 100):.2f}%</p>
                            <p>Search Overlap: {(self.analysis_results['overlap'] / len(self.analysis_results['search_titles']) * 100):.2f}%</p>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h2>Library Overlap Visualization</h2>
                    <div class="visualization">
                        <img src="library_overlap.png" alt="Library Overlap Venn Diagram">
                    </div>
                </div>
                
                <div class="card">
                    <h2>Collection Distribution</h2>
                    <p>This chart shows the top collections by item count across both libraries:</p>
                    <div class="visualization">
                        <img src="collection_distribution.png" alt="Collection Distribution">
                    </div>
                </div>
                
                <div class="card">
                    <h2>Website Collection Hierarchy</h2>
                    <p>This visualization shows the hierarchical structure of collections as displayed on the Zotero website:</p>
                    <div class="visualization">
                        <img src="website_hierarchy.png" alt="Website Collection Hierarchy">
                    </div>
                </div>
                
                <div class="card">
                    <h2>Collection Overlap Analysis</h2>
                    <p>This heatmap shows the percentage of items from Portal collections that overlap with Search collections:</p>
                    <div class="visualization">
                        <img src="collection_overlap_heatmap.png" alt="Collection Overlap Heatmap">
                    </div>
                </div>
                
                <div class="card">
                    <h2>Document Types Distribution</h2>
                    <div class="visualization">
                        <img src="document_types.png" alt="Document Types Distribution">
                    </div>
                </div>
                
                <div class="card">
                    <h2>Potential Collection Gaps</h2>
                    <p>These collections have the lowest overlap percentage, suggesting potential gaps in coverage:</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Library</th>
                                <th>Collection Path</th>
                                <th>Total Items</th>
                                <th>Overlapping Items</th>
                                <th>Overlap %</th>
                            </tr>
                        </thead>
                        <tbody>
        """
        
        # Add rows for top gap collections
        for _, row in top_gaps.iterrows():
            html_content += f"""
                            <tr>
                                <td>{row['library']}</td>
                                <td>{row['collection_path']}</td>
                                <td>{row['total_items']}</td>
                                <td>{row['overlap_items']}</td>
                                <td>{row['overlap_percentage']}%</td>
                            </tr>
            """
        
        html_content += """
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <h2>Portal Library Collection Hierarchy with Statistics</h2>
                    <table class="hierarchy-table">
                        <thead>
                            <tr>
                                <th>Collection</th>
                                <th>Total Items</th>
                                <th>Overlapping Items</th>
                                <th>Overlap %</th>
                            </tr>
                        </thead>
                        <tbody>
        """
        
        # Add Portal collections with hierarchy
        portal_stats = self.analysis_results['collection_stats'][self.analysis_results['collection_stats']['library'] == 'Portal']
        portal_stats = portal_stats.sort_values(['collection_path'])
        
        for _, row in portal_stats.iterrows():
            depth = row['collection_depth']
            html_content += f"""
                            <tr class="level-{depth}">
                                <td class="indent" style="--depth: {depth}">{row['collection_title']}</td>
                                <td>{row['total_items']}</td>
                                <td>{row['overlap_items']}</td>
                                <td>{row['overlap_percentage']}%</td>
                            </tr>
            """
        
        html_content += """
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <h2>Search Library Collection Hierarchy with Statistics</h2>
                    <table class="hierarchy-table">
                        <thead>
                            <tr>
                                <th>Collection</th>
                                <th>Total Items</th>
                                <th>Overlapping Items</th>
                                <th>Overlap %</th>
                            </tr>
                        </thead>
                        <tbody>
        """
        
        # Add Search collections with hierarchy
        search_stats = self.analysis_results['collection_stats'][self.analysis_results['collection_stats']['library'] == 'Search']
        search_stats = search_stats.sort_values(['collection_path'])
        
        for _, row in search_stats.iterrows():
            depth = row['collection_depth']
            html_content += f"""
                            <tr class="level-{depth}">
                                <td class="indent" style="--depth: {depth}">{row['collection_title']}</td>
                                <td>{row['total_items']}</td>
                                <td>{row['overlap_items']}</td>
                                <td>{row['overlap_percentage']}%</td>
                            </tr>
            """
        
        html_content += """
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <h2>Data Export</h2>
                    <p>The following files have been generated:</p>
                    <ul>
                        <li><a href="matched_records.csv" download>Matched Records (CSV)</a></li>
                        <li><a href="collection_analysis.csv" download>Collection Analysis (CSV)</a></li>
                        <li><a href="gap_analysis.csv" download>Gap Analysis (CSV)</a></li>
                        <li><a href="title_collections.csv" download>Title-Collections Mapping (CSV)</a></li>
                        <li><a href="website_hierarchy.csv" download>Website Collection Hierarchy (CSV)</a></li>
                        <li><a href="analysis_results.json" download>Analysis Results (JSON)</a></li>
                        <li><a href="library_overlap.png" download>Library Overlap Visualization (PNG)</a></li>
                        <li><a href="document_types.png" download>Document Types Distribution (PNG)</a></li>
                        <li><a href="collection_distribution.png" download>Collection Distribution (PNG)</a></li>
                        <li><a href="website_hierarchy.png" download>Website Collection Hierarchy (PNG)</a></li>
                        <li><a href="collection_overlap_heatmap.png" download>Collection Overlap Heatmap (PNG)</a></li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        """
        
        with open(output_path, 'w') as f:
            f.write(html_content)
        
        print(f"HTML interface generated at {output_path}")
        
        return output_path


def main():
    """
    Main function to run the Zotero library comparison.
    """
    # Set paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    portal_rdf = os.path.join(base_dir, 'Nechako Portal', 'Nechako Portal.rdf')
    portal_xml = os.path.join(base_dir, 'Nechako Portal', 'Deduplicator', 'Untitled_deduplicated 2024-12-02_Time0909.xml')
    
    search_rdf = os.path.join(base_dir, 'Nechako Saturation Search', 'Nechako Saturation Search (2024-04).rdf')
    search_xml = os.path.join(base_dir, 'Nechako Saturation Search', 'Deduplicator', 'Untitled_deduplicated 2024-12-02_Time0911.xml')
    
    output_dir = os.path.join(base_dir, 'output')
    
    # Website hierarchy mapping file
    website_hierarchy_file = os.path.join(base_dir, 'collection_mapping.json')
    
    # Create analyzer
    analyzer = ZoteroLibraryAnalyzer(output_dir, website_hierarchy_file)
    
    # Process libraries
    analyzer.process_libraries(portal_rdf, portal_xml, search_rdf, search_xml)
    
    # Generate HTML interface
    html_path = analyzer.generate_html_interface()
    
    print(f"\nZotero Library Comparison with Website Collection Hierarchy completed successfully!")
    print(f"HTML interface available at: {html_path}")
    print(f"All output files are in: {output_dir}")


if __name__ == "__main__":
    main()
