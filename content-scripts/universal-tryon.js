// Universal Try-On for context menu - works on all websites
class UniversalTryOn {
  constructor() {
    this.modalManager = new ModalManager();
    this.i18n = null;
    this.lastClickedImage = null;
    this.init();
  }

  async init() {
    // Initialize i18n
    await this.initializeI18n();

    // Check if user has set up the extension
    const isSetup = await this.checkUserSetup();
    if (!isSetup) {
      console.log('User needs to set up the extension first');
      return;
    }

    // Set up modal manager callbacks
    this.modalManager.onRegenerateRequest = (imageSrc) => this.handleTryOnClick(imageSrc);
    this.modalManager.clearCache = (cacheKey) => this.clearCache(cacheKey);

    // Listen for context menu clicks from background script
    this.setupMessageListener();

    // Track right-clicked images
    this.setupImageTracking();

    await this.cleanOldCache();
  }

  async initializeI18n() {
    if (window.i18n) {
      this.i18n = window.i18n;
      await this.i18n.init();
    } else {
      console.warn('i18n not available in UniversalTryOn');
    }
  }

  // Helper method for translations
  t(key, params = {}) {
    return this.i18n ? this.i18n.t(key, params) : key;
  }

  async checkUserSetup() {
    return new Promise(resolve => {
      chrome.storage.local.get(['geminiApiKey', 'userPhoto'], result => {
        resolve(result.geminiApiKey && result.userPhoto);
      });
    });
  }

  setupImageTracking() {
    // Track the last right-clicked image
    document.addEventListener('contextmenu', (e) => {
      if (e.target.tagName === 'IMG') {
        this.lastClickedImage = e.target.src;
        console.log('Right-clicked image:', this.lastClickedImage);
      }
    }, true);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'tryOnContextMenu') {
        console.log('Context menu try-on triggered for:', message.imageSrc);
        this.handleTryOnClick(message.imageSrc);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  async handleTryOnClick(imageSrc) {
    try {
      console.log('🎬 Starting try-on process...', imageSrc);

      const cacheKey = await this.generateCacheKey(imageSrc);
      console.log('🔑 Cache key generated:', cacheKey);

      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        console.log('💾 Found cached result');
        this.showResult(cachedResult);
        return;
      }

      await this.showLoadingModal(imageSrc);
      console.log('⏳ Loading modal shown');

      console.log('🔍 Step 1: Detecting clothes...');
      const clothesInfo = await this.detectClothes(imageSrc);
      console.log('👕 Detected clothes:', clothesInfo);

      console.log('🎨 Step 2: Generating try-on...');
      const apiResult = await this.generateTryOn(imageSrc, clothesInfo);
      console.log('📦 API result:', apiResult);

      let finalResult = apiResult;
      if (apiResult.needsGeneration) {
        console.log('🖼️ Generating actual try-on image with Gemini...');
        try {
          const tryOnResult = await this.generateTryOnWithGemini(
            apiResult.userPhoto,
            apiResult.productImage,
            apiResult.productClothes,
            apiResult.userClothes
          );
          finalResult = {
            ...apiResult,
            generatedImage: tryOnResult.generatedImage
          };
          console.log('✅ Actual try-on image generated with Gemini');
        } catch (error) {
          console.error('❌ Gemini image generation failed:', error);
          finalResult = {
            ...apiResult,
            generatedImage: null,
            error: 'Image generation failed'
          };
        }
      } else {
        console.log('✅ Using pre-generated image');
        finalResult = apiResult;
      }

      try {
        const usage = await this.getStorageUsage();
        const resultSize = JSON.stringify(finalResult).length;

        if (usage + resultSize < 4 * 1024 * 1024) {
          await this.cacheResult(cacheKey, finalResult);
          console.log('💾 Result cached successfully');
        } else {
          console.warn('⚠️ Storage approaching limit, skipping cache to prevent quota exceeded');
          await this.cleanOldCache();
          const newUsage = await this.getStorageUsage();
          if (newUsage + resultSize < 4 * 1024 * 1024) {
            await this.cacheResult(cacheKey, finalResult);
            console.log('💾 Result cached after cleanup');
          } else {
            console.warn('⚠️ Still insufficient space, continuing without cache');
          }
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache failed:', cacheError.message);
      }

      console.log('🎉 Showing final result');
      this.showResult(finalResult);

    } catch (error) {
      console.error('❌ Try-on failed:', error);
      this.showError(error.message);
    }
  }

  async generateCacheKey(imageSrc) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userPhoto'], (result) => {
        const userPhotoHash = this.simpleHash(result.userPhoto || '');
        const imageHash = this.simpleHash(imageSrc);
        resolve(`${imageHash}_${userPhotoHash}`);
      });
    });
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  async getCachedResult(cacheKey) {
    return new Promise(resolve => {
      chrome.storage.local.get([`cache_${cacheKey}`], result => {
        resolve(result[`cache_${cacheKey}`] || null);
      });
    });
  }

  async cacheResult(cacheKey, result) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        [`cache_${cacheKey}`]: result
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async detectClothes(imageSrc) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'detectClothes',
        imageSrc: imageSrc
      }, response => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async generateTryOn(imageSrc, clothesInfo) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateTryOn',
        imageSrc: imageSrc,
        clothesInfo: clothesInfo
      }, response => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async generateTryOnWithGemini(userPhoto, productImageSrc, productClothes, userClothes) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateTryOnWithGemini',
        userPhoto: userPhoto,
        productImageSrc: productImageSrc,
        productClothes: productClothes,
        userClothes: userClothes
      }, response => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async getStorageUsage() {
    return new Promise(resolve => {
      chrome.storage.local.getBytesInUse(null, (usage) => {
        resolve(usage || 0);
      });
    });
  }

  async clearCache(cacheKey) {
    return new Promise(resolve => {
      chrome.storage.local.remove([`cache_${cacheKey}`], resolve);
    });
  }

  async cleanOldCache() {
    try {
      const storage = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });

      const cacheKeys = Object.keys(storage).filter(key => key.startsWith('cache_'));
      if (cacheKeys.length > 3) {
        const keysToRemove = cacheKeys.slice(0, -3);
        await new Promise(resolve => {
          chrome.storage.local.remove(keysToRemove, resolve);
        });
        console.log(`🧹 Cleaned ${keysToRemove.length} old cache entries`);
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  // Modal methods using ModalManager
  async showLoadingModal(imageSrc) {
    return this.modalManager.showLoadingModal(imageSrc);
  }

  showResult(result) {
    this.modalManager.showResult(result);
  }

  showError(message) {
    this.modalManager.showError(message);
  }
}

// Initialize when DOM is ready - but only if we're not on Zalando or AboutYou
// (to avoid conflicts with site-specific connectors)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const hostname = window.location.hostname.toLowerCase();
    const isZalando = hostname.includes('zalando');
    const isAboutYou = hostname.includes('aboutyou');

    if (!isZalando && !isAboutYou) {
      console.log('Initializing UniversalTryOn for:', hostname);
      new UniversalTryOn();
    } else {
      console.log('Skipping UniversalTryOn - site-specific connector will handle:', hostname);
    }
  });
} else {
  const hostname = window.location.hostname.toLowerCase();
  const isZalando = hostname.includes('zalando');
  const isAboutYou = hostname.includes('aboutyou');

  if (!isZalando && !isAboutYou) {
    console.log('Initializing UniversalTryOn for:', hostname);
    new UniversalTryOn();
  } else {
    console.log('Skipping UniversalTryOn - site-specific connector will handle:', hostname);
  }
}
