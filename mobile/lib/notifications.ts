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

  try {
    await api.post('/api/users/push-token', { token, platform: Platform.OS });
  } catch { /* ignore push token errors */ }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
    await Notifications.setNotificationChannelAsync('budget', {
      name: 'Budget Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#f59e0b',
    });
    await Notifications.setNotificationChannelAsync('reminder', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#6366f1',
    });
  }

  return token;
}

export async function scheduleReminderNotification(reminder: { id: number; title: string; dueDate: string; type?: string; description?: string }) {
  const dueDate = new Date(reminder.dueDate);
  if (isNaN(dueDate.getTime())) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.description || (reminder.type ? `${reminder.type} reminder` : 'Payment reminder'),
      data: { reminderId: reminder.id, type: 'reminder' },
    },
    trigger: {
      date: dueDate,
      channelId: 'reminder',
    },
  });
}

export async function scheduleNotification(title: string, body: string, triggerDate: Date, data?: Record<string, unknown>, channelId?: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data || {}, sound: true },
    trigger: { date: triggerDate, channelId: channelId || 'default' },
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

export async function checkBudgetAlerts() {
  try {
    const res = await api.get('/api/budgets');
    const budgets = Array.isArray(res.data) ? res.data : res.data?.data || [];
    for (const b of budgets) {
      const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
      if (pct >= 75) {
        await scheduleNotification(
          `Budget ${pct >= 90 ? 'Alert' : 'Warning'}: ${b.category?.name || 'Budget'}`,
          `Used ${Math.round(pct)}% of ${b.category?.name || 'budget'} limit (${b.spent?.toLocaleString()} / ${b.amount?.toLocaleString()})`,
          new Date(Date.now() + 1000),
          { type: 'budget_alert', budgetId: b.id },
          'budget'
        );
      }
    }
   } catch { /* ignore budget alert errors */ }
}


export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function getAllScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
