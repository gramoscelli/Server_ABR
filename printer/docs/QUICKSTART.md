# Printer Service - Quick Start Guide

## 🚀 Quick Setup

### 1. Configuration

Copy the example configuration:
```bash
cd printer
cp env.py.example env.py
```

Edit `env.py` with your settings:
```python
APP_HOST = "http://admin.abr.net:3000"
API_KEY = "your-api-key-here"
WINDOWS_PRINTER_NAME = "Your Printer Name"
```

### 2. Install Dependencies

**Windows:**
```bash
pip install -r requirements.txt
```

**Linux (ESC/POS only):**
```bash
pip install python-escpos pyserial Pillow requests
```

### 3. Test Printers

**Test Windows Printer:**
```bash
python test_printer.py
```

**Test ESC/POS Printer:**
```bash
python recibo_test.py
```

---

## 📋 Available Scripts

### Fee Collection Reports (Windows)
- **tirada.py** - Print formatted fee collection reports
- **tiradas_interf.py** - Interface for tirada printing
- **tirada_cell_data.py** - Data formatting utilities

### Receipts (ESC/POS Thermal)
- **recibo_adm.py** - Administrative receipts
- **recibo_cob.py** - Collector receipts
- **recibo_test.py** - Test receipt printing

### Utilities
- **test_printer.py** - Test Windows printers
- **test.py** - Test API connection
- **print_rulers.py** - Print measurement rulers

---

## 💡 Common Tasks

### Print Fee Collection Report
```python
import tirada

# Initialize printer
tirada.init_printer("Your Printer Name")

# Print report for IDs 1-100
tirada.print_tirada(start_id=1, end_id=100)
```

### Print Receipt (Thermal Printer)
```python
from escpos.printer import Network

printer = Network("192.168.1.100", port=9100)
printer.text("Receipt #12345\n")
printer.text("Total: $100.00\n")
printer.cut()
```

### List Available Windows Printers
```python
import win32print
printers = win32print.EnumPrinters(2)
for printer in printers:
    print(printer[2])  # Printer name
```

---

## 🔧 Configuration Options

### API Settings (env.py)
```python
APP_HOST = "http://admin.abr.net:3000"  # Your API server
API_KEY = "your-api-key"                # Get from /api/api-keys
```

### Windows Printer (tirada.py)
```python
WINDOWS_PRINTER_NAME = "HP LaserJet"
PAPER_SIZE = "A4"  # or "Letter"
ORIENTATION = "Portrait"  # or "Landscape"
```

### ESC/POS Network Printer
```python
ESCPOS_NETWORK_HOST = "192.168.1.100"
ESCPOS_NETWORK_PORT = 9100
```

### ESC/POS Serial Printer
```python
ESCPOS_SERIAL_PORT = "COM1"  # Windows
# ESCPOS_SERIAL_PORT = "/dev/ttyUSB0"  # Linux
ESCPOS_SERIAL_BAUDRATE = 9600
```

---

## 🐛 Troubleshooting

### Can't find printer
```bash
# List all printers
python -c "import win32print; [print(p[2]) for p in win32print.EnumPrinters(2)]"
```

### Module not found: win32print
```bash
pip install pywin32
python Scripts/pywin32_postinstall.py -install  # May require admin
```

### ESC/POS connection failed
```bash
# Test network connection
ping 192.168.1.100

# List serial ports
python -m serial.tools.list_ports
```

### API connection error
```bash
# Test API
python test.py

# Check API is running
curl http://admin.abr.net:3000/api/csrf-token
```

---

## 📚 Documentation

- **Full Documentation:** See [README.md](README.md)
- **API Documentation:** See [../CLAUDE.md](../CLAUDE.md)
- **User Roles:** See [../USER_ROLES.md](../USER_ROLES.md)

---

## 🔐 Security

- Never commit `env.py` with real API keys
- Use `.env` file for sensitive configuration
- Restrict network printer access
- Use HTTPS in production

---

**Quick Help:** Run `python <script> --help` for script-specific help
