# Windows Printer Client Setup

## ✅ Initialization Complete

The **Windows client application** has been initialized with the following structure:

> **Note:** This is a client application for Windows PCs, not a server service.
> It connects to the biblio-server API and prints to local printers.

### 📁 Directory Structure
```
printer/
├── README.md              # Complete documentation
├── QUICKSTART.md          # Quick start guide
├── SETUP.md              # This file
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration (optional)
├── .dockerignore         # Docker ignore rules
├── .gitignore           # Git ignore rules
├── env.py               # Current configuration (APP_HOST set)
├── env.py.example       # Configuration template
│
├── tirada.py            # Fee collection report printer (Windows)
├── tirada_cell_data.py  # Report data formatting
├── tiradas_interf.py    # Tirada interface
│
├── recibo_adm.py        # Admin receipt printer (ESC/POS)
├── recibo_cob.py        # Collector receipt printer (ESC/POS)
├── recibo_test.py       # Receipt testing
│
├── test_printer.py      # Windows printer testing
├── test.py             # API connection testing
└── print_rulers.py     # Ruler printing utility
```

---

## 🎯 Next Steps

### 1. Configure Environment

Edit `env.py` to add your specific settings:
```bash
nano env.py
```

Add:
```python
APP_HOST = "http://admin.abr.net:3000"  # ✓ Already configured
API_KEY = "your-api-key-here"           # ⚠ Add your API key
WINDOWS_PRINTER_NAME = "Your Printer"   # ⚠ Configure if using Windows
ESCPOS_NETWORK_HOST = "192.168.1.x"     # ⚠ Configure if using thermal
```

### 2. Install Python (Windows)

**⚠️ CRITICAL: MUST use 32-bit Python 3.8.10**

This application REQUIRES 32-bit Python for Windows program compatibility.

Download and install Python 3.8.10 (32-bit ONLY):
- **Download link:** https://www.python.org/ftp/python/3.8.10/python-3.8.10.exe
- **Architecture:** 32-bit (x86) - DO NOT use 64-bit version
- **Works on:** Both 32-bit and 64-bit Windows
- **Compatible with:** Windows 7, 8, 8.1, 10, 11

During installation:
```
✓ Check "Add Python to PATH"
✓ Check "Install for all users"
```

Verify installation:
```cmd
python --version  # Should show: Python 3.8.10
python -c "import struct; print('64-bit' if struct.calcsize('P') * 8 == 64 else '32-bit')"
```

### 3. Install Dependencies

**For Windows (full support):**
```bash
cd $HOME/biblio-server/printer
pip install -r requirements.txt
```

**For Linux (ESC/POS only):**
```bash
pip install python-escpos pyserial Pillow requests
```

### 4. Test Your Setup

**Test API Connection:**
```bash
python test.py
```

**Test Windows Printer:**
```bash
python test_printer.py
```

**Test Thermal Printer:**
```bash
python recibo_test.py
```

---

## 📖 Documentation

- **Quick Start:** [QUICKSTART.md](QUICKSTART.md) - Fast setup and common tasks
- **Full Docs:** [README.md](README.md) - Complete documentation
- **API Docs:** [../CLAUDE.md](../CLAUDE.md) - API integration guide

---

## 🔧 Current Configuration

### API
- **Host:** `http://admin.abr.net:3000` ✓
- **API Key:** Not configured ⚠
- **Endpoints:** `/api/tirada/*`

### Printers
- **Windows:** Not configured (tirada.py)
- **ESC/POS Network:** Not configured (recibo_*.py)
- **ESC/POS Serial:** Not configured

---

## ⚙️ Technology Stack

### Core Technologies
- **Python 3.x** - Main language
- **pywin32** - Windows printing (win32print, win32ui, win32gui)
- **python-escpos** - Thermal printer support
- **Pillow** - Image processing

### Supported Printers
1. **Windows Printers**
   - Any Windows printer driver
   - A4 paper format
   - High-quality reports

2. **ESC/POS Thermal Printers**
   - Network (TCP/IP)
   - Serial (USB/COM)
   - 80mm thermal paper

---

## 🚨 Important Notes

### Windows vs Linux

**Windows:**
- ✓ Full support (win32print + ESC/POS)
- ✓ Can use all features
- ✓ Recommended for tirada.py

**Linux:**
- ✗ No win32print support
- ✓ ESC/POS printers work
- ⚠ Use Docker for isolation (optional)

### Security

- ✅ `.gitignore` configured (env.py excluded)
- ⚠ Never commit API keys
- ⚠ Use environment variables in production
- ⚠ Restrict printer network access

---

## 🐛 Common Issues

### "Module win32print not found"
- **Solution:** Run on Windows or skip Windows-specific features
- **Alternative:** Use ESC/POS printers instead

### "API connection refused"
- **Solution:** Check API is running on port 3000
- **Test:** `curl http://admin.abr.net:3000/api/csrf-token`

### "Printer not found"
- **Solution:** List printers and check name matches
- **Command:** See QUICKSTART.md troubleshooting section

---

## 📝 Configuration Checklist

- [x] Printer folder created
- [x] Documentation added (README, QUICKSTART, SETUP)
- [x] Dependencies defined (requirements.txt)
- [x] Git configuration (.gitignore)
- [x] Docker support (Dockerfile, .dockerignore)
- [x] Example configuration (env.py.example)
- [x] Current config has API host
- [ ] Add API key to env.py
- [ ] Configure printer name/address
- [ ] Install Python dependencies
- [ ] Test API connection
- [ ] Test printer connection

---

## 🎓 Learning Resources

### Python Printing
- **pywin32 docs:** https://pypi.org/project/pywin32/
- **python-escpos:** https://python-escpos.readthedocs.io/

### API Integration
- **biblio-server API:** See `../CLAUDE.md`
- **Authentication:** See `../USER_ROLES.md`

---

**Setup Date:** 2025-11-07
**Status:** ✅ Initialized - Ready for configuration
**Next:** Configure env.py and install dependencies
