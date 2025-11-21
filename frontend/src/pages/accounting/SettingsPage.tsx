import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tag,
  ArrowLeftRight,
  Settings as SettingsIcon,
  Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()

  const settingsSections = [
    {
      title: 'Categorías',
      description: 'Gestiona las categorías para clasificar ingresos y egresos',
      icon: Tag,
      color: 'bg-purple-500',
      route: '/accounting/categories',
    },
    {
      title: 'Tipos de Transferencias',
      description: 'Define los tipos de transferencias entre cuentas',
      icon: ArrowLeftRight,
      color: 'bg-blue-500',
      route: '/accounting/transfer-types',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Administra las opciones del módulo de contabilidad
        </p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800"
              onClick={() => navigate(section.route)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-white">{section.title}</CardTitle>
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Administrar
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Info Card */}
      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <SettingsIcon className="h-5 w-5" />
            Configuración del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            • <strong>Categorías:</strong> Organiza tus ingresos y egresos en categorías personalizadas
            para facilitar el análisis financiero.
          </p>
          <p>
            • <strong>Tipos de Transferencias:</strong> Define diferentes tipos de movimientos entre
            cuentas (retiros, depósitos, etc.).
          </p>
          <p className="pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-500">
            Las configuraciones se aplican a todo el módulo de contabilidad y afectan cómo se
            clasifican y reportan las operaciones.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
