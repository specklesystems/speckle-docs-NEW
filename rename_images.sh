#!/bin/bash

# Function to process each line from the mapping file
process_mapping() {
    local old_name="$1"
    local new_name="$2"
    local mdx_file="$3"
    local line_num="$4"
    local alt_text="$5"
    
    # Find the image in the legacy/user/img* directories
    local old_path=$(find legacy/user/img* -name "$old_name" -type f)
    
    if [ -z "$old_path" ]; then
        echo "Warning: Could not find $old_name"
        return
    fi
    
    # Get the directory of the old file
    local dir=$(dirname "$old_path")
    
    # Create the new path
    local new_path="$dir/$new_name"
    
    # Rename the file
    echo "Renaming $old_path to $new_path"
    mv "$old_path" "$new_path"
    
    # Update the MDX file
    if [ -f "legacy/user/$mdx_file" ]; then
        # Create a temporary file
        local temp_file=$(mktemp)
        
        # Process the file line by line
        awk -v line="$line_num" -v old_url="https://user-images.githubusercontent.com/[^)]*$old_name" -v new_path="./$(basename "$dir")/$new_name" '
            NR == line {
                # Replace the GitHub URL with the local path
                gsub(old_url, new_path)
            }
            { print }
        ' "legacy/user/$mdx_file" > "$temp_file"
        
        # Replace the original file
        mv "$temp_file" "legacy/user/$mdx_file"
        
        echo "Updated references in $mdx_file"
    else
        echo "Warning: Could not find $mdx_file"
    fi
}

# Read the mapping file and process each line
while IFS='|' read -r old_name new_name mdx_file line_num alt_text; do
    # Skip comments and empty lines
    [[ $old_name =~ ^#.*$ || -z $old_name ]] && continue
    
    process_mapping "$old_name" "$new_name" "$mdx_file" "$line_num" "$alt_text"
done < image_mapping.txt 