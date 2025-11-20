# Printer Client Documentation Index

## Quick Reference

Start here based on your needs:

| I want to... | Read this document |
|-------------|-------------------|
| **Get started quickly** | [QUICKSTART.md](QUICKSTART.md) |
| **Deploy with portable Python** | [PORTABLE_DEPLOYMENT.md](PORTABLE_DEPLOYMENT.md) ⭐ RECOMMENDED |
| **Setup API authentication** | [API_AUTHENTICATION.md](API_AUTHENTICATION.md) 🔐 |
| **Understand the architecture** | [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md) |
| **Learn about Python requirements** | [PYTHON_32BIT.md](PYTHON_32BIT.md) |
| **Complete setup guide** | [SETUP.md](SETUP.md) |
| **Full technical documentation** | [README.md](../README.md) |

## Documentation Files

### 1. QUICKSTART.md
**Purpose:** Fast setup and common tasks
**For:** Users who want to get started immediately
**Topics:**
- Quick configuration
- Installing dependencies
- Testing printers
- Common tasks (printing reports, receipts)
- Basic troubleshooting

**Read this if:** You need to get the printer working NOW.

---

### 2. PORTABLE_DEPLOYMENT.md ⭐
**Purpose:** Deploy using portable Python (no system installation)
**For:** System administrators and users who want easy, portable deployment
**Topics:**
- What is portable Python
- Advantages over system installation (no admin rights, no PATH, fully portable)
- Downloading python-3.8.10-embed-win32.zip
- Creating deployment package
- Configuring portable Python for pip
- Installing dependencies
- Creating launcher .bat files
- Testing the package
- Deploying to multiple PCs (network share, USB, download)
- Creating desktop shortcuts
- No environment variables needed
- Updating the application
- Troubleshooting portable Python issues
- File size and optimization

**Read this if:** You want the EASIEST deployment method (recommended for most users).

---

### 3. API_AUTHENTICATION.md 🔐
**Purpose:** Setup API authentication with API keys and CSRF tokens
**For:** All users setting up printer client
**Topics:**
- Authentication methods (API Key vs JWT)
- Getting API key from server admin
- Configuring env.py with API key
- Testing connection
- How authentication works (flow diagram)
- Security features (API key + CSRF protection)
- Using the API client (api_client.py)
- API endpoints reference
- Troubleshooting authentication issues
- Security best practices
- API key management (for admins)
- Migration from old unauthenticated API

**Read this if:** You need to configure API authentication (required for all deployments).

---

### 4. CLIENT_ARCHITECTURE.md
**Purpose:** Explains the client-server architecture
**For:** Developers and system architects
**Topics:**
- System architecture overview
- Client-server separation
- Deployment models
- How the client works (fetch data → print locally)
- Client installation steps
- Future GUI options (Tkinter, PyQt5)
- API authentication
- Network requirements
- Security considerations
- Troubleshooting architecture issues
- Distribution strategies

**Read this if:** You want to understand how the system works architecturally.

---

### 5. PYTHON_32BIT.md
**Purpose:** Comprehensive guide to Python 3.8.10 (32-bit) requirements
**For:** Installers, troubleshooters, and technical support
**Topics:**
- **Why 32-bit is required** (Windows program compatibility)
- Installation instructions
- Package compatibility
- Printer driver compatibility (32-bit vs 64-bit)
- Troubleshooting installation issues
- Fixing common errors (DLL load failed, module not found)
- What to do if 64-bit was installed by mistake
- Performance considerations
- Detailed verification steps

**Read this if:** You have questions about Python version requirements or installation issues.

---

### 6. SETUP.md
**Purpose:** Initial setup guide after printer folder creation
**For:** First-time setup and configuration
**Topics:**
- Next steps after initialization
- Environment configuration (env.py)
- Installing dependencies
- Testing setup (API, printer, thermal)
- Documentation links
- Current configuration status
- Technology stack
- Important notes (Windows vs Linux)
- Security considerations
- Common issues
- Configuration checklist

**Read this if:** You just initialized the printer folder and need to configure it.

---

### 7. README.md
**Purpose:** Complete technical documentation
**For:** Developers and advanced users
**Topics:**
- Overview of the application
- All components (tirada.py, recibo_*.py, test scripts)
- Dependencies and system requirements
- **Python 3.8.10 (32-bit) requirement**
- Installation options (local Windows vs Docker)
- Configuration (env.py)
- Usage examples
- API integration details
- Printer types (Windows vs ESC/POS)
- Troubleshooting
- Development guide
- Deployment overview
- File structure
- Security notes
- Future enhancements

**Read this if:** You need complete technical reference documentation.

---

## Critical Requirements

### ⚠️ Python Version: 3.8.10 (32-bit ONLY)

**This is NON-NEGOTIABLE and documented in:**
- [PYTHON_32BIT.md](PYTHON_32BIT.md) - Complete guide
- [PORTABLE_DEPLOYMENT.md](PORTABLE_DEPLOYMENT.md) - Portable deployment (uses .zip)
- [SETUP.md](SETUP.md) - Setup instructions
- [README.md](../README.md) - System requirements
- [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md) - Installation steps

**Why 32-bit is required:**
- ✅ Required for Windows program compatibility (main reason)
- ✅ Compatible with 32-bit printer drivers
- ✅ Works with older Windows programs and DLLs
- ✅ Compatible with legacy COM objects and ActiveX controls

**DO NOT use 64-bit Python:**
- ❌ Will NOT work with 32-bit Windows programs
- ❌ Cannot load 32-bit DLLs
- ❌ Limited printer driver compatibility
- ❌ Incompatible with legacy Windows software

---

## Typical Reading Order

### For First-Time Users (Portable Python - Recommended):
1. [PORTABLE_DEPLOYMENT.md](PORTABLE_DEPLOYMENT.md) ⭐ - Easiest deployment method
2. [API_AUTHENTICATION.md](API_AUTHENTICATION.md) 🔐 - Setup API authentication
3. [QUICKSTART.md](QUICKSTART.md) - Get it working quickly
4. [README.md](../README.md) - Full reference when needed

### For System Administrators:
1. [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md) - Understand the system
2. [PORTABLE_DEPLOYMENT.md](PORTABLE_DEPLOYMENT.md) ⭐ - Deploy with portable Python
3. [API_AUTHENTICATION.md](API_AUTHENTICATION.md) 🔐 - Setup API keys
4. [README.md](../README.md) - Reference for troubleshooting

### For Developers:
1. [README.md](../README.md) - Complete technical overview
2. [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md) - Architecture details
3. [PYTHON_32BIT.md](PYTHON_32BIT.md) - Development environment setup
4. [QUICKSTART.md](QUICKSTART.md) - Quick testing

### For Troubleshooting:
1. [QUICKSTART.md](QUICKSTART.md) - Check troubleshooting section
2. [PORTABLE_DEPLOYMENT.md](PORTABLE_DEPLOYMENT.md) - Portable Python issues
3. [PYTHON_32BIT.md](PYTHON_32BIT.md) - Python-specific issues
4. [API_AUTHENTICATION.md](API_AUTHENTICATION.md) - Authentication issues
5. [README.md](README.md) - General troubleshooting

---

## Configuration Files

### env.py
**Purpose:** Configuration settings for the client
**Contains:**
- `APP_HOST` - Server URL (default: http://admin.abr.net:3000)
- `API_KEY` - API key for authentication
- `WINDOWS_PRINTER_NAME` - Windows printer name
- `ESCPOS_NETWORK_HOST` - Thermal printer IP address
- `ESCPOS_NETWORK_PORT` - Thermal printer port (default: 9100)

**Note:** `env.py` is NOT committed to git (see .gitignore)

### env.py.example
**Purpose:** Template for env.py configuration
**Usage:** Copy to `env.py` and customize

### requirements.txt
**Purpose:** Python package dependencies
**Python Version:** 3.8.10 (32-bit)
**Packages:**
- pywin32>=305 (Windows printing)
- python-escpos>=2.2.0 (Thermal printing)
- pyserial>=3.5 (Serial communication)
- Pillow>=8.0.0 (Image processing)
- requests>=2.25.0 (HTTP client)
- pyusb>=1.2.1 (Optional USB support)

---

## Support and Contact

### Documentation Issues
If you find errors or missing information in the documentation:
1. Check all documentation files in this index
2. Check the troubleshooting sections
3. Contact your system administrator

### Technical Support
For technical issues with the application:
1. Check troubleshooting sections in:
   - [QUICKSTART.md](QUICKSTART.md)
   - [PORTABLE_DEPLOYMENT.md](PORTABLE_DEPLOYMENT.md)
   - [PYTHON_32BIT.md](PYTHON_32BIT.md)
   - [README.md](README.md)
2. Verify Python version and architecture (see PYTHON_32BIT.md)
3. Contact your system administrator

### API and Server Issues
For issues with the biblio-server API:
1. Check server documentation: `../CLAUDE.md`
2. Verify API connection: `python test.py`
3. Check server logs
4. Contact server administrator

---

**Last Updated:** 2025-11-07
**Python Version:** 3.8.10 (32-bit ONLY)
**Application Type:** Windows Desktop Client
**Server:** biblio-server (Node.js API)
