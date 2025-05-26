# fix_null_checks.py
import os
import re

def add_null_checks_to_batch_detail():
    """Add null checks to the batch detail endpoint to prevent 'bind value at index 1 null' errors"""
    file_path = os.path.join('app', 'api', 'routes', 'batches.py')
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return False
    
    with open(file_path, 'r') as file:
        content = file.read()
    
    # Find the get_batch function
    get_batch_pattern = r'@router\.get\("/{batch_id}", response_model=BatchResponse\)(.*?)def get_batch\((.*?)\):(.*?)# Get related entities(.*?)supervisor = db\.query\(User\)\.filter\(User\.id == batch\.supervisor_id\)\.first\(\)(.*?)farm = db\.query\(Farm\)\.filter\(Farm\.id == batch\.from_location\)\.first\(\)(.*?)packhouse = db\.query\(Packhouse\)\.filter\(Packhouse\.id == batch\.to_location\)\.first\(\)'
    
    # Replace with null-checked version
    replacement = r'@router.get("/{batch_id}", response_model=BatchResponse)\1def get_batch(\2):\3# Get related entities with null checks\n    supervisor = None\n    farm = None\n    packhouse = None\n    \n    if batch.supervisor_id is not None:\n        supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()\n    \n    if batch.from_location is not None:\n        farm = db.query(Farm).filter(Farm.id == batch.from_location).first()\n    \n    if batch.to_location is not None:\n        packhouse = db.query(Packhouse).filter(Packhouse.id == batch.to_location).first()'
    
    # Use re.DOTALL to match across multiple lines
    updated_content = re.sub(get_batch_pattern, replacement, content, flags=re.DOTALL)
    
    if updated_content == content:
        print("Warning: No changes were made. Pattern not found.")
        
        # Try a more targeted approach
        simple_pattern = r'# Get related entities\s+supervisor = db\.query\(User\)\.filter\(User\.id == batch\.supervisor_id\)\.first\(\)\s+farm = db\.query\(Farm\)\.filter\(Farm\.id == batch\.from_location\)\.first\(\)\s+packhouse = db\.query\(Packhouse\)\.filter\(Packhouse\.id == batch\.to_location\)\.first\(\)'
        
        simple_replacement = """# Get related entities with null checks
    supervisor = None
    farm = None
    packhouse = None
    
    if batch.supervisor_id is not None:
        supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    
    if batch.from_location is not None:
        farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
    
    if batch.to_location is not None:
        packhouse = db.query(Packhouse).filter(Packhouse.id == batch.to_location).first()"""
        
        updated_content = re.sub(simple_pattern, simple_replacement, content, flags=re.DOTALL)
        
        if updated_content == content:
            print("Error: Could not update the file with the simple pattern either.")
            return False
    
    with open(file_path, 'w') as file:
        file.write(updated_content)
    
    print("Successfully added null checks to the batch detail endpoint.")
    return True

def add_null_checks_to_batch_stats():
    """Add null checks to the batch stats endpoint to prevent 'bind value at index 1 null' errors"""
    file_path = os.path.join('app', 'api', 'routes', 'batches.py')
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return False
    
    with open(file_path, 'r') as file:
        content = file.read()
    
    # Find the get_batch_stats function
    pattern = r'@router\.get\("/{batch_id}/stats", response_model=BatchStatsResponse\)(.*?)def get_batch_stats\((.*?)\):'
    
    # Check if the function exists
    if not re.search(pattern, content, re.DOTALL):
        print("Warning: get_batch_stats function not found.")
        return False
    
    # Find the query patterns that might cause null errors
    query_patterns = [
        r'db\.query\(Crate\)\.filter\(Crate\.batch_id == batch_id\)',
        r'db\.query\(func\.count\(Crate\.id\)\)\.filter\(Crate\.batch_id == batch_id\)',
        r'db\.query\(func\.sum\(Crate\.weight\)\)\.filter\(Crate\.batch_id == batch_id\)'
    ]
    
    # Add null checks to each query
    for pattern in query_patterns:
        updated_content = re.sub(
            pattern,
            f'db.query(Crate).filter(Crate.batch_id == batch_id) if batch_id is not None else db.query(Crate).filter(False)',
            content
        )
        if updated_content != content:
            content = updated_content
            print(f"Added null check to {pattern}")
    
    with open(file_path, 'w') as file:
        file.write(content)
    
    print("Successfully added null checks to the batch stats endpoint.")
    return True

def add_null_checks_to_user_management():
    """Add null checks to user management endpoints to prevent 'bind value at index 1 null' errors"""
    file_path = os.path.join('app', 'api', 'routes', 'users.py')
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return False
    
    with open(file_path, 'r') as file:
        content = file.read()
    
    # Find query patterns that might cause null errors
    query_patterns = [
        (r'db\.query\(User\)\.filter\(User\.id == user_id\)', 
         r'db.query(User).filter(User.id == user_id) if user_id is not None else db.query(User).filter(False)'),
        (r'db\.query\(User\)\.filter\(User\.username == username\)', 
         r'db.query(User).filter(User.username == username) if username is not None else db.query(User).filter(False)'),
        (r'db\.query\(User\)\.filter\(User\.email == email\)', 
         r'db.query(User).filter(User.email == email) if email is not None else db.query(User).filter(False)')
    ]
    
    # Add null checks to each query
    for pattern, replacement in query_patterns:
        updated_content = re.sub(pattern, replacement, content)
        if updated_content != content:
            content = updated_content
            print(f"Added null check to {pattern}")
    
    with open(file_path, 'w') as file:
        file.write(content)
    
    print("Successfully added null checks to user management endpoints.")
    return True

if __name__ == "__main__":
    print("Adding null checks to prevent 'bind value at index 1 null' errors...")
    add_null_checks_to_batch_detail()
    add_null_checks_to_batch_stats()
    add_null_checks_to_user_management()
    print("Done!")
