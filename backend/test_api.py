import requests
import json

BASE = "http://localhost:5000"

# Test ping
print("=== PING ===")
try:
    r = requests.get(f"{BASE}/api/ping")
    print(f"Status: {r.status_code}")
    print(f"Body: {r.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test register
print("\n=== REGISTER ===")
try:
    r = requests.post(f"{BASE}/api/auth/register", json={
        "name": "Admin",
        "email": "admin@smademic.com",
        "password": "admin123",
        "role": "admin"
    })
    print(f"Status: {r.status_code}")
    print(f"Body: {r.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test login
print("\n=== LOGIN ===")
try:
    r = requests.post(f"{BASE}/api/auth/login", json={
        "email": "admin@smademic.com",
        "password": "admin123"
    })
    print(f"Status: {r.status_code}")
    print(f"Body: {r.json()}")
    if r.status_code == 200:
        print(f"\nTOKEN: {r.json()['token']}")
except Exception as e:
    print(f"Error: {e}")
