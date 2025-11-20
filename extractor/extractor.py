import json
import requests
from bs4 import BeautifulSoup

def main(expresion):
    # URL base
    url_template = 'http://campi.abr.net/omp/cgi-bin/wxis/omp/circulacion/?IsisScript=circulacion/consulta.xis&operario_id=gberni&criterio=lector&expresion={}'

    # Formatear la URL con la expresión proporcionada
    url = url_template.format(expresion)

    # Descargar el contenido HTML desde la URL
    response = requests.get(url)
    response.encoding = 'ISO-8859-1'  # Asegurarse de que la codificación sea la correcta

    if response.status_code == 200:
        input_html = response.text

        # Parsear el contenido HTML
        soup = BeautifulSoup(input_html, 'html.parser')

        # Encontrar todas las tablas en el contenido HTML
        tables = soup.find_all('table')

        if len(tables) > 1:
            # Procesar la segunda tabla
            table = tables[1]
            rows = table.find_all('tr')
            
            # Procesar las filas de la tabla
            data = []
            for row in rows:  # Omitir la primera fila (encabezados)
                cells = row.find_all('td')
                
                # Asegurarse de que la cantidad de celdas coincida con la cantidad de encabezados
                row_data = {i: cells[i].text.strip() for i in range(len(cells))}
                data.append(row_data)
            # Convertir los datos a JSON
            json_output = json.dumps(data, ensure_ascii=False)
            
            # Mostrar la segunda tabla en formato JSON
            print(json_output)
        else:
            print("No se encontró la segunda tabla en el contenido HTML.")
    else:
        print(f"Error al descargar el contenido HTML. Código de estado: {response.status_code}")

if __name__ == "__main__":
    import argparse

    # Configurar argparse para manejar los argumentos de la línea de comandos
    parser = argparse.ArgumentParser(description='Obtener y procesar una tabla desde una URL.')
    parser.add_argument('expresion', type=str, help='El valor de la expresión para la URL')

    # Parsear los argumentos
    args = parser.parse_args()

    # Llamar a la función principal con el argumento proporcionado
    main(args.expresion)