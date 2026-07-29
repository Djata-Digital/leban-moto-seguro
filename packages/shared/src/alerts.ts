export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

export const ALERT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  ACKNOWLEDGED: 'Reconhecido',
  RESOLVED: 'Resolvido',
  DISMISSED: 'Descartado',
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  THEFT_GPS_SIGNAL: 'Mota com ocorrência transmitiu GPS',
  LOW_GPS_BATTERY: 'Bateria baixa do GPS',
  GPS_NO_SIGNAL: 'GPS sem comunicação',
  MOTORCYCLE_OUT_OF_ROUTE: 'Mota fora da rota',
  UNAUTHORIZED_DRIVER: 'Motorista não autorizado',
  AUTHORIZATION_EXPIRED: 'Autorização expirada',
  GPS_DEVICE_REMOVED: 'GPS removido',
  MANUAL_ALERT: 'Alerta manual',
};