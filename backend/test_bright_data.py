#!/usr/bin/env python3
"""
Test script to debug Bright Data API integration
"""
import os
import asyncio
import json
from dotenv import load_dotenv
from services.bright_data_mcp_service import BrightDataMCPService

# Load environment variables
load_dotenv()

async def test_bright_data():
    """Test Bright Data API directly"""
    print("🔍 Testing Bright Data API...")
    
    # Check environment variables (multiple possible names)
    api_key = (os.getenv('BRIGHTDATA_API_TOKEN') or 
               os.getenv('BRIGHT_DATA_API_TOKEN') or 
               os.getenv('BRIGHT_DATA_API_KEY'))
    
    print(f"🔑 API Key present: {'✅ Yes' if api_key else '❌ Missing'}")
    
    if not api_key:
        print("❌ No Bright Data API token found in environment")
        print("💡 Add one of these to your .env file:")
        print("   BRIGHTDATA_API_TOKEN=your_token")
        print("   BRIGHT_DATA_API_TOKEN=your_token") 
        print("   BRIGHT_DATA_API_KEY=your_token")
    
    # Test the service
    service = BrightDataMCPService()
    async with service:
        try:
            print("\n📰 Testing fetch_latest_news...")
            news = await service.fetch_latest_news(category="technology", page_size=5)
            print(f"✅ Got {len(news)} news items")
            
            if news:
                print("📋 First item:")
                print(json.dumps(news[0], indent=2))
            else:
                print("❌ No news items returned")
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_bright_data())
