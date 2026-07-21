import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../api/client';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Send token to backend
  try {
    await api.post('/api/users/push-token', { token, platform: Platform.OS });
  } catch { /* best effort */ }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  return token;
}

export async function scheduleReminderNotification(reminder: { id: number; title: string; dueDate: string; type?: string }) {
  const dueDate = new Date(reminder.dueDate);
  if (isNaN(dueDate.getTime())) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.type ? `${reminder.type} reminder` : 'Payment reminder',
      data: { reminderId: reminder.id, type: 'reminder' },
    },
    trigger: {
      date: dueDate,
      channelId: 'default',
    },
  });
}

export async function cancelReminderNotification(reminderId: number) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const note of scheduled) {
    if (note.content.data?.reminderId === reminderId) {
      await Notifications.cancelScheduledNotificationAsync(note.identifier);
    }
  }
}

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function getAllScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
