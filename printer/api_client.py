"""
Biblio Server API Client
Handles authentication (API Key or JWT) and CSRF token management
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import env

class BiblioAPIClient:
    """
    API client for biblio-server with authentication and CSRF support
    """

    def __init__(self, base_url=None, api_key=None):
        """
        Initialize API client

        Args:
            base_url: Server URL (default: from env.py)
            api_key: API key for authentication (default: from env.py)
        """
        self.base_url = base_url or getattr(env, 'APP_HOST', 'http://admin.abr.net:3000')
        self.api_key = api_key or getattr(env, 'API_KEY', None)
        self.csrf_token = None
        self.jwt_token = None

    def _make_request(self, url, method='GET', data=None, headers=None):
        """
        Make HTTP request with proper headers

        Args:
            url: Full URL to request
            method: HTTP method (GET, POST, etc.)
            data: Request body data (dict or bytes)
            headers: Additional headers (dict)

        Returns:
            Parsed JSON response

        Raises:
            urllib.error.HTTPError: On HTTP errors
            urllib.error.URLError: On connection errors
        """
        if headers is None:
            headers = {}

        # Add authentication header
        if self.api_key:
            headers['X-API-Key'] = self.api_key
        elif self.jwt_token:
            headers['Authorization'] = f'Bearer {self.jwt_token}'

        # Add CSRF token if available
        if self.csrf_token and method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            headers['X-CSRF-Token'] = self.csrf_token

        # Add content type for JSON data
        if data and not isinstance(data, bytes):
            headers['Content-Type'] = 'application/json'
            data = json.dumps(data).encode('utf-8')

        # Create request
        request = urllib.request.Request(
            url,
            data=data,
            headers=headers,
            method=method
        )

        # Make request
        try:
            response = urllib.request.urlopen(request)
            response_data = response.read()

            # Parse JSON response
            if response_data:
                return json.loads(response_data)
            return None

        except urllib.error.HTTPError as e:
            # Read error response
            error_data = e.read()
            try:
                error_json = json.loads(error_data)
                raise Exception(f"HTTP {e.code}: {error_json.get('error', str(e))}")
            except:
                raise Exception(f"HTTP {e.code}: {str(e)}")

        except urllib.error.URLError as e:
            raise Exception(f"Connection error: {str(e)}")

    def get_csrf_token(self):
        """
        Get CSRF token from server

        Returns:
            CSRF token string

        Raises:
            Exception: If CSRF token retrieval fails
        """
        url = f"{self.base_url}/api/csrf-token"
        try:
            response = self._make_request(url, method='GET')
            if response and 'csrfToken' in response:
                self.csrf_token = response['csrfToken']
                return self.csrf_token
            else:
                raise Exception("CSRF token not found in response")
        except Exception as e:
            raise Exception(f"Failed to get CSRF token: {str(e)}")

    def login(self, username, password):
        """
        Login with username/password and get JWT token

        Args:
            username: Username
            password: Password

        Returns:
            dict: Login response with tokens and user info

        Raises:
            Exception: If login fails
        """
        # Get CSRF token first
        self.get_csrf_token()

        url = f"{self.base_url}/api/auth/login"
        data = {
            'username': username,
            'password': password
        }

        try:
            response = self._make_request(url, method='POST', data=data)

            # Store JWT token
            if response and 'accessToken' in response:
                self.jwt_token = response['accessToken']

            return response

        except Exception as e:
            raise Exception(f"Login failed: {str(e)}")

    def get_tirada_range(self, start_id, end_id):
        """
        Get tirada (fee collection) records by ID range

        Args:
            start_id: Starting ID
            end_id: Ending ID

        Returns:
            list: Tirada records

        Raises:
            Exception: If request fails
        """
        url = f"{self.base_url}/api/tirada/start/{start_id}/end/{end_id}"
        return self._make_request(url, method='GET')

    def get_tirada_page(self, page, per_page=8):
        """
        Get tirada records by page number

        Args:
            page: Page number
            per_page: Records per page (default: 8)

        Returns:
            list: Tirada records

        Raises:
            Exception: If request fails
        """
        url = f"{self.base_url}/api/tirada/page/{page}"
        return self._make_request(url, method='GET')

    def get_tirada_custom(self, cc_ids):
        """
        Get tirada records by custom ID list

        Args:
            cc_ids: List of cobrocuotas IDs (up to 8)

        Returns:
            list: Tirada records

        Raises:
            Exception: If request fails
        """
        # Pad to 8 IDs with -1
        padded_ids = list(cc_ids) + [-1] * (8 - len(cc_ids))
        padded_ids = padded_ids[:8]  # Limit to 8

        ids_str = '/'.join(str(id) for id in padded_ids)
        url = f"{self.base_url}/api/tirada/custom/{ids_str}"
        return self._make_request(url, method='GET')


# Convenience functions for backward compatibility

def get_tirada_data(start_id, end_id):
    """
    Get tirada data by ID range (convenience function)

    Args:
        start_id: Starting ID
        end_id: Ending ID

    Returns:
        list: Tirada records
    """
    client = BiblioAPIClient()
    return client.get_tirada_range(start_id, end_id)

def get_tirada_by_page(page):
    """
    Get tirada data by page (convenience function)

    Args:
        page: Page number

    Returns:
        list: Tirada records
    """
    client = BiblioAPIClient()
    return client.get_tirada_page(page)

def get_tirada_by_ids(cc_ids):
    """
    Get tirada data by custom IDs (convenience function)

    Args:
        cc_ids: List of cobrocuotas IDs

    Returns:
        list: Tirada records
    """
    client = BiblioAPIClient()
    return client.get_tirada_custom(cc_ids)


# Example usage
if __name__ == "__main__":
    # Test API client
    print("Testing Biblio API Client...")
    print(f"Server: {env.APP_HOST}")

    try:
        client = BiblioAPIClient()

        # Test 1: Get CSRF token
        print("\n1. Getting CSRF token...")
        csrf = client.get_csrf_token()
        print(f"   CSRF Token: {csrf[:20]}...")

        # Test 2: Get tirada data (using API key)
        if hasattr(env, 'API_KEY') and env.API_KEY:
            print("\n2. Getting tirada data (range)...")
            data = client.get_tirada_range(1, 10)
            print(f"   Retrieved {len(data)} records")

            if data:
                print(f"   First record: {data[0].get('nombre', 'N/A')}")
        else:
            print("\n2. Skipping tirada test (no API_KEY in env.py)")

        print("\n✅ API client test completed successfully!")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
