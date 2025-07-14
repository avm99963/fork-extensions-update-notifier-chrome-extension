export const NO_PERMISSIONS_GRANTED = 'NO_PERMISSIONS_GRANTED';

export const DEFAULT_OPTIONS = {
  ALWAYS_DISABLE_EXTENSION: false,
  AUTO_CLOSE_NOTIFICATION: false,
  SHOW_CHANGELOG: true,
}

export const MESSAGES = {
  GENERATE_ICON_AND_SEND_NOTIFICATION: 'GENERATE_ICON_AND_SEND_NOTIFICATION',
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
}
export const TARGETS = {
  OFFSCREEN: 'OFFSCREEN',
  SERVICE_WORKER: 'SERVICE_WORKER',
};

export const EXTENSION_VERSIONS_KEY = '__extensionVersions__';

// Localize all content.
export function localize() {
  var elements = document.querySelectorAll('[i18-content]');
  for (var element, i = 0; element = elements[i]; i++) {
    var messageName = element.getAttribute('i18-content');
    element.textContent = chrome.i18n.getMessage(messageName);
  }
}

// Attempts to get changelog if webstore extension page has one.
export function getWebstoreChangelog(extensionId, successCallback, errorCallback) {
  var permissions = { origins: ['https://chrome.google.com/*'] };
  chrome.permissions.contains(permissions, function(result) {
    if (!result) {
      errorCallback(NO_PERMISSIONS_GRANTED);
      return;
    }
    var webstoreUrl = 'https://chrome.google.com/webstore/detail/'+ extensionId;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', webstoreUrl, true);
    xhr.onload = function() {
      // Retrieve what's inside <pre></pre>.
      var text = xhr.response.substring(xhr.response.search('<pre '),
          xhr.response.search('</pre>'));

      // We assume there is a changelog,
      // If the word "changelog" is inside.
      if (text.search(/changelog/i) !== -1) {
        successCallback(text.substring(text.search(/changelog/i), text.length));
      // If the version number is inside.
      } else if (text.indexOf(localStorage[extensionId]) !== -1) {
        var index = text.indexOf(localStorage[extensionId]);
        while (index >0 && text[index].charCodeAt(0) !== 10) {
            index--;
        }
        successCallback(text.substring(index, text.length));
      // If the word "What's new" is inside.
      } else if (text.search(/What&#39;s new/i) !== -1) {
        successCallback(text.substring(text.search(/What&#39;s new/i), text.length));
      } else {
        errorCallback();
      }
    };
    xhr.onerror = errorCallback;
    xhr.send(null);
  });
}

export async function getExtensionVersions() {
  const results = await chrome.storage.local.get(EXTENSION_VERSIONS_KEY);
  return results[EXTENSION_VERSIONS_KEY] ?? {};
}

export async function getCurrentExtensionVersion(extensionId) {
  return (await getExtensionVersions())[extensionId];
}

export async function saveCurrentExtensionVersion(extensionId, version) {
  const extensionVersions = await getExtensionVersions();
  extensionVersions[extensionId] = version;
  await chrome.storage.local.set({ [EXTENSION_VERSIONS_KEY]: extensionVersions });
}

export async function removeCurrentExtensionVersion(extensionId) {
  const extensionVersions = await getExtensionVersions();
  delete extensionVersions[extensionId];
  await chrome.storage.local.set({ [EXTENSION_VERSIONS_KEY]: extensionVersions });
}
