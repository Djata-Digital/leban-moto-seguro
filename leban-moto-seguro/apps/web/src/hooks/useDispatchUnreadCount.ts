import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { socket } from '../api/socket';

import {
  countUnreadMessages,
  type DispatchMessage,
} from '../api/dispatchMessages';

type ParticipantType = 'CENTRAL' | 'POLICE';

export function useDispatchUnreadCount(
  dispatchId: string,
  participantType: ParticipantType,
) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!dispatchId) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await countUnreadMessages(
        dispatchId,
        participantType,
      );

      setUnreadCount(count);
    } catch (error) {
      console.error(
        'Erro ao carregar mensagens não lidas:',
        error,
      );
    }
  }, [dispatchId, participantType]);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    function handleMessageCreated(
      message: DispatchMessage,
    ) {
      if (
        message.dispatchId !== dispatchId ||
        message.senderType === participantType
      ) {
        return;
      }

      setUnreadCount((current) => current + 1);
    }

    function handleMessagesRead(payload: {
      dispatchId: string;
      readerType: ParticipantType;
    }) {
      if (
        payload.dispatchId === dispatchId &&
        payload.readerType === participantType
      ) {
        setUnreadCount(0);
      }
    }

    socket.on(
      'dispatch.message.created',
      handleMessageCreated,
    );

    socket.on(
      'dispatch.messages.read',
      handleMessagesRead,
    );

    return () => {
      socket.off(
        'dispatch.message.created',
        handleMessageCreated,
      );

      socket.off(
        'dispatch.messages.read',
        handleMessagesRead,
      );
    };
  }, [dispatchId, participantType]);

  return {
    unreadCount,
    reloadUnreadCount: loadUnreadCount,
  };
}