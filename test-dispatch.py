#!/usr/bin/env python3
import requests
import json
import uuid
from datetime import datetime, timedelta

# Configuration
API_URL = "https://asikh-oms-test-cd0577c5c937.herokuapp.com"
BATCH_ID = "14869c82-c701-4cd4-82c9-1fbc05437afb"  # Replace with your actual batch ID

# Test data
dispatch_data = {
    "vehicle_type": "truck",
    "driver_name": "Test Driver",
    "eta": (datetime.now() + timedelta(hours=2)).isoformat(),
    "notes": "Test dispatch from script"
}

def test_dispatch_endpoint():
    """Test the dispatch endpoint with various URL patterns"""
    
    # Define the endpoints to test
    endpoints = [
        f"/api/batches/{BATCH_ID}/dispatch",
        f"/api/batches/direct/{BATCH_ID}/dispatch",
        f"/api/batches/{BATCH_ID}/depart",  # Known working endpoint for comparison
    ]
    
    for endpoint in endpoints:
        url = f"{API_URL}{endpoint}"
        print(f"\nTesting endpoint: {url}")
        
        try:
            response = requests.post(
                url,
                json=dispatch_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text[:200]}...")  # Print first 200 chars
            
            if response.status_code == 200:
                print("SUCCESS: Endpoint is working!")
            
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("Starting dispatch endpoint tests...")
    test_dispatch_endpoint()
    print("\nTests completed.")
