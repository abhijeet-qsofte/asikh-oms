#!/usr/bin/env python3
"""
Script to apply authentication bypass to all API route files
"""
import os
import re
import glob

# Path to the API routes directory
ROUTES_DIR = os.path.join('app', 'api', 'routes')

# Pattern to match import statements for authentication
IMPORT_PATTERN = r'from app\.core\.security import (get_current_user|check_user_role)'

# Pattern to match authentication dependencies in route handlers
AUTH_PATTERN = r'current_user: User = Depends\((get_current_user|check_user_role\([^)]+\))\)'

# Replacement for import statements
IMPORT_REPLACEMENT = """from app.core.security import get_current_user, check_user_role
from app.core.bypass_auth import get_bypass_user, check_bypass_role

# Use bypass authentication instead of real authentication
use_bypass_auth = True
get_user = get_bypass_user if use_bypass_auth else get_current_user
check_role = check_bypass_role if use_bypass_auth else check_user_role"""

def process_file(file_path):
    """Process a single API route file to apply authentication bypass"""
    print(f"Processing {file_path}...")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Skip files that don't use authentication
    if 'get_current_user' not in content and 'check_user_role' not in content:
        print(f"  Skipping {file_path} - no authentication used")
        return
    
    # Add bypass authentication imports
    if 'from app.core.bypass_auth import' not in content:
        content = re.sub(
            IMPORT_PATTERN,
            lambda m: IMPORT_REPLACEMENT,
            content,
            count=1
        )
    
    # Replace authentication dependencies
    content = content.replace('current_user: User = Depends(get_current_user)', 
                             'current_user: User = Depends(get_user)')
    
    # Replace role-based authentication dependencies
    content = re.sub(
        r'current_user: User = Depends\(check_user_role\(([^)]+)\)\)',
        lambda m: f'current_user: User = Depends(check_role({m.group(1)}))',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"  Updated {file_path}")

def main():
    """Apply authentication bypass to all API route files"""
    print("Applying authentication bypass to all API route files...")
    
    # Process all Python files in the routes directory
    route_files = glob.glob(os.path.join(ROUTES_DIR, '*.py'))
    
    for file_path in route_files:
        if os.path.basename(file_path) != '__init__.py':
            process_file(file_path)
    
    print("Done!")

if __name__ == '__main__':
    main()
