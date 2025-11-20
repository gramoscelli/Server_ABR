# Printer Client Architecture

## Overview

The `printer/` folder contains **Windows client application** files that connect to the biblio-server API to fetch data and print receipts/reports locally.

```
┌─────────────────────────────────────────────────────────────┐
│                    System Architecture                      │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  Windows Client  │ ◄── You are here (printer/)
    │  (Desktop App)   │
    │                  │
    │  - tirada.py     │ ← Prints reports to local Windows printer
    │  - recibo_*.py   │ ← Prints receipts to thermal printer
    │  - GUI (future)  │ ← User interface
    └────────┬─────────┘
             │
             │ HTTP/HTTPS
             │ API Calls
             │
    ┌────────▼─────────┐
    │  biblio-server   │ ◄── Server (../app, ../php, ../python)
    │  (Node.js API)   │
    │                  │
    │  - /api/tirada/* │ ← Fee collection data
    │  - /api/auth/*   │ ← Authentication
    │  - /api/roles/*  │ ← User management
    └────────┬─────────┘
             │
             │
    ┌────────▼─────────┐
    │   MySQL Database │
    │                  │
    │  - socios        │
    │  - cobrocuotas   │
    │  - usuarios      │
    └──────────────────┘
```

## Client-Server Separation

### Server Side (biblio-server)
**Location:** `$HOME/biblio-server/` (or `/home/$USER/biblio-server/`)
- Node.js API (app/)
- PHP frontend (php/)
- MySQL database
- Python backup service
- **Runs on:** Linux server (Docker)

### Client Side (Windows Application)
**Location:** `$HOME/biblio-server/printer/` (or `/home/$USER/biblio-server/printer/`)
- Python desktop application
- Connects to server API
- Prints to local Windows/thermal printers
- **Runs on:** Windows workstations/PCs

## Deployment Model

### Server Deployment
```bash
# On Linux server
cd $HOME/biblio-server
docker compose up -d
# Serves API at http://admin.abr.net:3000
```

### Client Deployment
```
1. Copy printer/ folder to Windows PC
2. Install Python + dependencies
3. Configure env.py with server URL
4. Run Python scripts or GUI application
```

## Client Files

### Production Scripts
- **tirada.py** - Print fee collection reports
- **recibo_adm.py** - Print admin receipts
- **recibo_cob.py** - Print collector receipts
- **tiradas_interf.py** - Interface module

### Configuration
- **env.py** - Server URL and settings
  ```python
  APP_HOST = "http://admin.abr.net:3000"  # Server URL
  API_KEY = "client-api-key"              # Client's API key
  WINDOWS_PRINTER_NAME = "Local Printer"   # Local printer name
  ```

### Testing/Development
- **test.py** - Test server connection
- **test_printer.py** - Test local printer
- **recibo_test.py** - Test thermal printer

## How It Works

### 1. Client Starts
```python
# User runs tirada.py on Windows PC
import tirada
tirada.init_printer("HP LaserJet")
```

### 2. Client Fetches Data from Server
```python
# tirada.py makes HTTP request to server
import urllib.request
import env

url = f"{env.APP_HOST}/api/tirada/start/1/end/100"
response = urllib.request.urlopen(url)
data = json.loads(response.read())
```

### 3. Client Prints Locally
```python
# Print to local Windows printer
dc.StartDoc("Fee Collection Report")
dc.StartPage()
# ... draw content ...
dc.EndPage()
dc.EndDoc()
```

## Client Installation (Windows PC)

### Step 1: Copy Files
```cmd
REM Copy printer folder to Windows PC
copy \\server\share\biblio-server\printer C:\biblio-printer
cd C:\biblio-printer
```

### Step 2: Install Python 3.8.10 (32-bit)

**⚠️ CRITICAL: MUST use 32-bit Python 3.8.10**

- Download: https://www.python.org/ftp/python/3.8.10/python-3.8.10.exe (32-bit only)
- Check "Add to PATH" during installation
- Verify version: `python --version` (should show "Python 3.8.10")
- Verify architecture: `python -c "import struct; print(struct.calcsize('P') * 8)"` (should show "32")

### Step 3: Install Dependencies
```cmd
pip install -r requirements.txt
```

### Step 4: Configure
```cmd
REM Edit env.py
notepad env.py
```

Set:
```python
APP_HOST = "http://admin.abr.net:3000"  # Your server
API_KEY = "get-from-server-admin"
WINDOWS_PRINTER_NAME = "Your Printer"
```

### Step 5: Test
```cmd
python test.py          # Test server connection
python test_printer.py  # Test local printer
```

### Step 6: Run
```cmd
python tirada.py        # Print reports
python recibo_cob.py    # Print receipts
```

## Future: GUI Application

You can wrap these scripts in a Windows GUI:

### Option 1: Tkinter (Built-in)
```python
import tkinter as tk
from tkinter import ttk
import tirada

class PrinterApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Biblio Printer")

        # Add buttons, inputs, etc.
        btn = ttk.Button(text="Print Report", command=self.print_report)
        btn.pack()

    def print_report(self):
        tirada.print_tirada(start=1, end=100)

app = PrinterApp()
app.root.mainloop()
```

### Option 2: PyQt5 (Professional)
```python
from PyQt5.QtWidgets import QApplication, QMainWindow, QPushButton

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Biblio Printer")

        btn = QPushButton("Print Report")
        btn.clicked.connect(self.print_report)
        self.setCentralWidget(btn)

    def print_report(self):
        # Call tirada.py functions
        pass

app = QApplication([])
window = MainWindow()
window.show()
app.exec_()
```

### Option 3: Create .exe (Standalone)
```cmd
pip install pyinstaller
pyinstaller --onefile --windowed tirada.py
REM Creates dist/tirada.exe
```

## API Authentication

### Get API Key from Server

**Method 1: Admin creates it**
```bash
# On server, admin runs:
curl -X POST http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Windows Client 1","userId":1}'
```

**Method 2: Via web interface**
1. Login to server as admin
2. Go to API Keys section
3. Create new key for "Windows Client"
4. Copy key to client's `env.py`

### Use API Key in Client
```python
# In your Python scripts
import urllib.request
import env

headers = {
    'X-API-Key': env.API_KEY
}

request = urllib.request.Request(url, headers=headers)
response = urllib.request.urlopen(request)
```

## Network Requirements

### Firewall Rules
- **Server:** Open port 3000 (or use reverse proxy on 80/443)
- **Client:** Allow outbound HTTP/HTTPS to server

### DNS/Hosts
```
# On Windows client: C:\Windows\System32\drivers\etc\hosts
192.168.1.100  admin.abr.net
```

### VPN (Optional)
If clients are remote, consider VPN:
- OpenVPN
- WireGuard
- Windows VPN

## Security

### Server-Side
- ✅ API key authentication
- ✅ Rate limiting
- ✅ HTTPS in production
- ✅ User roles (admin, user, readonly)

### Client-Side
- ⚠️ Store API key securely
- ⚠️ Don't commit env.py to git
- ⚠️ Use HTTPS in production
- ⚠️ Update client software regularly

## Troubleshooting

### Client Can't Connect to Server
```cmd
REM Test server is reachable
ping admin.abr.net

REM Test API is responding
curl http://admin.abr.net:3000/api/csrf-token

REM Check firewall
netsh advfirewall show currentprofile
```

### Printer Not Found
```cmd
REM List all printers
python -c "import win32print; [print(p[2]) for p in win32print.EnumPrinters(2)]"

REM Check printer name matches env.py
notepad env.py
```

### API Key Invalid
```cmd
REM Test API key
curl http://admin.abr.net:3000/api/tirada/start/1/end/10 ^
  -H "X-API-Key: your-api-key"

REM Should return data, not 401/403 error
```

## Distribution

### Package for Distribution
```cmd
REM Create installer folder
mkdir biblio-printer-installer
cd biblio-printer-installer

REM Copy necessary files only
copy ..\printer\*.py .
copy ..\printer\requirements.txt .
copy ..\printer\env.py.example env.py

REM Create install script
echo pip install -r requirements.txt > install.bat
echo python test.py >> install.bat

REM Zip it
tar -czf biblio-printer-v1.0.zip *
```

### Installation on Client PC
```cmd
REM 1. Unzip
REM 2. Edit env.py
REM 3. Run install.bat
REM 4. Done!
```

## Why This Architecture?

### ✅ Advantages
- **Local Printing:** Fast, reliable printer access
- **Centralized Data:** Single source of truth (server)
- **No Printer Sharing:** No complex network printer setup
- **Offline Capable:** Can cache data locally (future)
- **Scalable:** Add more client PCs easily

### ⚠️ Considerations
- Clients need network access to server
- Python installation required on each PC
- Manual updates (can be automated)

---

**This is a client-server architecture, NOT a microservice!**
- Server runs on Linux (Docker)
- Client runs on Windows PCs
- They communicate via HTTP API

