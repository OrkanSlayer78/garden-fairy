#!/usr/bin/env python3
"""
Simple OpenAI API Key Test
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_openai_key():
    """Test OpenAI API key with minimal setup"""
    
    # Check if key exists
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY not found in .env file")
        print("📋 Add: OPENAI_API_KEY=sk-your-key-here to .env")
        return False
    
    print(f"✅ API Key found (length: {len(api_key)})")
    print(f"✅ Key starts with: {api_key[:7]}...")
    
    # Test import
    try:
        import openai
        print("✅ OpenAI library imported successfully")
    except ImportError as e:
        print(f"❌ OpenAI library import failed: {e}")
        print("📋 Run: pip install openai")
        return False
    
    # Test simple client creation and call
    try:
        print("\n🔍 Testing OpenAI client...")
        
        # Create client - try different approaches
        client = openai.OpenAI(api_key=api_key)
        
        print("✅ Client created successfully")
        
        # Simple test call
        print("🔍 Testing API call...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Reply with just the word 'SUCCESS'"}
            ],
            max_tokens=5
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✅ API Response: {result}")
        print("🎉 OpenAI API is working perfectly!")
        return True
        
    except Exception as e:
        print(f"❌ OpenAI API Error: {e}")
        print(f"Error type: {type(e).__name__}")
        
        # Specific error handling
        if "authentication" in str(e).lower():
            print("🔧 Fix: Check your API key is correct")
        elif "quota" in str(e).lower():
            print("🔧 Fix: Add credits to your OpenAI account")
        elif "rate" in str(e).lower():
            print("🔧 Fix: Wait a moment and try again")
        elif "proxies" in str(e).lower():
            print("🔧 Fix: This is a library/environment issue")
        
        return False

if __name__ == "__main__":
    print("🧪 OpenAI API Key Test")
    print("=" * 30)
    
    success = test_openai_key()
    
    if success:
        print("\n✅ Your OpenAI key is working! Safe to use in Railway.")
    else:
        print("\n❌ Fix the issues above before deploying to Railway.") 