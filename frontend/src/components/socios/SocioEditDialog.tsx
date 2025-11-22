import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, X, User, MapPin, Phone, Mail, Calendar, FileText, Users } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'

interface Grupo {
  Gr_ID: number
  Gr_Nombre: string
}

interface TipoDocumento {
  TD_ID: number
  TD_Tipo: string
}

interface Cobrador {
  Co_ID: number
  Co_Nombre: string
}

interface Adicional {
  Ad_ID: number
  Ad_ApeNom: string
  TD_ID: number | null
  Ad_DocNro: string | null
}

interface SocioFull {
  So_ID: number
  So_Nombre: string
  So_Apellido: string
  So_DomRes: string
  So_DomCob: string
  So_Telef: string
  So_NroDoc: string
  So_Email: string
  So_FecNac: string
  So_AnioIngre: number | null
  So_MesIngre: number | null
  So_NroCarnet: string | null
  So_NotaCob: string | null
  So_Obs: string | null
  So_PersFisica: 'Y' | 'N'
  So_Fallecido: 'Y' | 'N'
  So_DiferenciaCuota: number
  So_Aut_Apellido: string | null
  So_Aut_Nombre: string | null
  So_Aut_Domi: string | null
  So_Aut_Telef: string | null
  So_Aut_TipoDoc: number | null
  So_Aut_NroDoc: string | null
  Gr_ID: number | null
  TD_ID: number | null
  Co_ID: number | null
  grupo?: { Gr_ID: number; Gr_Nombre: string }
  tipoDocumento?: { TD_ID: number; TD_Tipo: string }
  cobrador?: { Co_ID: number; Co_Nombre: string }
  adicionales?: Adicional[]
}

interface SocioEditDialogProps {
  socioId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function SocioEditDialog({ socioId, open, onOpenChange, onSaved }: SocioEditDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [socio, setSocio] = useState<SocioFull | null>(null)

  // Dropdown data
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([])
  const [cobradores, setCobradores] = useState<Cobrador[]>([])

  // Form state
  const [formData, setFormData] = useState({
    So_Nombre: '',
    So_Apellido: '',
    So_DomRes: '',
    So_DomCob: '',
    So_Telef: '',
    So_NroDoc: '',
    So_Email: '',
    So_FecNac: '',
    So_AnioIngre: '',
    So_MesIngre: '',
    So_NroCarnet: '',
    So_NotaCob: '',
    So_Obs: '',
    So_PersFisica: 'Y' as 'Y' | 'N',
    So_Fallecido: 'N' as 'Y' | 'N',
    So_DiferenciaCuota: '0',
    So_Aut_Apellido: '',
    So_Aut_Nombre: '',
    So_Aut_Domi: '',
    So_Aut_Telef: '',
    So_Aut_TipoDoc: '',
    So_Aut_NroDoc: '',
    Gr_ID: '',
    TD_ID: '',
    Co_ID: '',
  })

  // Load dropdown data
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [gruposRes, tiposRes, cobradoresRes] = await Promise.all([
          fetchWithAuth('/api/socios/dropdown/grupos'),
          fetchWithAuth('/api/socios/dropdown/tipos-documento'),
          fetchWithAuth('/api/socios/dropdown/cobradores'),
        ])

        const gruposData = await gruposRes.json()
        const tiposData = await tiposRes.json()
        const cobradoresData = await cobradoresRes.json()

        if (gruposData.success) setGrupos(gruposData.data)
        if (tiposData.success) setTiposDocumento(tiposData.data)
        if (cobradoresData.success) setCobradores(cobradoresData.data)
      } catch (error) {
        console.error('Error loading dropdowns:', error)
      }
    }

    if (open) {
      loadDropdowns()
    }
  }, [open])

  // Load socio data when dialog opens
  useEffect(() => {
    const loadSocio = async () => {
      if (!socioId || !open) return

      setLoading(true)
      try {
        const response = await fetchWithAuth(`/api/socios/${socioId}/full`)
        const result = await response.json()

        if (result.success && result.data) {
          const data = result.data
          setSocio(data)
          setFormData({
            So_Nombre: data.So_Nombre || '',
            So_Apellido: data.So_Apellido || '',
            So_DomRes: data.So_DomRes || '',
            So_DomCob: data.So_DomCob || '',
            So_Telef: data.So_Telef || '',
            So_NroDoc: data.So_NroDoc || '',
            So_Email: data.So_Email || '',
            So_FecNac: data.So_FecNac ? data.So_FecNac.split('T')[0] : '',
            So_AnioIngre: data.So_AnioIngre?.toString() || '',
            So_MesIngre: data.So_MesIngre?.toString() || '',
            So_NroCarnet: data.So_NroCarnet || '',
            So_NotaCob: data.So_NotaCob || '',
            So_Obs: data.So_Obs || '',
            So_PersFisica: data.So_PersFisica || 'Y',
            So_Fallecido: data.So_Fallecido || 'N',
            So_DiferenciaCuota: data.So_DiferenciaCuota?.toString() || '0',
            So_Aut_Apellido: data.So_Aut_Apellido || '',
            So_Aut_Nombre: data.So_Aut_Nombre || '',
            So_Aut_Domi: data.So_Aut_Domi || '',
            So_Aut_Telef: data.So_Aut_Telef || '',
            So_Aut_TipoDoc: data.So_Aut_TipoDoc?.toString() || '',
            So_Aut_NroDoc: data.So_Aut_NroDoc || '',
            Gr_ID: data.Gr_ID?.toString() || '',
            TD_ID: data.TD_ID?.toString() || '',
            Co_ID: data.Co_ID?.toString() || '',
          })
        } else {
          throw new Error(result.message || 'Error al cargar socio')
        }
      } catch (error) {
        console.error('Error loading socio:', error)
        toast({
          title: 'Error',
          description: 'No se pudo cargar la información del socio',
          variant: 'destructive',
        })
        onOpenChange(false)
      } finally {
        setLoading(false)
      }
    }

    loadSocio()
  }, [socioId, open, toast, onOpenChange])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!socioId) return

    setSaving(true)
    try {
      const payload = {
        So_Nombre: formData.So_Nombre,
        So_Apellido: formData.So_Apellido,
        So_DomRes: formData.So_DomRes,
        So_DomCob: formData.So_DomCob,
        So_Telef: formData.So_Telef,
        So_NroDoc: formData.So_NroDoc,
        So_Email: formData.So_Email,
        So_FecNac: formData.So_FecNac || null,
        So_AnioIngre: formData.So_AnioIngre ? parseInt(formData.So_AnioIngre) : null,
        So_MesIngre: formData.So_MesIngre ? parseInt(formData.So_MesIngre) : null,
        So_NroCarnet: formData.So_NroCarnet,
        So_NotaCob: formData.So_NotaCob,
        So_Obs: formData.So_Obs,
        So_PersFisica: formData.So_PersFisica,
        So_Fallecido: formData.So_Fallecido,
        So_DiferenciaCuota: parseFloat(formData.So_DiferenciaCuota) || 0,
        So_Aut_Apellido: formData.So_Aut_Apellido,
        So_Aut_Nombre: formData.So_Aut_Nombre,
        So_Aut_Domi: formData.So_Aut_Domi,
        So_Aut_Telef: formData.So_Aut_Telef,
        So_Aut_TipoDoc: formData.So_Aut_TipoDoc ? parseInt(formData.So_Aut_TipoDoc) : null,
        So_Aut_NroDoc: formData.So_Aut_NroDoc,
        Gr_ID: formData.Gr_ID ? parseInt(formData.Gr_ID) : null,
        TD_ID: formData.TD_ID ? parseInt(formData.TD_ID) : null,
        Co_ID: formData.Co_ID ? parseInt(formData.Co_ID) : null,
      }

      const response = await fetchWithAuth(`/api/socios/${socioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Guardado',
          description: 'Los cambios se guardaron correctamente',
        })
        onSaved()
        onOpenChange(false)
      } else {
        throw new Error(result.message || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error saving socio:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron guardar los cambios',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const months = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Socio #{socioId}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Datos Personales */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Datos Personales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="So_Apellido">Apellido</Label>
                  <Input
                    id="So_Apellido"
                    value={formData.So_Apellido}
                    onChange={(e) => handleInputChange('So_Apellido', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_Nombre">Nombre</Label>
                  <Input
                    id="So_Nombre"
                    value={formData.So_Nombre}
                    onChange={(e) => handleInputChange('So_Nombre', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="TD_ID">Tipo Documento</Label>
                  <Select
                    value={formData.TD_ID}
                    onValueChange={(value) => handleInputChange('TD_ID', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDocumento.map((tipo) => (
                        <SelectItem key={tipo.TD_ID} value={tipo.TD_ID.toString()}>
                          {tipo.TD_Tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="So_NroDoc">Número de Documento</Label>
                  <Input
                    id="So_NroDoc"
                    value={formData.So_NroDoc}
                    onChange={(e) => handleInputChange('So_NroDoc', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_FecNac">Fecha de Nacimiento</Label>
                  <Input
                    id="So_FecNac"
                    type="date"
                    value={formData.So_FecNac}
                    onChange={(e) => handleInputChange('So_FecNac', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_NroCarnet">Número de Carnet</Label>
                  <Input
                    id="So_NroCarnet"
                    value={formData.So_NroCarnet}
                    onChange={(e) => handleInputChange('So_NroCarnet', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="So_Telef">Teléfono</Label>
                  <Input
                    id="So_Telef"
                    value={formData.So_Telef}
                    onChange={(e) => handleInputChange('So_Telef', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_Email">Email</Label>
                  <Input
                    id="So_Email"
                    type="email"
                    value={formData.So_Email}
                    onChange={(e) => handleInputChange('So_Email', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Domicilios */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Domicilios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="So_DomRes">Domicilio de Residencia</Label>
                  <Input
                    id="So_DomRes"
                    value={formData.So_DomRes}
                    onChange={(e) => handleInputChange('So_DomRes', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_DomCob">Domicilio de Cobro</Label>
                  <Input
                    id="So_DomCob"
                    value={formData.So_DomCob}
                    onChange={(e) => handleInputChange('So_DomCob', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Datos de Asociación */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Datos de Asociación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="Gr_ID">Grupo</Label>
                  <Select
                    value={formData.Gr_ID}
                    onValueChange={(value) => handleInputChange('Gr_ID', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grupo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.Gr_ID} value={grupo.Gr_ID.toString()}>
                          {grupo.Gr_Nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="Co_ID">Cobrador</Label>
                  <Select
                    value={formData.Co_ID}
                    onValueChange={(value) => handleInputChange('Co_ID', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cobrador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cobradores.map((cobrador) => (
                        <SelectItem key={cobrador.Co_ID} value={cobrador.Co_ID.toString()}>
                          {cobrador.Co_Nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="So_DiferenciaCuota">Diferencia Cuota</Label>
                  <Input
                    id="So_DiferenciaCuota"
                    type="number"
                    step="0.01"
                    value={formData.So_DiferenciaCuota}
                    onChange={(e) => handleInputChange('So_DiferenciaCuota', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_AnioIngre">Año de Ingreso</Label>
                  <Input
                    id="So_AnioIngre"
                    type="number"
                    min="1900"
                    max="2100"
                    value={formData.So_AnioIngre}
                    onChange={(e) => handleInputChange('So_AnioIngre', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_MesIngre">Mes de Ingreso</Label>
                  <Select
                    value={formData.So_MesIngre}
                    onValueChange={(value) => handleInputChange('So_MesIngre', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mes..." />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Estado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="So_PersFisica" className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="So_PersFisica"
                      checked={formData.So_PersFisica === 'Y'}
                      onChange={(e) => handleInputChange('So_PersFisica', e.target.checked ? 'Y' : 'N')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Persona Física
                  </Label>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="So_Fallecido" className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="So_Fallecido"
                      checked={formData.So_Fallecido === 'Y'}
                      onChange={(e) => handleInputChange('So_Fallecido', e.target.checked ? 'Y' : 'N')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Fallecido
                  </Label>
                </div>
              </div>
            </div>

            {/* Persona Autorizada */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Persona Autorizada
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="So_Aut_Apellido">Apellido</Label>
                  <Input
                    id="So_Aut_Apellido"
                    value={formData.So_Aut_Apellido}
                    onChange={(e) => handleInputChange('So_Aut_Apellido', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_Aut_Nombre">Nombre</Label>
                  <Input
                    id="So_Aut_Nombre"
                    value={formData.So_Aut_Nombre}
                    onChange={(e) => handleInputChange('So_Aut_Nombre', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_Aut_TipoDoc">Tipo Documento</Label>
                  <Select
                    value={formData.So_Aut_TipoDoc}
                    onValueChange={(value) => handleInputChange('So_Aut_TipoDoc', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDocumento.map((tipo) => (
                        <SelectItem key={tipo.TD_ID} value={tipo.TD_ID.toString()}>
                          {tipo.TD_Tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="So_Aut_NroDoc">Número de Documento</Label>
                  <Input
                    id="So_Aut_NroDoc"
                    value={formData.So_Aut_NroDoc}
                    onChange={(e) => handleInputChange('So_Aut_NroDoc', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_Aut_Domi">Domicilio</Label>
                  <Input
                    id="So_Aut_Domi"
                    value={formData.So_Aut_Domi}
                    onChange={(e) => handleInputChange('So_Aut_Domi', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="So_Aut_Telef">Teléfono</Label>
                  <Input
                    id="So_Aut_Telef"
                    value={formData.So_Aut_Telef}
                    onChange={(e) => handleInputChange('So_Aut_Telef', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Notas y Observaciones */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas y Observaciones
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="So_NotaCob">Nota de Cobro</Label>
                  <textarea
                    id="So_NotaCob"
                    value={formData.So_NotaCob}
                    onChange={(e) => handleInputChange('So_NotaCob', e.target.value)}
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="So_Obs">Observaciones</Label>
                  <textarea
                    id="So_Obs"
                    value={formData.So_Obs}
                    onChange={(e) => handleInputChange('So_Obs', e.target.value)}
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
