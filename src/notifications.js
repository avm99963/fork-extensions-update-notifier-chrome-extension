import { uninstallExtension } from './management.js';
import { setUpOffscreenDocument } from './offscreen_utils.js';
import { DEFAULT_OPTIONS, NO_PERMISSIONS_GRANTED, getWebstoreChangelog, MESSAGES, TARGETS } from './utils.js';

// Hardcoded since we don't have access to window.devicePixelRatio from
// a service worker.
// TODO(avm99963): move this calculation to the offscreen document.
const devicePixelRatio = 2;
const buttonSize = 16 * devicePixelRatio;

// Helper function which returns a basic notification options object.
function getNotificationOptions(extensionId) {
  return {
    type: 'basic',
    priority: 2,
    requireInteraction: true,
    extensionId,
  };
}

// Helper function which returns button image URL.
function getButtonIconUrl(name) {
  return chrome.runtime.getURL('/images/' + name + '_' + buttonSize + '.png');
}

// Helper function which displays a notification.
async function showNotification(notificationId, options) {
  await setUpOffscreenDocument();
  chrome.runtime.sendMessage({
    type: MESSAGES.GENERATE_ICON_AND_SEND_NOTIFICATION,
    target: TARGETS.OFFSCREEN,
    data: { notificationId, options },
  });
}

// Function called after the extension icon is retrieved in the
// offscreen document.
export function sendNotification(notificationId, options) {
  chrome.notifications.create(notificationId, options, function(){
    chrome.storage.sync.get({autoCloseNotification: DEFAULT_OPTIONS.AUTO_CLOSE_NOTIFICATION}, function(results) {
      if (results.autoCloseNotification) {
        // Raises an alarm to close notification after 10s.
        chrome.alarms.create(notificationId, { when: Date.now() + 10e3 });
      }
    });
  });
}

// Helper function to create notification Id
export function getNotificationId(extension) {
  return extension.id + extension.version;
}

// Helper function to populate notification options.
function setExtensionUpdateNotificationOptions(extension, oldVersion, showChangelog) {
  var options = getNotificationOptions(extension.id);
  options.title = chrome.i18n.getMessage('updatedExtensionTitle', [extension.name]),
  options.message = chrome.i18n.getMessage('updatedExtensionMessage',
      [extension.name, oldVersion, extension.version]),
  options.buttons = [];
  // Make the icon gray and add "Enable" and "Uninstall" buttons if the
  // extension is disabled.
  if (!extension.enabled) {
    options.showGrayScaleIcon = true;
    options.buttons.push({
      title: chrome.i18n.getMessage('enableButtonTitle'),
      iconUrl: getButtonIconUrl('action')
    });
    options.buttons.push({
      title: chrome.i18n.getMessage('uninstallButtonTitle'),
      iconUrl: getButtonIconUrl('trash')
    });
  } else {
    // Add a "Visit website" button if it has one website.
    if (extension.homepageUrl !== '') {
      options.buttons.push({
        title: chrome.i18n.getMessage('websiteButtonTitle'),
        iconUrl: getButtonIconUrl('website')
      });
      if (showChangelog) {
        // And add a "Show changelog" button.
        options.buttons.push({
          title: chrome.i18n.getMessage('changelogButtonTitle'),
          iconUrl: getButtonIconUrl('changelog')
        });
      }
    }
  }
  return options;
}

// Show a notification when an extension has been updated.
export function showExtensionUpdateNotification(extension, oldVersion) {
  var options;
  chrome.storage.sync.get({showChangelog: DEFAULT_OPTIONS.SHOW_CHANGELOG}, function(results) {
    // Don't show changelog button if user doesn't want it.
    if (!results.showChangelog) {
      options = setExtensionUpdateNotificationOptions(extension, oldVersion, false);
      showNotification(getNotificationId(extension), options);
    } else {
      getWebstoreChangelog(extension.id, function success() {
        // Show changelog button if changelog was detected.
        options = setExtensionUpdateNotificationOptions(extension, oldVersion, true);
        showNotification(getNotificationId(extension), options);
      }, function error(reason) {
        // Only show changelog button if permission is not yet granted.
        options = setExtensionUpdateNotificationOptions(extension, oldVersion,
            (reason === NO_PERMISSIONS_GRANTED));
        showNotification(getNotificationId(extension), options);
      });
    }
  });
}

// Show a notification when an extension has been explicitely enabled.
function showExtensionEnabledNotification(extension) {
  var notificationId = getNotificationId(extension);
  // Clear notification first before recreating a new one.
  chrome.notifications.clear(notificationId, function() {
    var options = getNotificationOptions(extension.id);
    options.title = chrome.i18n.getMessage('updatedExtensionTitle', [extension.name]);
    options.message = chrome.i18n.getMessage('enabledExtensionMessage', [extension.name]);

    showNotification(notificationId+'enabled', options);
  });
}

// Clear notification when an extension has been explicitely uninstalled.
function showExtensionUninstalledNotification(extension) {
  var notificationId = getNotificationId(extension);
  chrome.notifications.clear(notificationId);
}

// Handle notifications actions on button Click.
export function onNotificationsButtonClicked(notificationId, buttonIndex) {
  var clickedNotification = {};
  clickedNotification[notificationId] = 'clickedByUser';
  chrome.storage.local.set(clickedNotification, function() {
    var extensionId = notificationId.substr(0, 32);
    chrome.management.get(extensionId, function(extension) {
      if (extension.enabled) {
        if (buttonIndex === 0) {
          window.open(extension.homepageUrl);
        } else if (buttonIndex === 1) {
          window.open(chrome.runtime.getURL('changelog.html#'+ extensionId));
        }
      } else {
        if (buttonIndex === 0) {
          setEnabledExtension(extension, true, showExtensionEnabledNotification);
        } else {
          uninstallExtension(extension, showExtensionUninstalledNotification);
        }
      }
    });
  });
}

// Clear notification if user clicks on it.
export function onNotificationsClicked(notificationId) {
  // Open new options page.
  if (notificationId === 'newOptions') {
    chrome.runtime.openOptionsPage();
  }
  var clickedNotification = {};
  clickedNotification[notificationId] = 'clickedByUser';
  chrome.storage.local.set(clickedNotification, function() {
    chrome.notifications.clear(notificationId);
  });
}

// Warn the others that this notification has been closed by the user.
export function onNotificationsClosed(notificationId, closedByUser) {
  chrome.storage.local.get(notificationId, function(results) {
    if (closedByUser || results[notificationId] === 'clickedByUser') {
      var closedNotification = {};
      closedNotification[notificationId] = 'closedByUser';
      chrome.storage.sync.set(closedNotification);
    }
  });
}

// Close notification if user already closed it on another device.
export function onStorageChanged(changes, area) {
  for (var notificationId in changes) {
    if (changes[notificationId].newValue === 'closedByUser')
      chrome.notifications.clear(notificationId);
  }
}

// Open extensions options page when user clicked on notification settings.
export function onNotificationsShowSettings() {
  chrome.runtime.openOptionsPage();
}

export function closeExtensionNotifications(extensionId) {
 chrome.notifications.getAll(function(notificationIds) {
    Object.keys(notificationIds).forEach(function(notificationId) {
      if (notificationId.indexOf(extensionId) === 0) {
        chrome.notifications.clear(notificationId);
      }
    });
  });
}

export function onAlarm(alarm) {
  // Show new options notification when alarm is received.
  if (alarm.name === 'newOptions') {
    chrome.storage.sync.get('newOptions', function(results) {
      if (results['newOptions'] !== 'closedByUser') {
        var options = getNotificationOptions(chrome.runtime.id);
        options.title = chrome.i18n.getMessage('newOptionsTitle');
        options.message = chrome.i18n.getMessage('newOptionsText');

        showNotification('newOptions', options);
      }
    });
  // Clear notification otherwise.
  } else {
   chrome.storage.sync.get({autoCloseNotification: DEFAULT_OPTIONS.AUTO_CLOSE_NOTIFICATION}, function(results) {
     if (results.autoCloseNotification) {
       var notificationId = alarm.name;
       chrome.notifications.clear(notificationId);
     }
   });
  }
}

export function onInstalled(details) {
  // Display a Welcome notification if this extension is installed for the first time.
  if (details.reason === 'install') {
    var options = getNotificationOptions(chrome.runtime.id);
    options.title = chrome.i18n.getMessage('welcomeTitle');
    options.message = chrome.i18n.getMessage('welcomeText');

    showNotification('welcome', options);
  }

  // Wait for 30 seconds before prompting user about new options.
  chrome.alarms.create('newOptions', { when: Date.now() + 30e3 });
}
