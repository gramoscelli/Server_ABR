import time
from escpos.printer import Serial
from escpos.printer import Network

if "{printer_conn.value}" == "network":
    p =  Network("{printer_host.value}", port={printer_port.value})
else:
    p = Serial(devfile="{comm_name.value}", baudrate={comm_bps.value}, bytesize={comm_bsz.value}, timeout=2, stopbits={comm_stop.value}, parity='{comm_par.value}')

p.charcode(code='LATIN2')
p.set(align='center', font='a', text_type='b',  width=1, height=1)
p.image("logo.bmp")
p.text("ASOCIACIÓN BERNARDINO RIVADAVIA\n")
p.text("BIBLIOTECA POPULAR\n")
p.set(align='center', font='a', text_type='normal',  width=1, height=1)
p.text("rivadaviabiblioteca.adm@gmail.com\n")
p.set(align='center', font='b', text_type='b',  width=1, height=1)
p.text("Av. Colón 31 - Bahía Blanca\n")
p.set(align='center', font='a', text_type='b',  width=2, height=3)
p.text("Prueba de Impresión\n")
# set(align='left', font='a', bold=False, underline=0, width=1, height=1, density=9, 
# invert=False, smooth=False, flip=False, double_width=False, double_height=False, 
# custom_size=False)
p.cut()
p.close()
