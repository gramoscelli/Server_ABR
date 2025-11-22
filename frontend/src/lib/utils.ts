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
