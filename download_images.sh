#!/bin/bash

set -e  # Exit on error
set -x  # Print commands as they execute

echo "Starting image download process..."

# Create a temporary file to store image URLs
TEMP_FILE=$(mktemp)
echo "Created temporary file: $TEMP_FILE"

# Find all GitHub image URLs in MDX files
echo "Searching for image URLs in MDX files..."
find legacy/user -name "*.mdx" -exec grep -o 'https://user-images.githubusercontent.com/[^" ]*\.\(png\|jpg\|jpeg\|gif\|svg\)' {} \; | sort -u > "$TEMP_FILE"

# Count URLs found
url_count=$(wc -l < "$TEMP_FILE")
echo "Found $url_count image URLs to process"

# Process each URL
while read -r url; do
    # Skip empty lines
    [ -z "$url" ] && continue
    
    echo "Processing URL: $url"
    
    # Extract filename from URL
    filename=$(basename "$url")
    echo "Filename: $filename"
    
    # Determine which directory to use based on the MDX file that contains this image
    echo "Finding MDX file containing this URL..."
    mdx_file=$(grep -l "$url" legacy/user/*.mdx | head -n 1)
    echo "Found in MDX file: $mdx_file"
    
    if [[ $mdx_file == *"grasshopper"* ]]; then
        target_dir="legacy/user/img-gh"
    elif [[ $mdx_file == *"dynamo"* ]]; then
        target_dir="legacy/user/img-dyn"
    elif [[ $mdx_file == *"unity"* ]]; then
        target_dir="legacy/user/img-unity"
    elif [[ $mdx_file == *"rhino"* ]]; then
        target_dir="legacy/user/img-rhino"
    elif [[ $mdx_file == *"revit"* ]]; then
        target_dir="legacy/user/img-revit"
    elif [[ $mdx_file == *"excel"* ]]; then
        target_dir="legacy/user/img-excel"
    elif [[ $mdx_file == *"blender"* ]]; then
        target_dir="legacy/user/img-blender"
    elif [[ $mdx_file == *"navisworks"* ]]; then
        target_dir="legacy/user/img-navisworks"
    elif [[ $mdx_file == *"sketchup"* ]]; then
        target_dir="legacy/user/img-sketchup"
    elif [[ $mdx_file == *"mapping-tool"* ]]; then
        target_dir="legacy/user/img-mapping"
    else
        # Default to img directory if no specific match
        target_dir="legacy/user/img"
    fi
    
    echo "Target directory: $target_dir"
    
    # Create directory if it doesn't exist
    mkdir -p "$target_dir"
    
    # Download the image if it doesn't exist
    if [ ! -f "$target_dir/$filename" ]; then
        echo "Downloading $filename to $target_dir"
        # Use wget instead of curl with GitHub token
        wget --header="Authorization: token $GITHUB_TOKEN" \
             --header="Accept: application/vnd.github.v3.raw" \
             -O "$target_dir/$filename" \
             "$url"
        if [ $? -ne 0 ]; then
            echo "Failed to download $url to $target_dir/$filename"
        fi
    else
        echo "File $filename already exists in $target_dir"
    fi
done < "$TEMP_FILE"

# Clean up
echo "Cleaning up temporary file..."
rm "$TEMP_FILE"
echo "Done!" 