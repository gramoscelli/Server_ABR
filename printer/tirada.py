# -*- coding: utf-8 -*-

import win32print
import win32ui
import win32gui
import win32con
import env
import urllib.request
import json
import ctypes as ct
import tirada_cell_data
import copy
from PIL import Image, ImageWin, ImageFont

user32 = ct.WinDLL("user32.dll")
# Definición de los tipos de datos necesarios para la función DrawTextW
HWND = ct.c_void_p
HDC = ct.c_void_p
LPWSTR = ct.c_char_p
INT = ct.c_int
RECT = ct.Structure

class RECT(ct.Structure):
    _fields_ = [
        ("left", ct.c_long),
        ("top", ct.c_long),
        ("right", ct.c_long),
        ("bottom", ct.c_long),
    ]

# Definición de la firma de la función DrawTextW
DrawTextA = user32.DrawTextA
DrawTextA.restype = INT
DrawTextA.argtypes = [HDC, LPWSTR, INT, ct.POINTER(RECT), INT]

                       

def init_printer(printer):
    global dc, hDC, dpi_x, dpi_y, page_height, page_width, hprinter
    global page_offset_x, page_offset_y, cell_width, cell_height
    global adj_offset_x, adj_offset_y, adj_scale_x, adj_scale_y
    
    # Set paper properties
    hprinter = win32print.OpenPrinter(printer)
    devmode = win32print.GetPrinter(hprinter, 9)["pDevMode"]
    if devmode==None:
        devmode=win32print.GetPrinter(hprinter,8)["pDevMode"]
    devmode.PaperSize = win32con.DMPAPER_A4
    devmode.Fields|=win32con.DM_PAPERSIZE 
    devmode.Orientation=win32con.DMORIENT_PORTRAIT
    devmode.Fields|=win32con.DM_ORIENTATION 
    # Create handle
    dc = win32gui.CreateDC("WINSPOOL", printer, devmode)
    hDC = win32ui.CreateDCFromHandle(dc)
    #hDC.CreatePrinterDC(printer)
    # Get device capabilities
    dpi_x = hDC.GetDeviceCaps (win32con.LOGPIXELSX)
    dpi_y = hDC.GetDeviceCaps (win32con.LOGPIXELSY)
    page_height = hDC.GetDeviceCaps (win32con.PHYSICALHEIGHT)
    page_width = hDC.GetDeviceCaps (win32con.PHYSICALWIDTH)
    cell_width = int(page_width/4)
    cell_height = int(page_height/4)
    page_offset_x = hDC.GetDeviceCaps (win32con.PHYSICALOFFSETX)
    page_offset_y = hDC.GetDeviceCaps (win32con.PHYSICALOFFSETY)
    print ("Propiedades del dispositivo:")
    print ("Res horz: ", dpi_x, "dpi - Res vert: ", dpi_y, "dpi")
    print ("Alto: ", to_mm(page_height), "mm - Ancho: ", to_mm(page_width), "mm")
    print ("Margen x: ", to_mm(page_offset_x), "mm - Margen y: ", to_mm(page_offset_y), "mm")
    print ("Celda ancho: ", to_mm(cell_width), "mm - Celda alto: ", to_mm(cell_height), "mm")
    hDC.StartDoc('test')
    hDC.StartPage()
    adj_offset_x=0
    adj_offset_y=0 
    adj_scale_x=1 
    adj_scale_y=1

def new_page():
    hDC.EndPage()
    hDC.StartPage()
    

def close_printer():
    hDC.EndPage()
    hDC.EndDoc()
    hDC.DeleteDC()
    win32print.ClosePrinter(hprinter)

def to_points(v_mm):
    result = int(dpi_x * v_mm / 25.4)
    return result

def to_mm(v_pts):
    result = int(25.4 * v_pts / dpi_x)
    return result

def x_adj_mm(x):
    x=adj_offset_x+x*adj_scale_x
    return x

def y_adj_mm(y):
    y=adj_offset_y+y*adj_scale_y
    return y


######################################################################################

def draw_text(text, font, size_mm, weight, align, x_mm, y_mm, width_mm, height_mm):
    size_pt = to_points(size_mm)
    width = to_points(width_mm)
    height = to_points(height_mm)    
    x = to_points(x_mm) - page_offset_x
    y = to_points(y_mm) - page_offset_y
    #print('Printing: "', text, '" - x: ', x, ' - y: ', y, ' - width: ', width, ' - height: ', height)
    font_handle = win32ui.CreateFont({
        "name": font,
        "weight": weight,     # win32ui.FW_NORMAL o win32ui.FW_BOLD ,
        "height": -size_pt,   # altura de la letra en puntos (negativo)
    })
    hDC.SelectObject(font_handle)
    hDC.SetBkMode(win32con.TRANSPARENT)
    rect = RECT(x, y, x+width-1, y+height-1)
    #hDC.DrawText(text.encode('Windows-1252'), rect, align)
    DrawTextA(dc, text.encode('Windows-1252'), -1, ct.byref(rect), align)


def draw_image(imagename, x_mm, y_mm, width_mm, height_mm):
    width = to_points(width_mm)
    height = to_points(height_mm)
    x = to_points(x_mm)-page_offset_x
    y = to_points(y_mm)-page_offset_y
    image = Image.open(imagename)
    dib = ImageWin.Dib(image)
    dib.draw(hDC.GetHandleOutput(), (x, y, x+width-1, y+height-1))

def print_cell(data, x_mm, y_mm, width_mm, height_mm):
    for obj in data:
        if 'text' in obj:
            xr_mm = x_mm + obj['window']['x_mm']
            yr_mm = y_mm + obj['window']['y_mm']
            weight = win32con.FW_BOLD if obj['bold'] else win32con.FW_REGULAR
            align = win32con.DT_LEFT | win32con.DT_TOP | win32con.DT_WORDBREAK 
            align = align | (win32con.DT_CENTER if obj['center'] else 0)
            draw_text(obj['text'], obj['font'], obj['size_mm'], weight, align, 
                       xr_mm, yr_mm, obj['window']['width_mm'], obj['window']['height_mm'])
        elif 'image' in obj:
            xr_mm = x_mm + obj['window']['x_mm']
            yr_mm = y_mm + obj['window']['y_mm']
            draw_image(obj['image'], xr_mm, yr_mm, obj['window']['width_mm'], obj['window']['height_mm'])

def get_printers_list():
    # Obtener información de todas las impresoras instaladas
    result = []
    printers = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL)
    for i, impresora_info in enumerate(printers):
        result.append(impresora_info[2])
    return result
    

def printer_select():
    printers = get_printers_list()
    print("Lista de impresoras:")
    for i in range(len(printers)):
        printer = printers[i]
        print(f"{i+1}. {printer}")
    selected = input("Seleccione el número de impresora: ")
    
    # Validation of the user input
    if selected.isdigit():
        index = int(selected) - 1
        if 0 <= index < len(printers):
            selected_printer = printers[index]
            return selected_printer
    
    print("Selección inválida. No se ha cambiado la impresora.")
    return None


def print_lines():
    for i in range(1,4):
        hDC.MoveTo(-page_offset_x, cell_height*i-page_offset_y)
        hDC.LineTo(page_width-page_offset_x, cell_height*i-page_offset_y)
    for i in range(1,4):
        hDC.MoveTo(cell_width*i-page_offset_x,-page_offset_y)
        hDC.LineTo(cell_width*i-page_offset_x, page_height-page_offset_y)

def print_matrix(data):
    for i in range(4):
        if len(data)>2*i:
            if (data[2*i]["fee_code"] > 1):
                print_cell(replace_fields(tirada_cell_data.cell_data_asoc, data[2*i]), 
                            0, 
                            to_mm(cell_height)*i, 
                            to_mm(cell_width), 
                            to_mm(cell_height)*(i+1))
                print_cell(replace_fields(tirada_cell_data.cell_data_coll, data[2*i]), 
                            to_mm(cell_width)*1, 
                            to_mm(cell_height)*i, 
                            to_mm(cell_width)*2, 
                            to_mm(cell_height)*(i+1))
        if len(data)>2*i+1:
            if (data[2*i+1]["fee_code"] > 1):
                print_cell(replace_fields(tirada_cell_data.cell_data_coll, data[2*i+1]), 
                            to_mm(cell_width)*2, 
                            to_mm(cell_height)*i, 
                            to_mm(cell_width)*3, 
                            to_mm(cell_height)*(i+1))
                print_cell(replace_fields(tirada_cell_data.cell_data_asoc, data[2*i+1]), 
                            to_mm(cell_width)*3, 
                            to_mm(cell_height)*i, 
                            to_mm(cell_width)*4, 
                            to_mm(cell_height)*(i+1))

def load_fee_data(ccids):
    url = APP_HOST+"/api/tirada/custom/"
    empty = "/-1/-1/-1/-1/-1/-1/-1"
    data = []
    for ccid in ccids:
        url_res = url+str(ccid)+empty
        json_url = urllib.request.urlopen(url_res)
        res = json.loads(json_url.read())
        
        if len(res)==1:
            if "nombre" in res[0]:
                data.append(res[0])
    return tirada_cell_data.db_to_fields(data)                                  

def extract_fields(cell_data):
    result = []
    for obj in cell_data:
        if 'text' in obj:
            str = obj['text']
            if "#" in str:
                field = str.partition("#")[2].split()[0]
                if field not in result:
                    result.append(field)
    result.sort()
    return result

def replace_fields(cell_data, json_data):
    result = copy.deepcopy(cell_data)
    for obj in result:
        if 'text' in obj:
            stri = obj['text']
            if "#" in stri:
                while True:
                    field = stri.partition("#")[2].split()[0]
                    field = field.split(",")[0]
                    field = field.split(".")[0]
                    field = field.split("*")[0]
                    if field in json_data:
                        stri = stri.replace("#"+field, str(json_data[field]))
                    else:
                        stri = stri.replace("#"+field, "")
                    if "#" not in stri:
                        break
            obj['text'] = stri
    return result

def print_fees(printer, serverip, lines, ccids):
    global APP_HOST
    APP_HOST = "http://"+serverip+":3000"
    if printer:
        init_printer(printer)
        try:
            fees = load_fee_data(ccids)
            ind = 0
            while True:
                data=[]
                for i in range(8):
                    if len(fees)>ind+i:
                        data.append(fees[ind+i])
                if lines:
                    print_lines()
                print_matrix(data)
                ind = ind + 8
                if len(fees)<=ind:
                    break
                new_page()
        finally:
            close_printer()

def print_matrix_scale(left, dx, count_x, top, dy, count_y):

    right = left + (count_x - 1)*dx
    bottom = top + (count_y - 1)*dy

    x = left
    for i in range(count_x):
        hDC.MoveTo(x, top)
        hDC.LineTo(x, bottom)
        x = x + dx

    y = top
    for i in range(count_y):
        hDC.MoveTo(left, y)
        hDC.LineTo(right, y)
        y = y + dy

def print_scales(x0, y0, w, h, count_x, count_y, left, right, top, bottom):
    hDC.MoveTo(x0, top)
    hDC.LineTo(x0, bottom)
    for i in range(0, count_y + 1):
        y = top + round(i*(bottom-top)/count_y)
        hDC.MoveTo(x0, y)
        if i % 10 == 0:
            hDC.LineTo(x0 + 4*w, y)
        elif i % 5 == 0:
            hDC.LineTo(x0 + 2*w, y)
        else:
            hDC.LineTo(x0 + w, y)
            
    
    hDC.MoveTo(left,  y0)
    hDC.LineTo(right, y0)
    for i in range(0, count_x + 1):
        x = left + round(i*(right-left)/count_x)
        hDC.MoveTo(x, y0)
        if i % 10 == 0:
            hDC.LineTo(x, y0+4*h)
        elif i % 5 == 0:
            hDC.LineTo(x, y0+2*h)
        else:
            hDC.LineTo(x, y0+h)
        

def print_ruler(printer, matrix, scale):
    init_printer(printer)

    # 3 points = 1.07 mm
    pen = win32ui.CreatePen(0, 3, 0)
    hDC.SelectObject(pen)

    # page size: 210mmx297mm
    left = to_points(10) - page_offset_x
    top = to_points(10) - page_offset_y
    width = to_points(190)
    right = width + left
    height = to_points(270)
    bottom = height + top
    dx = dy = to_points(10)

    if (matrix):
        print_matrix_scale(left, dx, 20, top, dy, 28)

    if (scale):
        print_scales(left, top, 7, 7, 190, 270, left, right, top, bottom)

    close_printer()

# test 

"""

print_fees("Microsoft Print to PDF", "localhost", False, [0,662464,662471,662472])

print_ruler('Microsoft Print to PDF', True, False)

init_printer('HP LaserJet Professional P 1102w')

print_fees('Microsoft Print to PDF', True, 
           [666200, 666203, 666204, 666205,
             666206, 666200, 666200, 666200,
             666200, 666200, 666283 
            ])


print(printer_select())

test_data = [{
        "text": "algun #campo1, y otro #campo2 hacen el #campo3"
    }, {
        "text": "#campo5"
    }]

json_data = {
    "campo1": "barco",
    "campo5": "ejemplo de reemplazo"
}

print(extract_fields(tirada_cell_data.cell_data_asoc))
print(extract_fields(tirada_cell_data.cell_data_coll))
print(replace_fields(test_data, json_data))
json_url = urllib.request.urlopen("http://abr.servehttp.com:3000/api/tirada/start/661902/end/661908")
data = json.loads(json_url.read())
print(tirada_cell_data.db_to_fields(data))
#print(load_page_data(661902))
"""