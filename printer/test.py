"""
Test script for biblio-server API connection
Tests authentication and basic API calls
"""

import api_client
import env

def test_api_connection():
    """Test API connection and authentication"""
    print("=" * 60)
    print("Biblio Server API Connection Test")
    print("=" * 60)
    print(f"\nServer URL: {env.APP_HOST}")

    # Check if API key is configured
    if not hasattr(env, 'API_KEY') or not env.API_KEY:
        print("\n⚠️  WARNING: No API_KEY configured in env.py")
        print("    Add your API key to env.py:")
        print("    API_KEY = \"your-api-key-here\"")
        print("\n    Get an API key from your server administrator.")
        return False

    print(f"API Key: {env.API_KEY[:10]}..." if len(env.API_KEY) > 10 else f"API Key: {env.API_KEY}")

    try:
        # Create API client
        client = api_client.BiblioAPIClient()

        # Test 1: Get CSRF token
        print("\n[1/3] Testing CSRF token retrieval...")
        csrf_token = client.get_csrf_token()
        print(f"✅ CSRF Token received: {csrf_token[:20]}...")

        # Test 2: Test API authentication with a simple query
        print("\n[2/3] Testing API authentication...")
        data = client.get_tirada_range(1, 1)
        print(f"✅ Authentication successful!")
        print(f"    Retrieved {len(data)} record(s)")

        # Test 3: Display first record if available
        if data and len(data) > 0:
            print("\n[3/3] Sample data retrieved:")
            record = data[0]
            print(f"    Member: {record.get('nombre', 'N/A')}")
            print(f"    Group: {record.get('grupo', 'N/A')}")
            print(f"    Amount: ${record.get('cuota_value', 'N/A')}")
        else:
            print("\n[3/3] No data available (empty result)")

        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nYour printer client is ready to use.")
        return True

    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ TEST FAILED!")
        print("=" * 60)
        print(f"\nError: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check server is running")
        print("2. Check APP_HOST is correct in env.py")
        print("3. Check API_KEY is valid (not expired or revoked)")
        print("4. Check firewall allows connection to server")
        return False

if __name__ == "__main__":
    test_api_connection()