export const MOTORCYCLE_TYPES = {
  PARTICULAR: 'PARTICULAR',
  MOTO_TAXI: 'MOTO_TAXI',
} as const;

export type MotorcycleType = keyof typeof MOTORCYCLE_TYPES;

export const MOTORCYCLE_TYPE_LABELS: Record<MotorcycleType, string> = {
  PARTICULAR: 'Particular',
  MOTO_TAXI: 'Moto-táxi',
};

export const MOTORCYCLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  STOLEN: 'Furtada',
  ROBBED: 'Roubada',
  RECOVERED: 'Recuperada',
  INVESTIGATION: 'Em investigação',
  BLOCKED: 'Bloqueada',
};