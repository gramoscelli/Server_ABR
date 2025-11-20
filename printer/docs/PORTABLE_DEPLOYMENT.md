# Portable Python Deployment Guide

## Overview

This printer client uses a **portable Python setup**. Python is bundled with the application and does not require system installation or PATH configuration.

## Architecture

```
C:\biblio-printer\
└── python\                    ← Portable Python 3.8.10 (32-bit)
    ├── python.exe
    ├── python38.dll
    ├── Lib\
    ├── DLLs\
    ├── Scripts\
    │   └── pip.exe
    ├── tirada.py              ← Application files (in python\ folder)
    ├── recibo_adm.py
    ├── recibo_cob.py
    ├── tirada_cell_data.py
    ├── tiradas_interf.py
    ├── test.py
    ├── test_printer.py
    ├── recibo_test.py
    ├── print_rulers.py
    ├── env.py                 ← Configuration (in python\ folder)
    └── requirements.txt
```

**Note:** All .py files and configuration files are placed directly in the `python\` folder alongside python.exe.

## Portable Deployment (This Guide)
- ✅ Uses `python-3.8.10-embed-win32.zip`
- ✅ Extract and run, no installation
- ✅ No admin rights needed
- ✅ No registry changes
- ✅ No PATH needed
- ✅ Copy entire folder to deploy

## WSL (Windows Subsystem for Linux) Access

If you're developing on WSL Ubuntu, you can access the printer files from Windows:

**Windows Explorer Path:**
```
\\wsl.localhost\Ubuntu\home\[username]\biblio-server\printer
```
Replace `[username]` with your Ubuntu username.

**Quick Access:**
1. Open Windows Explorer
2. Type in address bar: `\\wsl.localhost\Ubuntu`
3. Navigate to: `home\[username]\biblio-server\printer`
4. You can now copy files directly to Windows

**PowerShell/CMD Path:**
```cmd
cd \\wsl.localhost\Ubuntu\home\[username]\biblio-server\printer
dir
```

**Find your Ubuntu username:** Run `echo $USER` in WSL terminal.

## Step-by-Step Deployment

### Step 1: Download Portable Python 3.8.10 (32-bit)

**Download link:**
- https://www.python.org/ftp/python/3.8.10/python-3.8.10-embed-win32.zip

**File details:**
- Filename: `python-3.8.10-embed-win32.zip`
- Size: ~7.8 MB
- Architecture: 32-bit (win32)
- Type: Embeddable package (portable, no installer, no .exe)

**⚠️ CRITICAL: Use the .zip file, NOT the .exe installer**
- ✅ `python-3.8.10-embed-win32.zip` - Embeddable package (correct)
- ❌ `python-3.8.10.exe` - Installer (wrong for portable deployment)
- ❌ `python-3.8.10-embed-amd64.zip` - 64-bit (wrong architecture)

### Step 2: Prepare Deployment Package

**If developing on WSL (Windows Subsystem for Linux):**

The Linux filesystem is accessible from Windows at: `\\wsl.localhost\Ubuntu`

```cmd
REM From Windows Command Prompt or PowerShell

REM Create deployment folder
mkdir C:\biblio-printer-deploy
cd C:\biblio-printer-deploy

REM Extract portable Python .zip file (NOT install the .exe!)
REM Right-click python-3.8.10-embed-win32.zip > Extract All...
REM Extract to: C:\biblio-printer-deploy\python\

REM Copy application files from WSL to Windows
REM Replace [username] with your Ubuntu username
REM WSL path: \\wsl.localhost\Ubuntu\home\[username]\biblio-server\printer
copy \\wsl.localhost\Ubuntu\home\[username]\biblio-server\printer\*.py python\
copy \\wsl.localhost\Ubuntu\home\[username]\biblio-server\printer\requirements.txt python\
copy \\wsl.localhost\Ubuntu\home\[username]\biblio-server\printer\env.py.example python\env.py
```

**Tip:** Open Windows Explorer and type `\\wsl.localhost\Ubuntu` in the address bar to browse WSL files visually.

**If developing directly on Windows:**

```cmd
REM Copy application files
copy C:\path\to\printer\*.py python\
copy C:\path\to\printer\requirements.txt python\
copy C:\path\to\printer\env.py.example python\env.py

REM Result:
REM C:\biblio-printer-deploy\
REM   python\
REM     python.exe
REM     python38.dll
REM     Lib\
REM     DLLs\
REM     Scripts\
REM     tirada.py              ← Application files in python\ folder
REM     recibo_*.py
REM     env.py
REM     requirements.txt
```

### Step 3: Configure Portable Python for pip

Portable Python doesn't include pip by default. Enable it:

**Edit `python\python38._pth` file:**

Before (default):
```
python38.zip
.

# Uncomment to run site.main() automatically
#import site
```

After (enable pip):
```
python38.zip
.
Lib\site-packages

# Enable site to allow pip
import site
```

**Download and install pip:**

```cmd
cd C:\biblio-printer-deploy\python

REM Download get-pip.py
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py

REM Install pip
python.exe get-pip.py

REM Verify pip installed
python.exe -m pip --version
```

### Step 4: Install Dependencies

```cmd
cd C:\biblio-printer-deploy\python

REM Install all dependencies
python.exe -m pip install -r requirements.txt

REM Verify packages installed
python.exe -m pip list
```

Expected output:
```
Package         Version
--------------- -------
Pillow          10.1.0
pip             21.3.1
pyserial        3.5
python-escpos   3.0
pywin32         305
requests        2.31.0
...
```

### Step 5: Configure Application

**Edit `env.py`:**

```python
# Server Configuration
APP_HOST = "http://admin.abr.net:3000"

# API Authentication
API_KEY = "your-api-key-here"

# Windows Printer
WINDOWS_PRINTER_NAME = "HP LaserJet Pro"

# ESC/POS Thermal Printer (if using)
ESCPOS_NETWORK_HOST = "192.168.1.100"
ESCPOS_NETWORK_PORT = 9100
```

### Step 6: Create Launcher Scripts

**Create `run_tirada.bat` (in C:\biblio-printer-deploy\):**

```cmd
@echo off
REM Biblio Printer - Fee Collection Report
cd /d "%~dp0python"
python.exe tirada.py
pause
```

**Create `run_recibo_cob.bat` (in C:\biblio-printer-deploy\):**

```cmd
@echo off
REM Biblio Printer - Collector Receipt
cd /d "%~dp0python"
python.exe recibo_cob.py
pause
```

**Create `run_recibo_adm.bat` (in C:\biblio-printer-deploy\):**

```cmd
@echo off
REM Biblio Printer - Admin Receipt
cd /d "%~dp0python"
python.exe recibo_adm.py
pause
```

**Create `test_connection.bat` (in C:\biblio-printer-deploy\):**

```cmd
@echo off
REM Test API Connection
cd /d "%~dp0python"
python.exe test.py
pause
```

**Create `test_printer.bat` (in C:\biblio-printer-deploy\):**

```cmd
@echo off
REM Test Windows Printer
cd /d "%~dp0python"
python.exe test_printer.py
pause
```

**Note:** Launcher .bat files are in the root folder, but they cd into python\ folder before running scripts.

### Step 7: Test the Package

```cmd
cd C:\biblio-printer-deploy

REM Test Python works (from python\ folder)
cd python
python.exe --version
REM Should show: Python 3.8.10

REM Test architecture
python.exe -c "import struct; print(struct.calcsize('P') * 8)"
REM Should show: 32

cd ..

REM Test API connection
test_connection.bat

REM Test printer
test_printer.bat
```

### Step 8: Package for Distribution

**Create ZIP file:**

```cmd
cd C:\
tar -czf biblio-printer-v1.0.zip biblio-printer-deploy\*

REM Or use Windows Explorer:
REM Right-click biblio-printer-deploy folder > Send to > Compressed (zipped) folder
```

**Result:** `biblio-printer-v1.0.zip` (~50 MB with portable Python and dependencies)

**Alternative: Package from WSL and copy to Windows:**

```bash
# On WSL
cd $HOME/biblio-server
tar -czf printer-package.tar.gz printer/*.py printer/requirements.txt printer/env.py.example

# Copy to Windows Downloads folder
cp printer-package.tar.gz /mnt/c/Users/$USER/Downloads/
```

Then extract on Windows and add Python portable to the package.

## Deployment to Target PCs

### Method 1: Network Share

```cmd
REM On server
copy biblio-printer-v1.0.zip \\server\shared\

REM On client PC
copy \\server\shared\biblio-printer-v1.0.zip C:\
cd C:\
tar -xf biblio-printer-v1.0.zip
cd biblio-printer-deploy

REM Configure
notepad env.py

REM Test
test_connection.bat
test_printer.bat

REM Run
run_tirada.bat
```

### Method 2: USB Drive

```
1. Copy biblio-printer-v1.0.zip to USB drive
2. Insert USB in target PC
3. Copy from USB to C:\biblio-printer\
4. Extract zip
5. Configure env.py
6. Test and run
```

### Method 3: Download Link

```
1. Upload biblio-printer-v1.0.zip to web server
2. Users download from: http://admin.abr.net/downloads/biblio-printer-v1.0.zip
3. Extract to C:\biblio-printer\
4. Configure env.py
5. Test and run
```

## Creating Desktop Shortcuts

**For `run_tirada.bat`:**

1. Right-click `run_tirada.bat`
2. Send to > Desktop (create shortcut)
3. Right-click shortcut > Properties
4. Change name to "Print Fee Collection Report"
5. Click "Change Icon" (optional)
6. Set "Start in" to: `C:\biblio-printer`

**For `run_recibo_cob.bat`:**

1. Right-click `run_recibo_cob.bat`
2. Send to > Desktop (create shortcut)
3. Rename to "Print Collector Receipt"

## No Environment Variables Needed

**Traditional Python installation:**
- ❌ Requires PATH environment variable
- ❌ Requires PYTHONPATH environment variable
- ❌ Requires admin rights to set system variables

**Portable Python deployment:**
- ✅ No PATH needed (python.exe in known location)
- ✅ No PYTHONPATH needed (relative paths)
- ✅ No admin rights needed
- ✅ Works from any folder location

**How it works:**

```cmd
REM Traditional installation
python tirada.py    ← Requires PATH, files anywhere

REM Portable deployment
cd python
python.exe tirada.py    ← No PATH needed, files in python\ folder
```

## Advantages Over System Installation

### System Installation (Traditional):
- Requires admin rights
- Modifies Windows registry
- Sets environment variables
- Can conflict with other Python versions
- Requires uninstaller to remove
- User must understand PATH concept

### Portable Deployment:
- No admin rights needed
- No registry changes
- No environment variables
- Isolated from other Python installations
- Just delete folder to remove
- Self-contained and portable

## Updating the Application

**Method 1: Replace Entire Folder**

```cmd
REM Backup current installation
move C:\biblio-printer C:\biblio-printer-backup

REM Extract new version
tar -xf biblio-printer-v1.1.zip -C C:\

REM Copy configuration from backup
copy C:\biblio-printer-backup\env.py C:\biblio-printer\

REM Delete backup
rmdir /s /q C:\biblio-printer-backup
```

**Method 2: Update Only Python Files**

```cmd
REM Keep python\ and env.py, replace only .py files
copy biblio-printer-update\*.py C:\biblio-printer\
```

**Method 3: Auto-Update Script**

Create `update.bat`:

```cmd
@echo off
echo Checking for updates...
cd /d "%~dp0"

REM Download update.zip from server
python\python.exe -c "import urllib.request; urllib.request.urlretrieve('http://admin.abr.net/updates/printer-client.zip', 'update.zip')"

REM Extract (preserving env.py)
REM TODO: Add extraction logic

echo Update complete!
pause
```

## Troubleshooting

### Python.exe not found

**Error:**
```
'python.exe' is not recognized as an internal or external command
```

**Solution:**
- Make sure you're in the python\ folder: `cd python`
- Check python.exe exists in python\ folder
- Or use full path: `C:\biblio-printer\python\python.exe`
- Check launcher .bat files cd into python\ folder

### DLL not found

**Error:**
```
python38.dll not found
```

**Solution:**
- Ensure python38.dll is in python\ folder
- Check you extracted entire zip file
- Re-extract python-3.8.10-embed-win32.zip

### pip not working

**Error:**
```
No module named 'pip'
```

**Solution:**
- Check python38._pth has `import site` uncommented
- Reinstall pip from python\ folder: `python.exe get-pip.py`
- Check Lib\site-packages folder exists in python\ folder

### Module not found (after pip install)

**Error:**
```
ModuleNotFoundError: No module named 'win32print'
```

**Solution:**
- Make sure you're in python\ folder: `cd python`
- Reinstall: `python.exe -m pip install pywin32`
- Check Lib\site-packages folder for package
- Run: `python.exe -m pip list` to verify installed

### Printer not found

**Error:**
```
Printer 'HP LaserJet' not found
```

**Solution:**
- From python\ folder, list printers: `python.exe -c "import win32print; [print(p[2]) for p in win32print.EnumPrinters(2)]"`
- Update env.py (in python\ folder) with exact printer name
- Check printer is installed and online

## Security Considerations

### Advantages:
- ✅ Isolated from system Python (no system-wide impact)
- ✅ Can't modify system files (no admin rights)
- ✅ Easy to scan/audit (all files in one folder)
- ✅ Easy to backup (just copy folder)

### Precautions:
- ⚠️ Store env.py securely (contains API key)
- ⚠️ Use HTTPS for API connection (production)
- ⚠️ Restrict write access to application folder
- ⚠️ Verify ZIP file integrity before deployment

## File Size Considerations

**Portable Python package:**
- python-3.8.10-embed-win32.zip: ~7.8 MB

**Dependencies (installed):**
- pywin32: ~6 MB
- python-escpos: ~500 KB
- Other packages: ~5 MB

**Application files:**
- Python scripts: ~100 KB

**Total deployment package:** ~50 MB

**Optimization:**
- Can exclude test files for production (~20 KB saved)
- Can exclude .pyc files if needed (~2 MB)
- Cannot reduce portable Python size

## Deployment Checklist

- [ ] Download python-3.8.10-embed-win32.zip (32-bit)
- [ ] Extract to python\ subfolder
- [ ] Edit python\python38._pth (enable site imports)
- [ ] Install pip (get-pip.py)
- [ ] Install dependencies (pip install -r requirements.txt)
- [ ] Copy application .py files
- [ ] Configure env.py
- [ ] Create launcher .bat files
- [ ] Test with test_connection.bat
- [ ] Test with test_printer.bat
- [ ] Package as .zip for distribution
- [ ] Document deployment process for users
- [ ] Create desktop shortcuts on target PCs

---

**Last Updated:** 2025-11-07
**Python Version:** 3.8.10 (32-bit portable)
**Package Type:** Portable/Embeddable
**No Installation Required:** ✅
**No Environment Variables:** ✅
**No Admin Rights:** ✅
