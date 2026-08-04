import { api } from './api';

export type DispatchMessageSenderType =
  | 'CENTRAL'
  | 'POLICE'
  | 'SYSTEM';

export type DispatchMessage = {
  id: string;
  dispatchId: string;
  senderId?: string;
  senderType: DispatchMessageSenderType;
  message: string;
  latitude?: number;
  longitude?: number;
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;

  sender?: {
    id?: string;
    fullName?: string;
    role?: string;
  };
};

type SendDispatchMessageData = {
  dispatchId: string;
  senderId?: string;
  senderType: DispatchMessageSenderType;
  message: string;
  latitude?: number;
  longitude?: number;
};

function unwrapData<T>(responseData: unknown): T {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData
  ) {
    return (responseData as { data: T }).data;
  }

  return responseData as T;
}

export async function loadDispatchMessages(
  dispatchId: string,
): Promise<DispatchMessage[]> {
  const response = await api.get(
    `/dispatch-messages/dispatch/${dispatchId}`,
  );

  const messages = unwrapData<DispatchMessage[]>(
    response.data,
  );

  return Array.isArray(messages) ? messages : [];
}

export async function sendDispatchMessage(
  data: SendDispatchMessageData,
): Promise<DispatchMessage> {
  const response = await api.post(
    '/dispatch-messages',
    data,
  );

  return unwrapData<DispatchMessage>(response.data);
}

export async function markMessagesAsRead(
  dispatchId: string,
  senderType: 'CENTRAL' | 'POLICE',
) {
  const response = await api.patch(
    `/dispatch-messages/dispatch/${dispatchId}/read`,
    {},
    {
      params: {
        senderType,
      },
    },
  );

  return unwrapData(response.data);
}

export async function countUnreadMessages(
  dispatchId: string,
  senderType: 'CENTRAL' | 'POLICE',
): Promise<number> {
  const response = await api.get(
    `/dispatch-messages/dispatch/${dispatchId}/unread`,
    {
      params: {
        senderType,
      },
    },
  );

  const result = unwrapData<{
    dispatchId: string;
    unread: number;
  }>(response.data);

  return result?.unread ?? 0;
}