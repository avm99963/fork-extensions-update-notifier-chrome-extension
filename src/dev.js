import { saveCurrentExtensionVersion } from './utils.js';

// This is only for me when I play with it during development.
chrome.management.getSelf(async function(extension) {
  if (extension.installType === 'development') {
    await saveCurrentExtensionVersion('eignhdfgaldabilaaegmdfbajngjmoke', '0');
    await saveCurrentExtensionVersion('gbchcmhmhahfdphkhkmpfmihenigjmpp', '0');
    await saveCurrentExtensionVersion('hfhhnacclhffhdffklopdkcgdhifgngh', '0');
    await saveCurrentExtensionVersion('knmdbhdejcjgpahocbnbbekpaehgghnk', '0');
    await saveCurrentExtensionVersion('bebigdkelppomhhjaaianniiifjbgocn', '0');
  }
});
