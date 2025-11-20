import time
from escpos.printer import Serial
from escpos.printer import Network

if "{printer_conn.value}" == "network":
    p =  Network("{printer_host.value}", port={printer_port.value})
else:
    p = Serial(devfile="{comm_name.value}", baudrate={comm_bps.value}, bytesize={comm_bsz.value}, timeout=2, stopbits={comm_stop.value}, parity='{comm_par.value}')

p.charcode(code='PORTUGUESE')
p.set(align='center', font='a', text_type='b',  width=1, height=1)
p.image("logo.bmp")
p.text("ASOCIACIÓN BERNARDINO RIVADAVIA\n")
p.text("BIBLIOTECA POPULAR\n")
p.set(align='center', font='a', text_type='normal',  width=1, height=1)
p.text("rivadaviabiblioteca.adm@gmail.com\n")
p.set(align='center', font='b', text_type='normal',  width=1, height=1)
p.text("Av. Colón 31 - Bahía Blanca\n")
p.set(align='center', font='a', text_type='b',  width=1, height=2)
p.text("Recibo de cuota\n")
p.set(align='left', font='a', text_type='normal',  width=2, height=1)
p.text(f"Cuota: {cuota_mesanio.value}\n")
p.text(f"Importe: $ {cuota_value.value}\n")
p.set(align='left', font='b', text_type='b',  width=2, height=2)
p.text(f"Código: {soc_id.value}\n")
nom = "{soc_apenom.value}"
p.text(f"Nombre: "+nom[0:24]+"\n")
p.set(align='left', font='a', text_type='normal',  width=1, height=1)
p.text(f"Categoria: {soc_type.value}\n")
p.text(f"Rec. Nro.: {cuota_id.value}\n");
p.set(align='left', font='a', text_type='normal',  width=1, height=1)
p.text(f"Cobrador: {cob_name.value}\n")
p.set(align='center', font='b', text_type='b',  width=1, height=1)
p.text("C.U.I.T: 30-52895478-9 - ING. BRUTOS: EXENTO - I.V.A.: EXENTO\n")
# set(align='left', font='a', bold=False, underline=0, width=1, height=1, density=9, 
# invert=False, smooth=False, flip=False, double_width=False, double_height=False, 
# custom_size=False)

# p.set(align='center')
# p.qr("http://www.abrbp.org.ar/api/cuota?num={cuota_id.value}", size=6)

p.cut()
p.close()
