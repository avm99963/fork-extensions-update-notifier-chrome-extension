import './dev.js';
import {
  onAlarm,
  onNotificationsButtonClicked,
  onNotificationsClicked,
  onNotificationsClosed,
  onNotificationsShowSettings,
  onStorageChanged,
  onInstalled,
  sendNotification,
} from './notifications.js';
import {
  checkExtensionVersion,
  onExtensionUninstalled,
  onExtensionDisabled,
  onStartup,
} from './management.js';
import { MESSAGES, TARGETS } from './utils.js';

// Notification handlers
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.notifications.onButtonClicked.addListener(onNotificationsButtonClicked);
chrome.notifications.onClicked.addListener(onNotificationsClicked);
chrome.notifications.onClosed.addListener(onNotificationsClosed);
chrome.notifications.onShowSettings.addListener(onNotificationsShowSettings);
chrome.storage.onChanged.addListener(onStorageChanged);
chrome.runtime.onInstalled.addListener(onInstalled);

// Management handlers
chrome.management.onInstalled.addListener(checkExtensionVersion);
chrome.management.onUninstalled.addListener(onExtensionUninstalled);
chrome.management.onDisabled.addListener(onExtensionDisabled);

// Runtime messages
chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(message) {
  if (message.target !== TARGETS.SERVICE_WORKER) {
    return false;
  }

  switch (message.type) {
    case MESSAGES.SEND_NOTIFICATION:
      sendNotification(message.data.notificationId, message.data.options);
      break;

    default:
      console.error(`Received unexpected message in service worker: ${message.type}.`);
      return false;
  }
}

onStartup();
