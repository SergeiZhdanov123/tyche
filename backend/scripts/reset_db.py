#!/usr/bin/env python3
"""
Reset script for Tyche Backend database
Clears API keys so you can test fresh key generation

Usage: python scripts/reset_db.py
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from db import SessionLocal, engine, Base
from models import APIKey

def reset_database():
    print("🔄 Resetting backend database...")
    
    try:
        with SessionLocal() as db:
            # Count existing keys
            count = db.query(APIKey).count()
            print(f"📊 Found {count} existing API keys")
            
            # Delete all API keys
            db.query(APIKey).delete()
            db.commit()
            print("🗑️  Deleted all API keys")
        
        print("\n✅ Backend database reset complete!")
        print("API key table is now empty.\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_database()
