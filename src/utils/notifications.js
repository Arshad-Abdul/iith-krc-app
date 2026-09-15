import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from '../../services/kohaApi';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure Android Notification Channel for Status Bar Heads-Up Banners
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('krc-notifications', {
    name: 'KRC Library Notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0284c7',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  }).catch(() => {});
}

export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn("Failed to request notifications permission", err);
    return false;
  }
};

export const registerForPushNotificationsAsync = async (authToken) => {
  if (Platform.OS === 'web') return null;
  const hasPerm = await requestNotificationPermissions();
  if (!hasPerm) return null;

  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    const token = pushTokenData?.data;
    if (token && authToken) {
      await registerPushToken(authToken, token, Platform.OS);
    }
    return token;
  } catch (err) {
    console.warn("Could not register push token:", err.message);
    return null;
  }
};

export const scheduleDueDateAlert = async (bookId, title, dueDateString) => {
  if (Platform.OS === 'web') return;
  const hasPerm = await requestNotificationPermissions();
  if (!hasPerm) return;

  try {
    const dueTime = new Date(dueDateString).getTime();
    const now = Date.now();

    // 1. Reminder: 3 Days Before
    const threeDaysBefore = dueTime - (3 * 24 * 60 * 60 * 1000);
    if (threeDaysBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'KRC Due Date Reminder',
          body: `"${title}" is due in 3 days. Renew it to avoid fines.`,
          sound: true,
        },
        trigger: new Date(threeDaysBefore),
      });
    }

    // 2. Reminder: 1 Day Before
    const oneDayBefore = dueTime - (1 * 24 * 60 * 60 * 1000);
    if (oneDayBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'KRC Due Date Reminder',
          body: `"${title}" is due tomorrow! Please return or renew it.`,
          sound: true,
        },
        trigger: new Date(oneDayBefore),
      });
    }

    // 3. Reminder: Morning of Due Date (8:00 AM)
    const morningOf = dueTime - (4 * 60 * 60 * 1000); // Morning of day
    if (morningOf > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Book Due Today!',
          body: `"${title}" must be returned to KRC desk today.`,
          sound: true,
        },
        trigger: new Date(morningOf),
      });
    }
  } catch (err) {
    console.warn("Error scheduling notification", err);
  }
};

export const scheduleNewArrivalNotification = async (subject, bookTitle) => {
  if (Platform.OS === 'web') return;
  const hasPerm = await requestNotificationPermissions();
  if (!hasPerm) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Books in your Subject!',
        body: `A new book on ${subject} was just acquired: "${bookTitle}"`,
        sound: true,
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn("Error triggering immediate notification", err);
  }
};

export const sendInstantNotification = async (title, body) => {
  if (Platform.OS === 'web') return;
  const hasPerm = await requestNotificationPermissions();
  if (!hasPerm) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("Error triggering instant notification:", err);
  }
};
