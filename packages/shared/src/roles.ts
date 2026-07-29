export const USER_ROLES = {
  ADMIN: 'ADMIN',
  OPERADOR: 'OPERADOR',
  PROPRIETARIO: 'PROPRIETARIO',
  MOTORISTA: 'MOTORISTA',
  POLICIA: 'POLICIA',
  SUPERVISOR_POLICIA: 'SUPERVISOR_POLICIA',
} as const;

export type UserRole = keyof typeof USER_ROLES;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  PROPRIETARIO: 'Proprietário',
  MOTORISTA: 'Motorista',
  POLICIA: 'Polícia',
  SUPERVISOR_POLICIA: 'Supervisor Polícia',
};