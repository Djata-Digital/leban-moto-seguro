import { api } from './api';

export type RecoveryEvidenceType =
  | 'PHOTO'
  | 'VIDEO'
  | 'AUDIO'
  | 'DOCUMENT';

export type RecoveryEvidence = {
  id: string;
  dispatchId: string;
  policeOfficerId?: string;
  type: RecoveryEvidenceType;
  fileUrl: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;

  policeOfficer?: {
    id: string;
    fullName: string;
    badgeNumber?: string;
    stationName?: string;
  };
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

export async function loadRecoveryEvidences(
  dispatchId: string,
): Promise<RecoveryEvidence[]> {
  const response = await api.get(
    `/recovery-evidences/dispatch/${dispatchId}`,
  );

  const result = unwrapData<RecoveryEvidence[]>(
    response.data,
  );

  return Array.isArray(result) ? result : [];
}

export async function uploadRecoveryEvidences(data: {
  dispatchId: string;
  policeOfficerId?: string;
  files: File[];
  notes?: string;
  latitude?: number;
  longitude?: number;
}): Promise<RecoveryEvidence[]> {
  const formData = new FormData();

  formData.append('dispatchId', data.dispatchId);

  if (data.policeOfficerId) {
    formData.append(
      'policeOfficerId',
      data.policeOfficerId,
    );
  }

  if (data.notes?.trim()) {
    formData.append(
      'notes',
      data.notes.trim(),
    );
  }

  if (typeof data.latitude === 'number') {
    formData.append(
      'latitude',
      String(data.latitude),
    );
  }

  if (typeof data.longitude === 'number') {
    formData.append(
      'longitude',
      String(data.longitude),
    );
  }

  data.files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post(
    '/recovery-evidences',
    formData,
  );

  const result = unwrapData<RecoveryEvidence[]>(
    response.data,
  );

  return Array.isArray(result) ? result : [];
}

export async function deleteRecoveryEvidence(
  evidenceId: string,
) {
  await api.delete(
    `/recovery-evidences/${evidenceId}`,
  );
}