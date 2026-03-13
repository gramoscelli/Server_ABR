import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Translates technical role names to user-friendly Spanish names
 */
export function getRoleDisplayName(role: string): string {
  const roleMap: { [key: string]: string } = {
    'root': 'Administrador',
    'admin_employee': 'Empleado Administrativo',
    'library_employee': 'Empleado de Biblioteca',
    'new_user': 'Usuario Nuevo',
  }

  return roleMap[role.toLowerCase()] || role
}

/**
 * Formats a number as Argentine Peso currency: $ 1.234,56
 */
export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0)
}
