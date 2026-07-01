// Service Worker and Notification registration helper
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export function registerServiceWorker(onNotificationAction: (action: string, id: string) => void) {
  // Always request notification permissions, even in local development (dev mode)
  requestNotificationPermission();

  if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registered successfully with scope: ', registration.scope);
          
          // Request notification permissions
          requestNotificationPermission();
        })
        .catch((err) => {
          console.error('ServiceWorker registration failed: ', err);
        });
    });

    // Listen to messages from the Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
        const { action, reminderId } = event.data;
        console.log('Received notification action message from SW:', action, reminderId);
        onNotificationAction(action, reminderId);
      }
    });
  } else {
    // If in dev mode or native app, we can still register SW for testing or just log
    console.log('ServiceWorker registration skipped (either unsupported, native Capacitor wrapper, or in Dev mode).');
  }

  // Set up native notification click listeners if running on native device
  if (Capacitor.isNativePlatform()) {
    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      const action = notificationAction.actionId || 'click';
      const reminderId = notificationAction.notification.extra?.reminderId;
      console.log('Native local notification action performed:', action, reminderId);
      if (reminderId) {
        onNotificationAction(action === 'tap' ? 'click' : action.toUpperCase(), reminderId);
      }
    });
  }
}

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const permissionStatus = await LocalNotifications.requestPermissions();
      console.log('Capacitor native notification permissions status:', permissionStatus);
    } catch (err) {
      console.error('Failed to request native notification permissions:', err);
    }
    return;
  }

  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // Show a welcome notification
          showLocalNotification('Welcome to LifeOS!', {
            body: 'LifeOS will notify you about your reminders and tasks here.',
            icon: '/icon-192.png'
          });
        }
      });
    }
  }
}

export function showLocalNotification(title: string, options: any = {}) {
  const defaultOptions: any = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    ...options
  };

  if (Capacitor.isNativePlatform()) {
    LocalNotifications.schedule({
      notifications: [
        {
          title,
          body: options.body || '',
          id: Math.floor(Math.random() * 1000000),
          schedule: { at: new Date(Date.now() + 500) }, // fire in 500ms
          extra: options.data || {}
        }
      ]
    }).catch(err => console.error('Failed to schedule native notification:', err));
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    // Fired from main thread
    try {
      new Notification(title, defaultOptions);
    } catch (e) {
      // Fallback if browser requires service worker to fire notification
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, defaultOptions);
        });
      }
    }
  }
}
