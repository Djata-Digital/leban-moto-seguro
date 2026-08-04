import { api } from './api';

export type MotorcycleCondition =
  | 'INTACT'
  | 'DAMAGED'
  | 'DISMANTLED'
  | 'ABANDONED'
  | 'BURNED'
  | 'OTHER';

export type RecoveryReport = {
  id: string;
  dispatchId: string;
  policeOfficerId?: string;
  motorcycleCondition: MotorcycleCondition;
  detailedReport: string;
  policeReportNumber?: string;
  keyFound: boolean;
  arrestOccurred: boolean;
  suspectsCount: number;
  confrontation: boolean;
  injuredPeople: boolean;
  ownerPresent: boolean;
  recoveredObjects?: string;
  latitude?: number;
  longitude?: number;
  completedAt: string;
  policeOfficer?: {
    fullName: string;
    badgeNumber?: string;
    stationName?: string;
  };
  dispatch?: any;
};

function unwrapData<T>(value: unknown): T {
  if (
    value &&
    typeof value === 'object' &&
    'data' in value
  ) {
    return (value as { data: T }).data;
  }

  return value as T;
}

export async function createRecoveryReport(
  data: Omit<RecoveryReport, 'id' | 'completedAt' | 'dispatch'>,
) {
  const response = await api.post('/recovery-reports', data);

  return unwrapData<RecoveryReport>(response.data);
}

export async function loadRecoveryReport(dispatchId: string) {
  const response = await api.get(
    `/recovery-reports/dispatch/${dispatchId}`,
  );

  return unwrapData<RecoveryReport>(response.data);
}