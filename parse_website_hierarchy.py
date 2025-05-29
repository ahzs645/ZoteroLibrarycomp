#!/usr/bin/env python3
"""
Parse Zotero Website Collection Hierarchy

This script parses the HTML structure of the Zotero website's collection tree
to extract the true hierarchical structure of collections.
"""

import os
import re
import json
import pandas as pd
from bs4 import BeautifulSoup

def parse_collection_hierarchy(html_file):
    """
    Parse the HTML structure of the Zotero website's collection tree.
    
    Args:
        html_file (str): Path to the HTML file containing the collection tree
        
    Returns:
        dict: Hierarchical structure of collections
    """
    # Read the HTML file
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Parse the HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract the collection tree
    collection_tree = {}
    
    # Find all collection items
    collection_items = soup.find_all('li', class_='collection')
    
    # Extract collection information
    for item in collection_items:
        # Get collection ID
        collection_id = item.find('div', class_='item-container').get('data-collection-key')
        
        # Get collection title
        title_div = item.find('div', class_='truncate')
        collection_title = title_div.get('title') if title_div else "Unknown"
        
        # Determine level based on aria-level attribute
        level = int(item.find('div', class_='item-container').get('aria-level', 2))
        
        # Check if it has a parent (expanded attribute)
        is_expanded = item.find('div', class_='item-container').get('aria-expanded')
        has_children = is_expanded is not None
        
        # Add to collection tree
        collection_tree[collection_id] = {
            'title': collection_title,
            'level': level,
            'has_children': has_children,
            'children': []
        }
    
    # Build parent-child relationships
    for item in collection_items:
        # Get collection ID
        collection_id = item.find('div', class_='item-container').get('data-collection-key')
        
        # Find parent based on DOM structure
        parent_item = item.find_parent('li', class_='collection')
        if parent_item:
            parent_id = parent_item.find('div', class_='item-container').get('data-collection-key')
            if parent_id in collection_tree:
                collection_tree[parent_id]['children'].append(collection_id)
    
    return collection_tree

def extract_full_paths(collection_tree):
    """
    Extract full paths for each collection.
    
    Args:
        collection_tree (dict): Hierarchical structure of collections
        
    Returns:
        dict: Collection IDs mapped to their full paths
    """
    paths = {}
    
    def build_path(collection_id, current_path=""):
        if collection_id not in collection_tree:
            return
        
        collection = collection_tree[collection_id]
        title = collection['title']
        
        # Build the path
        if current_path:
            full_path = f"{current_path}/{title}"
        else:
            full_path = title
        
        # Store the path
        paths[collection_id] = full_path
        
        # Process children
        for child_id in collection['children']:
            build_path(child_id, full_path)
    
    # Start with root collections (level 2)
    for collection_id, collection in collection_tree.items():
        if collection['level'] == 2:  # Root level in the website hierarchy
            build_path(collection_id)
    
    return paths

def create_collection_mapping(html_file, output_file):
    """
    Create a mapping between collection IDs and their full paths.
    
    Args:
        html_file (str): Path to the HTML file containing the collection tree
        output_file (str): Path to save the mapping
        
    Returns:
        dict: Collection IDs mapped to their full paths
    """
    # Parse the collection hierarchy
    collection_tree = parse_collection_hierarchy(html_file)
    
    # Extract full paths
    paths = extract_full_paths(collection_tree)
    
    # Save the mapping
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(paths, f, indent=2)
    
    print(f"Collection mapping saved to {output_file}")
    
    return paths

def main():
    """
    Main function to parse the website hierarchy.
    """
    # Set paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_file = os.path.join(base_dir, 'website_hierarchy.html')
    output_file = os.path.join(base_dir, 'collection_mapping.json')
    
    # Create the HTML file from the pasted content
    with open(html_file, 'w', encoding='utf-8') as f:
        with open('/home/ubuntu/upload/pasted_content.txt', 'r', encoding='utf-8') as src:
            f.write(src.read())
    
    # Create the collection mapping
    paths = create_collection_mapping(html_file, output_file)
    
    # Print the mapping
    print("\nCollection Hierarchy:")
    for collection_id, path in paths.items():
        print(f"{collection_id}: {path}")

if __name__ == "__main__":
    main()
