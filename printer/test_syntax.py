"""
Test Python syntax of all printer source files
Checks for import errors and basic syntax issues
"""

import sys
import os

# List of Python files to test
files_to_test = [
    'api_client.py',
    'test.py',
    'tirada.py',
    'tirada_cell_data.py',
    'tiradas_interf.py',
    'recibo_adm.py',
    'recibo_cob.py',
    'recibo_test.py',
    'test_printer.py',
    'print_rulers.py',
    'env.py'
]

def test_file_syntax(filename):
    """Test if a Python file has valid syntax"""
    print(f"Testing {filename}...", end=" ")

    if not os.path.exists(filename):
        print("⚠️  File not found")
        return False

    try:
        with open(filename, 'r') as f:
            code = f.read()

        # Try to compile the code
        compile(code, filename, 'exec')
        print("✅ Syntax OK")
        return True

    except SyntaxError as e:
        print(f"❌ Syntax Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Printer Sources - Syntax Check")
    print("=" * 60)
    print()

    passed = 0
    failed = 0

    for filename in files_to_test:
        if test_file_syntax(filename):
            passed += 1
        else:
            failed += 1

    print()
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)

    if failed > 0:
        print("\n❌ Some files have syntax errors")
        return 1
    else:
        print("\n✅ All files have valid syntax!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
