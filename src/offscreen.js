import { MESSAGES, TARGETS } from './utils.js';

const iconSize = 48 * window.devicePixelRatio;
const notificationSize = 80 * window.devicePixelRatio;

chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(message) {
  if (message.target !== TARGETS.OFFSCREEN) {
    return false;
  }

  switch (message.type) {
    case MESSAGES.GENERATE_ICON_AND_SEND_NOTIFICATION:
      generateIconAndSendNotification(message.data.notificationId, message.data.options);
      break;

    default:
      console.error(`Received unexpected message in offscreen document: ${message.type}.`);
      return false;
  }
}

async function generateIconAndSendNotification(notificationId, options) {
  const iconDataUrl = await getExtensionIconDataUrl(options.extensionId, options.showGrayScaleIcon);
  options.iconUrl = iconDataUrl;
  options.extensionId = undefined;
  options.showGrayScaleIcon = undefined;
  chrome.runtime.sendMessage({
    type: MESSAGES.SEND_NOTIFICATION,
    target: TARGETS.SERVICE_WORKER,
    data: { notificationId, options },
  });
}

// Helper function which returns extension Icon Data Url.
async function getExtensionIconDataUrl(extensionId, showGrayScaleIcon) {
  return new Promise((resolve) => {
    const baseUrl = 'chrome://extension-icon/'+ extensionId +'/'+ iconSize +'/1';
    const url = baseUrl + (showGrayScaleIcon ? '?grayscale=true' : '');
    const icon = new Image();
    icon.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = notificationSize;

      const context = canvas.getContext('2d');

      const iconLeft = (notificationSize - iconSize) / 2;
      const iconTop = iconLeft;
      context.drawImage(icon, iconLeft, iconTop);
      resolve(canvas.toDataURL('image/png'));
    }
    icon.src = url;
  });
}
