import { useEffect } from 'react';

import { socket } from '../../api/socket';

import {
  playNotificationSound,
  showBrowserNotification,
} from '../../utils/notificationManager';

type DispatchMessagePayload = {
  id: string;
  dispatchId: string;

  senderType:
    | 'CENTRAL'
    | 'POLICE'
    | 'SYSTEM';

  message: string;

  dispatch?: {
    id?: string;
    code?: string;

    motorcycle?: {
      plateNumber?: string;
    };
  };
};

type DispatchPayload = {
  id?: string;
  code?: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  assignedAt?: string;

  motorcycle?: {
    id?: string;
    plateNumber?: string;
    brand?: string;
    model?: string;
  };

  policeOfficer?: {
    id?: string;
    fullName?: string;
    badgeNumber?: string;
    stationName?: string;
  };
};

export function GlobalNotifications() {
  useEffect(() => {
    function handleNewMessage(
      message: DispatchMessagePayload,
    ) {
      void playNotificationSound(
        '/sounds/new-message.wav',
      );

      const dispatchCode =
        message.dispatch?.code ??
        'Despacho';

      const plateNumber =
        message.dispatch?.motorcycle
          ?.plateNumber;

      showBrowserNotification(
        'Nova mensagem operacional',
        {
          body: [
            dispatchCode,

            plateNumber
              ? `Mota ${plateNumber}`
              : '',

            message.message,
          ]
            .filter(Boolean)
            .join(' — '),

          tag:
            `dispatch-message-${message.dispatchId}`,

          data: {
            url: message.dispatchId
              ? `/noc?dispatchId=${message.dispatchId}`
              : '/noc',
          },
        },
      );
    }

    function handleDispatchAssigned(
      dispatch: DispatchPayload,
    ) {
      void playNotificationSound(
        '/sounds/new-dispatch.wav',
      );

      const dispatchCode =
        dispatch.code ??
        'Novo despacho';

      const plateNumber =
        dispatch.motorcycle?.plateNumber;

      const priority =
        translatePriority(
          dispatch.priority,
        );

      const officerName =
        dispatch.policeOfficer
          ?.fullName;

      showBrowserNotification(
        'Novo despacho policial',
        {
          body: [
            dispatchCode,

            plateNumber
              ? `Mota ${plateNumber}`
              : '',

            priority
              ? `Prioridade ${priority}`
              : '',

            officerName
              ? `Policial: ${officerName}`
              : '',
          ]
            .filter(Boolean)
            .join(' — '),

          tag:
            `dispatch-${dispatch.id ?? dispatch.code}`,

          requireInteraction: true,

          data: {
            url:
              dispatch.policeOfficer?.id
                ? `/police/${dispatch.policeOfficer.id}/dispatches`
                : '/noc',
          },
        },
      );
    }

    function handleDispatchUpdated(
      dispatch: DispatchPayload,
    ) {
      const status =
        dispatch.status;

      if (
        status !== 'RECOVERED' &&
        status !== 'RESOLVED'
      ) {
        return;
      }

      const soundPath =
        status === 'RECOVERED'
          ? '/sounds/motorcycle-recovered.wav'
          : '/sounds/mission-finished.wav';

      void playNotificationSound(
        soundPath,
      );

      showBrowserNotification(
        status === 'RECOVERED'
          ? 'Motocicleta recuperada'
          : 'Missão concluída',
        {
          body: [
            dispatch.code ??
              'Despacho',

            dispatch.motorcycle
              ?.plateNumber
              ? `Mota ${dispatch.motorcycle.plateNumber}`
              : '',
          ]
            .filter(Boolean)
            .join(' — '),

          tag:
            `dispatch-status-${dispatch.id}-${status}`,

          data: {
            url: dispatch.id
              ? `/recovery-reports/${dispatch.id}`
              : '/noc',
          },
        },
      );
    }

    socket.on(
      'dispatch.message.created',
      handleNewMessage,
    );

    socket.on(
      'dispatch.assigned',
      handleDispatchAssigned,
    );

    socket.on(
      'dispatch.updated',
      handleDispatchUpdated,
    );

    return () => {
      socket.off(
        'dispatch.message.created',
        handleNewMessage,
      );

      socket.off(
        'dispatch.assigned',
        handleDispatchAssigned,
      );

      socket.off(
        'dispatch.updated',
        handleDispatchUpdated,
      );
    };
  }, []);

  return null;
}

function translatePriority(
  priority?: string,
) {
  if (priority === 'CRITICAL') {
    return 'crítica';
  }

  if (priority === 'HIGH') {
    return 'alta';
  }

  if (priority === 'MEDIUM') {
    return 'média';
  }

  if (priority === 'LOW') {
    return 'baixa';
  }

  return '';
}