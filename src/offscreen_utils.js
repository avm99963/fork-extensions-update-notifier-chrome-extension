// Based on https://developer.chrome.com/docs/extensions/reference/api/offscreen#examples
const OFFSCREEN_DOCUMENT = 'offscreen.html';

let creating = undefined;
export async function setUpOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT,
      reasons: ['DOM_SCRAPING'],
      justification: 'The extension is retrieving an extension\'s icon to generate a notification icon.',
    });
    await creating;
    creating = undefined;
  }
}
