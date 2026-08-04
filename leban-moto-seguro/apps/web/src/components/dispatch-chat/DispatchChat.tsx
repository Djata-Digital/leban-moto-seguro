import { useState } from 'react';
import {
  AlertCircle,
  RefreshCcw,
  Send,
} from 'lucide-react';

import {
  DispatchChatMessage,
  type DispatchChatMessageData,
} from './DispatchChatMessage';

import { useDispatchChat } from '../../hooks/useDispatchChat';

type DispatchChatProps = {
  dispatchId: string;
  senderType: 'CENTRAL' | 'POLICE';
  senderId?: string;
};

export function DispatchChat({
  dispatchId,
  senderType,
  senderId,
}: DispatchChatProps) {
  const [text, setText] = useState('');

  const {
    messages,
    unreadCount,
    sending,
    loading,
    error,
    otherSideTyping,
    send,
    reload,
    notifyTyping,
    stopTyping,
    bottomRef,
  } = useDispatchChat(
    dispatchId,
    senderType,
    senderId,
  );

  async function handleSend() {
    const normalizedText = text.trim();

    if (!normalizedText || sending) {
      return;
    }

    try {
      await send(normalizedText);
      setText('');
    } catch {
      // O erro já é apresentado pelo hook.
    }
  }

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-xl border bg-slate-50">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">
              Chat Operacional
            </h3>

            {unreadCount > 0 && (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Comunicação em tempo real sobre o despacho
          </p>
        </div>

        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          title="Atualizar mensagens"
        >
          <RefreshCcw
            size={17}
            className={
              loading ? 'animate-spin' : ''
            }
          />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-auto p-4">
        {loading && !messages.length ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Carregando mensagens...
          </p>
        ) : (
          <>
            {messages.map(
              (
                message: DispatchChatMessageData,
              ) => (
                <DispatchChatMessage
                  key={message.id}
                  message={message}
                  mine={
                    message.senderType ===
                    senderType
                  }
                />
              ),
            )}

            {!messages.length && (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  Nenhuma mensagem
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Inicie a comunicação sobre esta missão.
                </p>
              </div>
            )}
          </>
        )}

        {otherSideTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border bg-white px-4 py-2 shadow-sm">
              <p className="text-xs text-slate-500">
                {senderType === 'CENTRAL'
                  ? 'Policial está digitando...'
                  : 'Central está digitando...'}
              </p>

              <div className="mt-1 flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);

              if (event.target.value.trim()) {
                notifyTyping();
              } else {
                stopTyping();
              }
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey
              ) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Digite uma mensagem..."
            className="min-h-[44px] flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={
              sending || !text.trim()
            }
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Enter envia. Shift + Enter cria uma linha.
          </span>

          <span>
            {text.length}/2000
          </span>
        </div>
      </div>
    </div>
  );
}