import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Upload } from 'lucide-react'

interface AddTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: TransferFormData) => void
}

export interface TransferFormData {
  fromAccount: string
  toAccount: string
  fromAmount: string
  fromCurrency: string
  toAmount: string
  toCurrency: string
  date: string
  description: string
  attachments: File[]
}

export function AddTransferDialog({ open, onOpenChange, onSubmit }: AddTransferDialogProps) {
  const [formData, setFormData] = useState<TransferFormData>({
    fromAccount: 'Cash',
    toAccount: 'Cash',
    fromAmount: '',
    fromCurrency: 'ARS',
    toAmount: '0',
    toCurrency: 'ARS',
    date: new Date().toISOString().split('T')[0],
    description: '',
    attachments: [],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(formData)
    // Reset form
    setFormData({
      fromAccount: 'Cash',
      toAccount: 'Cash',
      fromAmount: '',
      fromCurrency: 'ARS',
      toAmount: '0',
      toCurrency: 'ARS',
      date: new Date().toISOString().split('T')[0],
      description: '',
      attachments: [],
    })
    onOpenChange(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setFormData({ ...formData, attachments: Array.from(files) })
    }
  }

  // Auto-sync amounts if currencies are the same
  const handleFromAmountChange = (value: string) => {
    const newData = { ...formData, fromAmount: value }
    if (formData.fromCurrency === formData.toCurrency) {
      newData.toAmount = value
    }
    setFormData(newData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Agregar Transferencia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From Account */}
          <div className="space-y-2">
            <Label htmlFor="fromAccount" className="text-sm font-medium text-gray-700">
              Desde
            </Label>
            <Select
              value={formData.fromAccount}
              onValueChange={(value) => setFormData({ ...formData, fromAccount: value })}
            >
              <SelectTrigger id="fromAccount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Efectivo</SelectItem>
                <SelectItem value="Bank">Banco</SelectItem>
                <SelectItem value="Savings">Ahorros</SelectItem>
                <SelectItem value="CreditCard">Tarjeta de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* From Amount */}
          <div className="space-y-2">
            <Label htmlFor="fromAmount" className="text-sm font-medium text-gray-700">
              Monto
            </Label>
            <div className="flex gap-2">
              <Input
                id="fromAmount"
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                className="flex-1"
                required
              />
              <Select
                value={formData.fromCurrency}
                onValueChange={(value) => setFormData({ ...formData, fromCurrency: value })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label htmlFor="toAccount" className="text-sm font-medium text-gray-700">
              Hacia
            </Label>
            <Select
              value={formData.toAccount}
              onValueChange={(value) => setFormData({ ...formData, toAccount: value })}
            >
              <SelectTrigger id="toAccount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Efectivo</SelectItem>
                <SelectItem value="Bank">Banco</SelectItem>
                <SelectItem value="Savings">Ahorros</SelectItem>
                <SelectItem value="CreditCard">Tarjeta de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* To Amount */}
          <div className="space-y-2">
            <Label htmlFor="toAmount" className="text-sm font-medium text-gray-700">
              Monto
            </Label>
            <div className="flex gap-2">
              <Input
                id="toAmount"
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.toAmount}
                onChange={(e) => setFormData({ ...formData, toAmount: e.target.value })}
                className="flex-1"
                required
              />
              <Select
                value={formData.toCurrency}
                onValueChange={(value) => setFormData({ ...formData, toCurrency: value })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-gray-700">
              Fecha
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descripción
            </Label>
            <textarea
              id="description"
              placeholder="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Adjuntos</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload-transfer"
              />
              <label htmlFor="file-upload-transfer" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Haz clic para subir o arrastra y suelta</p>
              </label>
              {formData.attachments.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {formData.attachments.length} archivo(s) seleccionado(s)
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold h-12 text-base"
          >
            Agregar Transferencia
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
