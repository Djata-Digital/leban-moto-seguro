const NOTIFICATIONS_ENABLED_KEY =
  'leban_notifications_enabled';

const DEFAULT_MESSAGE_SOUND =
  '/sounds/new-message.wav';

let unlockAudio: HTMLAudioElement | null =
  null;

export function notificationsAreEnabled() {
  return (
    localStorage.getItem(
      NOTIFICATIONS_ENABLED_KEY,
    ) === 'true'
  );
}

export async function enableNotifications() {
  localStorage.setItem(
    NOTIFICATIONS_ENABLED_KEY,
    'true',
  );

  if (
    'Notification' in window &&
    Notification.permission === 'default'
  ) {
    await Notification.requestPermission();
  }

  try {
    unlockAudio = new Audio(
      DEFAULT_MESSAGE_SOUND,
    );

    unlockAudio.preload = 'auto';
    unlockAudio.volume = 0.01;

    await unlockAudio.play();

    unlockAudio.pause();
    unlockAudio.currentTime = 0;
    unlockAudio.volume = 1;
  } catch (error) {
    console.warn(
      'O navegador ainda não liberou o áudio:',
      error,
    );
  }
}

export function disableNotifications() {
  localStorage.setItem(
    NOTIFICATIONS_ENABLED_KEY,
    'false',
  );
}

export async function playNotificationSound(
  soundPath = DEFAULT_MESSAGE_SOUND,
) {
  if (!notificationsAreEnabled()) {
    return;
  }

  try {
    const audio = new Audio(soundPath);

    audio.preload = 'auto';
    audio.volume = 1;

    await audio.play();
  } catch (error) {
    console.error(
      'Não foi possível tocar o som da notificação:',
      error,
    );
  }
}

export function showBrowserNotification(
  title: string,
  options?: NotificationOptions,
) {
  if (!notificationsAreEnabled()) {
    return;
  }

  if (
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return;
  }

  const notification =
    new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      ...options,
    });

  notification.onclick = () => {
    window.focus();

    const notificationData =
      notification.data as
        | {
            url?: string;
          }
        | undefined;

    if (notificationData?.url) {
      window.location.href =
        notificationData.url;
    }

    notification.close();
  };
}