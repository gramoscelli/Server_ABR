import win32print
from PIL import Image, ImageDraw, ImageFont

def imprimir_texto(texto, tipo_letra, x, y, draw):
    font = ImageFont.truetype(tipo_letra, 20)
    draw.text((x, y), texto, font=font, fill=0)

def imprimir_imagen(ruta_imagen, x, y, ancho_celda, alto_celda, hDC):
    imagen = Image.open(ruta_imagen)
    imagen = imagen.resize((ancho_celda, alto_celda))
    imagen = imagen.convert("1")
    datos = list(imagen.getdata())
    datos = [255 - pixel for pixel in datos]
    datos = bytes(datos)
    win32print.WritePrinter(hDC, datos)

def imprimir_matriz(matriz):
    ancho_celda = 300
    alto_celda = 300
    margen_x = 50
    margen_y = 50

    hDC = win32print.GetDefaultPrinter()
    printer_handle = win32print.OpenPrinter(hDC)
    try:
        win32print.StartDocPrinter(printer_handle, 1, ("Documento de prueba", None, "RAW"))
        win32print.StartPagePrinter(printer_handle)
        draw = ImageDraw.Draw(hDC)

        for fila in range(4):
            for columna in range(4):
                x = columna * ancho_celda + margen_x
                y = fila * alto_celda + margen_y

                # Imprimir texto en la celda
                texto = matriz[fila][columna]["texto"]
                tipo_letra = matriz[fila][columna]["tipo_letra"]
                imprimir_texto(texto, tipo_letra, x, y, draw)

                # Imprimir imagen en la celda
                ruta_imagen = matriz[fila][columna]["ruta_imagen"]
                imprimir_imagen(ruta_imagen, x, y, ancho_celda, alto_celda, hDC)

        win32print.EndPagePrinter(printer_handle)
        win32print.EndDocPrinter(printer_handle)
    finally:
        win32print.ClosePrinter(printer_handle)

# Ejemplo de matriz con texto y rutas de imagen
matriz = [
    [
        {"texto": "Celda 1", "tipo_letra": "Arial", "ruta_imagen": "imagen1.jpg"},
        {"texto": "Celda 2", "tipo_letra": "Courier New", "ruta_imagen": "imagen2.jpg"},
        {"texto": "Celda 3", "tipo_letra": "Times New Roman", "ruta_imagen": "imagen3.jpg"},
        {"texto": "Celda 4", "tipo_letra": "Arial", "ruta_imagen": "imagen4.jpg"}
    ],
    [
        {"texto": "Celda 5", "tipo_letra": "Courier New", "ruta_imagen": "imagen5.jpg"},
        {"texto": "Celda 6", "tipo_letra": "Times New Roman", "ruta_imagen": "imagen6.jpg"},
        {"texto": "Celda 7", "tipo_letra": "Arial", "ruta_imagen": "imagen7.jpg"},
        {"texto": "Celda 8", "tipo_letra": "Courier New", "ruta_imagen": "imagen8.jpg"}
    ],
    [
        {"texto": "Celda 9", "tipo_letra": "Times New Roman", "ruta_imagen": "imagen9.jpg"},
        {"texto": "Celda 10", "tipo_letra": "Arial", "ruta_imagen": "imagen10.jpg"},
        {"texto": "Celda 11", "tipo_letra": "Courier New", "ruta_imagen": "imagen11.jpg"},
        {"texto": "Celda 12", "tipo_letra": "Times New Roman", "ruta_imagen": "imagen12.jpg"}
    ],
    [
        {"texto": "Celda 13", "tipo_letra": "Arial", "ruta_imagen": "imagen13.jpg"},
        {"texto": "Celda 14", "tipo_letra": "Courier New", "ruta_imagen": "imagen14.jpg"},
        {"texto": "Celda 15", "tipo_letra": "Times New Roman", "ruta_imagen": "imagen15.jpg"},
        {"texto": "Celda 16", "tipo_letra": "Arial", "ruta_imagen": "imagen16.jpg"}
    ]
]

imprimir_matriz(matriz)
