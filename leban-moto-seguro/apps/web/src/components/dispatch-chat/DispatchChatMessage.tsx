export type DispatchChatMessageData = {
  id: string;
  dispatchId: string;
  senderType: 'CENTRAL' | 'POLICE' | 'SYSTEM';
  message: string;
  createdAt: string;
  isRead?: boolean;

  sender?: {
    id?: string;
    fullName?: string;
    role?: string;
  };
};

type DispatchChatMessageProps = {
  message: DispatchChatMessageData;
  mine: boolean;
};

export function DispatchChatMessage({
  message,
  mine,
}: DispatchChatMessageProps) {
  const senderName =
    message.sender?.fullName ??
    translateSenderType(message.senderType);

  return (
    <div
      className={`flex ${
        mine ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
          mine
            ? 'rounded-br-md bg-blue-600 text-white'
            : 'rounded-bl-md border bg-white text-slate-900'
        }`}
      >
        <p
          className={`text-[11px] font-bold ${
            mine ? 'text-blue-100' : 'text-slate-500'
          }`}
        >
          {senderName}
        </p>

        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
          {message.message}
        </p>

        <div
          className={`mt-2 flex items-center justify-end gap-2 text-[10px] ${
            mine ? 'text-blue-100' : 'text-slate-400'
          }`}
        >
          <span>{formatMessageTime(message.createdAt)}</span>

          {mine && (
            <span>
              {message.isRead ? 'Lida' : 'Enviada'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function translateSenderType(
  senderType: DispatchChatMessageData['senderType'],
) {
  if (senderType === 'CENTRAL') {
    return 'Central Operacional';
  }

  if (senderType === 'POLICE') {
    return 'Policial';
  }

  return 'Sistema';
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}