# Printer Client Application

## Overview

This directory contains a **Windows desktop application** that connects to the biblio-server API to fetch data and print receipts/reports to local printers.

**Important:** This is a **client application**, not a server service. It runs on Windows PCs, connects to the biblio-server API, and prints to locally-attached printers.

```
Windows PC (Client)          →  HTTP API  →  Linux Server
printer/ folder                              biblio-server/
- tirada.py                                  - Node.js API
- recibo_*.py                                - MySQL database
- Prints locally                             - Data source
```

## Documentation

📚 **All documentation has been moved to the [docs/](docs/) folder:**

- **[docs/DOCS_INDEX.md](docs/DOCS_INDEX.md)** - Complete documentation index
- **[docs/QUICKSTART.md](docs/QUICKSTART.md)** - Quick start guide
- **[docs/PORTABLE_DEPLOYMENT.md](docs/PORTABLE_DEPLOYMENT.md)** - Portable Python deployment (⭐ recommended)
- **[docs/API_AUTHENTICATION.md](docs/API_AUTHENTICATION.md)** - API authentication setup
- **[docs/CLIENT_ARCHITECTURE.md](docs/CLIENT_ARCHITECTURE.md)** - Architecture details
- **[docs/SETUP.md](docs/SETUP.md)** - Setup instructions

**Start here:** [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md)

## Components

### Main Scripts

1. **tirada.py** - Main script for printing fee collection reports
   - Generates formatted reports for fee collectors
   - Uses Windows printing API (win32print)
   - Supports A4 paper format

2. **tirada_cell_data.py** - Data formatting for fee collection reports
   - Cell formatting and data preparation
   - Layout configuration

3. **recibo_adm.py** - Administrative receipt printing
   - Uses ESC/POS protocol
   - Supports Serial and Network printers

4. **recibo_cob.py** - Fee collector receipt printing
   - ESC/POS based printing
   - Thermal printer support

5. **tiradas_interf.py** - Interface module for tirada printing

### Utility Scripts

- **test.py** - API testing utilities
- **test_printer.py** - Printer testing with win32print
- **recibo_test.py** - Receipt printer testing
- **print_rulers.py** - Print ruler/measurement utilities
- **env.py** - Environment configuration

## Dependencies

### Python Packages

```txt
pywin32>=305           # Windows printing support (win32print, win32ui, win32gui)
python-escpos>=3.0     # ESC/POS printer support
Pillow>=10.0          # Image processing
```

### System Requirements

#### For Windows Printing (tirada.py)
- Windows OS
- Printer driver installed
- Win32 API support

#### For ESC/POS Printing (recibo_*.py)
- Serial or Network thermal printer
- ESC/POS compatible printer

## Installation

### System Requirements

**⚠️ CRITICAL REQUIREMENT:**
- **Python:** 3.8.10 (32-bit) - REQUIRED for Windows program compatibility
- **Operating System:** Windows 7 or later (32-bit or 64-bit)
- **DO NOT use 64-bit Python** - it will not work due to Windows program compatibility requirements

### Option 1: Local Installation (Windows)

**Step 1: Install Python 3.8.10 (32-bit)**
- Download: https://www.python.org/ftp/python/3.8.10/python-3.8.10.exe
- Check "Add Python to PATH" during installation
- Verify: `python --version` should show "Python 3.8.10"
- Verify architecture: `python -c "import struct; print(struct.calcsize('P') * 8)"`
  - Should show "32" (32-bit)

**Step 2: Install dependencies**
```bash
cd printer
pip install -r requirements.txt
```

### Option 2: Docker (Linux/Cross-platform)

**Note:** Docker is for development/testing only. Production deployment MUST be on Windows with 32-bit Python.

See Docker compose configuration for the printer service.

## Configuration

### Environment Variables (env.py)

```python
# API Configuration
API_URL = "http://nodejs:3000/api"
API_KEY = "your-api-key"

# Printer Configuration
PRINTER_NAME = "Your Printer Name"
PRINTER_HOST = "192.168.1.100"  # For network printers
PRINTER_PORT = 9100             # ESC/POS port
```

## Usage

### Printing Fee Collection Report (Tirada)

```python
import tirada

# Initialize printer
tirada.init_printer("Your Printer Name")

# Print tirada for IDs 1-100
tirada.print_tirada(start_id=1, end_id=100)
```

### Printing Receipt (ESC/POS)

```python
from escpos.printer import Network

# Network printer
printer = Network("192.168.1.100", port=9100)

# Print receipt
printer.text("Receipt #12345\n")
printer.text("Amount: $10.00\n")
printer.cut()
printer.close()
```

## API Integration

The printer service integrates with the biblio-server API to fetch data:

### Endpoints Used

- `GET /api/tirada/start/:start/end/:end` - Get fee collection records
- `GET /api/tirada/page/:page` - Get paginated records
- Authentication via API key

### Example API Call

```python
import urllib.request
import json

url = "http://localhost:3000/api/tirada/start/1/end/10"
headers = {"X-API-Key": "your-api-key"}

request = urllib.request.Request(url, headers=headers)
response = urllib.request.urlopen(request)
data = json.loads(response.read())
```

## Printer Types

### 1. Windows Printers (tirada.py)
- Standard Windows printer drivers
- A4 paper format
- High-quality formatted reports
- Used for: Fee collection reports, administrative documents

### 2. ESC/POS Thermal Printers (recibo_*.py)
- Serial or Network connection
- 80mm thermal paper
- Fast receipt printing
- Used for: Receipts, quick confirmations

## Troubleshooting

### Windows Printer Issues

**Error: Printer not found**
```bash
# List available printers
python -c "import win32print; print(win32print.EnumPrinters(2))"
```

**Error: win32print not found**
```bash
pip install pywin32
python Scripts/pywin32_postinstall.py -install
```

### ESC/POS Printer Issues

**Error: Connection refused**
- Check printer IP address and port
- Ensure printer is powered on
- Test with: `ping <printer-ip>`

**Error: Serial port access denied**
- Check COM port permissions
- Close other programs using the serial port
- Use: `python -m serial.tools.list_ports` to list ports

## Development

### Adding New Printer Support

1. Create new module: `printer/my_printer.py`
2. Implement printer interface:
   ```python
   def init_printer(config):
       # Initialize printer
       pass

   def print_document(data):
       # Print document
       pass
   ```
3. Add configuration to `env.py`
4. Test with test script

### Testing

```bash
# Test Windows printer
python test_printer.py

# Test ESC/POS printer
python recibo_test.py

# Test API connection
python test.py
```

## Deployment

### Client Deployment (Windows PC)

**This application is meant to run on Windows workstations, NOT in Docker.**

1. **Copy files to Windows PC:**
   ```cmd
   xcopy \\server\biblio-server\printer C:\biblio-printer /E
   ```

2. **Install Python 3.11+** from [python.org](https://python.org)

3. **Install dependencies:**
   ```cmd
   cd C:\biblio-printer
   pip install -r requirements.txt
   ```

4. **Configure server connection:**
   ```cmd
   notepad env.py
   ```
   Set `APP_HOST` to your server URL (already set to `http://admin.abr.net:3000`)

5. **Run application:**
   ```cmd
   python tirada.py
   ```

### Creating a Standalone .exe

For easier distribution, create a standalone executable:

```cmd
pip install pyinstaller
pyinstaller --onefile --windowed tirada.py
REM Distributable exe created in dist/ folder
```

## File Structure

```
printer/
├── README.md                  # This file
├── requirements.txt           # Python dependencies
├── env.py                     # Environment configuration
├── tirada.py                 # Fee collection report printer (Windows)
├── tirada_cell_data.py       # Report data formatting
├── tiradas_interf.py         # Tirada interface
├── recibo_adm.py             # Admin receipt printer (ESC/POS)
├── recibo_cob.py             # Collector receipt printer (ESC/POS)
├── recibo_test.py            # Receipt printer testing
├── test_printer.py           # Windows printer testing
├── test.py                   # API testing
└── print_rulers.py           # Ruler printing utility
```

## Security Notes

- Store API keys in environment variables, not in code
- Use HTTPS for API connections in production
- Restrict printer network access
- Validate all data before printing

## Future Enhancements

- [ ] Add PDF generation as alternative to direct printing
- [ ] Support for cloud printing services
- [ ] Queue system for batch printing
- [ ] Print job status monitoring
- [ ] Multi-language support
- [ ] Template system for customizable layouts

---

**Last Updated:** 2025-11-07
**Maintained by:** Development Team
