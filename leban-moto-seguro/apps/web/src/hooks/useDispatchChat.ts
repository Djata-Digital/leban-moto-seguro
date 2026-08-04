import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { socket } from '../api/socket';

import {
  countUnreadMessages,
  loadDispatchMessages,
  markMessagesAsRead,
  sendDispatchMessage,
  type DispatchMessage,
  type DispatchMessageSenderType,
} from '../api/dispatchMessages';

type ChatParticipantType = 'CENTRAL' | 'POLICE';

export function useDispatchChat(
  dispatchId: string,
  senderType: ChatParticipantType,
  senderId?: string,
) {
  const [messages, setMessages] = useState<DispatchMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otherSideTyping, setOtherSideTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const otherTypingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  const load = useCallback(async () => {
    if (!dispatchId) {
      setMessages([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await loadDispatchMessages(dispatchId);

      setMessages(result);

      const unread = await countUnreadMessages(
        dispatchId,
        senderType,
      );

      setUnreadCount(unread);

      await markMessagesAsRead(
        dispatchId,
        senderType,
      );

      setUnreadCount(0);
    } catch (loadError) {
      console.error(
        'Erro ao carregar mensagens do despacho:',
        loadError,
      );

      setError(
        'Não foi possível carregar as mensagens.',
      );
    } finally {
      setLoading(false);
    }
  }, [dispatchId, senderType]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dispatchId) {
      return;
    }

    socket.emit(
      'dispatch.chat.join',
      dispatchId,
    );

    function handleMessageCreated(
      message: DispatchMessage,
    ) {
      if (message.dispatchId !== dispatchId) {
        return;
      }

      setMessages((current) => {
        const alreadyExists = current.some(
          (item) => item.id === message.id,
        );

        if (alreadyExists) {
          return current;
        }

        return [...current, message];
      });

      if (message.senderType !== senderType) {
        setUnreadCount(
          (current) => current + 1,
        );

        void markMessagesAsRead(
          dispatchId,
          senderType,
        )
          .then(() => {
            setUnreadCount(0);
          })
          .catch((readError) => {
            console.error(
              'Erro ao marcar mensagens como lidas:',
              readError,
            );
          });
      }
    }

    function handleMessagesRead(payload: {
      dispatchId: string;
      readerType: DispatchMessageSenderType;
      readAt?: string;
    }) {
      if (payload.dispatchId !== dispatchId) {
        return;
      }

      setMessages((current) =>
        current.map((message) => {
          if (
            message.senderType ===
            payload.readerType
          ) {
            return message;
          }

          return {
            ...message,
            isRead: true,
            readAt:
              payload.readAt ??
              new Date().toISOString(),
          };
        }),
      );

      if (payload.readerType === senderType) {
        setUnreadCount(0);
      }
    }

    function handleTyping(payload: {
      dispatchId: string;
      senderType: ChatParticipantType;
    }) {
      if (
        payload.dispatchId !== dispatchId ||
        payload.senderType === senderType
      ) {
        return;
      }

      setOtherSideTyping(true);

      if (
        otherTypingTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          otherTypingTimeoutRef.current,
        );
      }

      otherTypingTimeoutRef.current =
        window.setTimeout(() => {
          setOtherSideTyping(false);
          otherTypingTimeoutRef.current = null;
        }, 3000);
    }

    function handleStopTyping(payload: {
      dispatchId: string;
      senderType: ChatParticipantType;
    }) {
      if (
        payload.dispatchId !== dispatchId ||
        payload.senderType === senderType
      ) {
        return;
      }

      setOtherSideTyping(false);

      if (
        otherTypingTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          otherTypingTimeoutRef.current,
        );

        otherTypingTimeoutRef.current = null;
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

    socket.on(
      'dispatch.chat.typing',
      handleTyping,
    );

    socket.on(
      'dispatch.chat.stopTyping',
      handleStopTyping,
    );

    return () => {
      socket.emit(
        'dispatch.chat.leave',
        dispatchId,
      );

      socket.off(
        'dispatch.message.created',
        handleMessageCreated,
      );

      socket.off(
        'dispatch.messages.read',
        handleMessagesRead,
      );

      socket.off(
        'dispatch.chat.typing',
        handleTyping,
      );

      socket.off(
        'dispatch.chat.stopTyping',
        handleStopTyping,
      );

      if (
        typingTimeoutRef.current !== null
      ) {
        window.clearTimeout(
          typingTimeoutRef.current,
        );

        typingTimeoutRef.current = null;
      }

      if (
        otherTypingTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          otherTypingTimeoutRef.current,
        );

        otherTypingTimeoutRef.current = null;
      }

      isTypingRef.current = false;
    };
  }, [dispatchId, senderType]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, otherSideTyping]);

  function notifyTyping() {
    if (!dispatchId) {
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;

      socket.emit(
        'dispatch.chat.typing',
        {
          dispatchId,
          senderType,
        },
      );
    }

    if (
      typingTimeoutRef.current !== null
    ) {
      window.clearTimeout(
        typingTimeoutRef.current,
      );
    }

    typingTimeoutRef.current =
      window.setTimeout(() => {
        stopTyping();
      }, 1500);
  }

  function stopTyping() {
    if (
      !isTypingRef.current ||
      !dispatchId
    ) {
      return;
    }

    isTypingRef.current = false;

    socket.emit(
      'dispatch.chat.stopTyping',
      {
        dispatchId,
        senderType,
      },
    );

    if (
      typingTimeoutRef.current !== null
    ) {
      window.clearTimeout(
        typingTimeoutRef.current,
      );

      typingTimeoutRef.current = null;
    }
  }

  async function send(
    messageText: string,
  ) {
    const normalizedMessage =
      messageText.trim();

    if (
      !normalizedMessage ||
      !dispatchId ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setError('');
      stopTyping();

      const createdMessage =
        await sendDispatchMessage({
          dispatchId,
          senderId,
          senderType,
          message: normalizedMessage,
        });

      setMessages((current) => {
        const alreadyExists = current.some(
          (item) =>
            item.id === createdMessage.id,
        );

        if (alreadyExists) {
          return current;
        }

        return [
          ...current,
          createdMessage,
        ];
      });
    } catch (sendError) {
      console.error(
        'Erro ao enviar mensagem:',
        sendError,
      );

      setError(
        'Não foi possível enviar a mensagem.',
      );

      throw sendError;
    } finally {
      setSending(false);
    }
  }

  return {
    messages,
    unreadCount,
    sending,
    loading,
    error,
    otherSideTyping,
    send,
    reload: load,
    notifyTyping,
    stopTyping,
    bottomRef,
  };
}