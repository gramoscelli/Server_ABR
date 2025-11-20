import bz2
import pickle
import mega
import os
import subprocess
from datetime import datetime
import operator
import pprint

SESSION_CACHE = 'mega_session.pickle'

MEGA_USER = os.environ.get('MEGA_USER') # "gramoscelli@hotmail.com"
MEGA_PASSWORD = os.environ.get('MEGA_PASSWORD') # "Secret20130"

# Datos de la base de datos MySQL
host = os.environ.get('MYSQL_HOST')
port = os.environ.get('MYSQL_PORT') 
user = os.environ.get('MYSQL_USER')
password = os.environ.get('MYSQL_PASSWORD')
database = os.environ.get('MYSQL_DATABASE')

print("Mega Credentials")
print()
print("User: ", MEGA_USER)
print("Pass: ", MEGA_PASSWORD)

def get_mega_client():
    """
    Load Mega session from filename and return the client.
    If no session is available, return None.
    """
    try:
        with open(SESSION_CACHE, 'rb') as f:
            mega_client = pickle.load(f)
        # Quick call to trigger a RequestError if the session is expired
        mega_client.get_quota()
        print("Successfully loaded saved Mega session")
        return mega_client
    except FileNotFoundError:
        print("No saved Mega session")
        pass
    except mega.errors.RequestError:
        print("Saved Mega session was bad")
        pass

    # We didn't get a good client. Generate a new one, cache
    # it in the file, and return it.
    print("Generating new Mega login session")
    mega_client = mega.Mega()
    mega_client.login(MEGA_USER, MEGA_PASSWORD)
    #mega_client.login('abra4550455@gmail.com', 'abr2005')
    with open(SESSION_CACHE, 'wb') as f:
        pickle.dump(mega_client, f)
    return mega_client


if __name__ == '__main__':
    mega_client = get_mega_client()
    print("Your current storage is:")
    print(mega_client.get_storage_space())

    # Ruta de destino del archivo de backup
    

    # Obtener la fecha y hora actual
    timestamp = datetime.now().strftime('%Y-%m-%d_%H:%M:%S')

    # Nombre del archivo de backup con fecha y hora
    backup_file = f'backup_{timestamp}.sql'


    # Ruta completa del archivo de backup
    backup_dir = "/app/backup"
    backup_path = os.path.join(backup_dir, backup_file)
    bz2_path = f'{backup_path}.bz2'
    
    # Realizar el backup de la base de datos
    print("Iniciando backup de la base mysql en ", backup_path)
    backup_command = f'mysqldump -B --skip-set-charset --host={host} --user={user} --port={port} --password={password} --order-by-primary {database} > {backup_path}'
    print("Iniciando compresion de la base mysql en ", bz2_path)
    subprocess.run(backup_command, shell=True)
    bz2_command = f'bzip2 -z "{backup_path}" '
    subprocess.run(bz2_command, shell=True)
    
    # Obtener la lista de archivos en Mega
    files = mega_client.get_files()

    # Crear la carpeta "backup" en Mega si no existe
    if not any(file['a']['n'] == 'backup' and file['t'] == 1 for file in files.values()):
        mega_client.create_folder('backup')

    # mover el archivo a la carpeta backup
    backup_folder = mega_client.find('backup', exclude_deleted=True)

    print(f'Uploading the file {bz2_path}')
    # Subir el archivo de backup
    backup_file = mega_client.upload(bz2_path, backup_folder[0])

    # Obtener la lista de archivos en Mega
    files = mega_client.get_files()

    # Filtrar los archivos que pertenecen a la carpeta "backup"
    backup_files = []
    for file in files.values():
        if file['a']['n'].startswith('backup_') and not "rr" in file['a']:
            backup_files.append(file)

    # Ordenar los archivos por fecha de creación (ascendente)
    sorted_files = sorted(backup_files, key=operator.itemgetter('ts'))

    # Eliminar el archivo más antiguo si hay más de 10 archivos
    if len(sorted_files) > 10:
        oldest_files = sorted_files[:len(sorted_files)-10]
        for file in oldest_files:
            file_h = mega_client.find(file['a']['n'])
            mega_client.delete(file_h[0])

    # Eliminar todos los archivos existentes en el directorio de backup
    
    for file_name in os.listdir(backup_dir):
        file_path = os.path.join(backup_dir, file_name)
        if os.path.isfile(file_path):
            os.remove(file_path)

    print("bye!")
