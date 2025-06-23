#!/usr/bin/env python3
"""
Setup script for Garden Fairy application.
This script initializes the database with sample data.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

def setup_database():
    """Initialize the database with sample data."""
    print("🌱 Setting up Garden Fairy database...")
    
    try:
        # Change to backend directory
        os.chdir(backend_dir)
        
        # Import after changing directory
        from app import create_app, init_sample_data
        from models import db
        
        app = create_app()
        
        with app.app_context():
            # Create all tables
            print("📦 Creating database tables...")
            db.create_all()
            
            # Initialize sample data
            print("🌿 Adding sample plant types...")
            init_sample_data(app)
            
        print("✅ Database setup complete!")
        print("\n🚀 Next steps:")
        print("1. Set up your Google OAuth credentials in backend/env_example.txt")
        print("2. Copy backend/env_example.txt to backend/.env and fill in your values")
        print("3. Copy frontend/env_example.txt to frontend/.env and fill in your values")
        print("4. Start the backend: cd backend && python app.py")
        print("5. Start the frontend: cd frontend && npm start")
        
    except ImportError as e:
        print(f"❌ Error importing modules: {e}")
        print("Make sure you're in the project root directory and have installed Python dependencies.")
        print("Run: cd backend && pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False
    
    return True

def check_requirements():
    """Check if required files exist."""
    required_files = [
        'backend/requirements.txt',
        'backend/app.py',
        'backend/models.py',
        'frontend/package.json',
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing required files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    
    return True

if __name__ == "__main__":
    print("🌱 Garden Fairy Setup Script")
    print("=" * 40)
    
    if not check_requirements():
        print("\n❌ Setup cannot continue due to missing files.")
        sys.exit(1)
    
    if setup_database():
        print("\n🎉 Setup completed successfully!")
        print("Happy gardening! 🌻")
    else:
        print("\n❌ Setup failed.")
        sys.exit(1) 