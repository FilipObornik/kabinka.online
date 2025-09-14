class BaseTryOnConnector {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
    this._galleryOpening = false;
    this.modalManager = new ModalManager();
    this.i18n = null;
    this.init();
  }
  
  async init() {
    // Initialize i18n
    await this.initializeI18n();
    
    // Check if current domain is supported
    if (!this.isCurrentDomainSupported()) {
      console.log(`Current domain not supported by ${this.siteConfig.name} connector`);
      return;
    }
    
    const isSetup = await this.checkUserSetup();
    if (!isSetup) {
      console.log('User needs to set up the extension first');
      return;
    }
    
    // Set up modal manager callbacks
    this.modalManager.onRegenerateRequest = (imageSrc) => this.handleTryOnClick(imageSrc);
    this.modalManager.clearCache = (cacheKey) => this.clearCache(cacheKey);
    
    await this.cleanOldCache();
    this.injectButtons();
    this.observePageChanges();
  }

  async initializeI18n() {
    if (window.i18n) {
      this.i18n = window.i18n;
      await this.i18n.init();
    } else {
      console.warn('i18n not available in BaseTryOnConnector');
    }
  }

  // Helper method for translations
  t(key, params = {}) {
    return this.i18n ? this.i18n.t(key, params) : key;
  }

  // Shared implementation using selectors from siteConfig
  findProductImages() {
    let images = [];
    
    // Try primary selectors first
    for (const selector of this.siteConfig.selectors.primary) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        images = Array.from(found);
        break;
      }
    }
    
    // If no primary images found, try fallback
    if (images.length === 0) {
      for (const selector of this.siteConfig.selectors.fallback) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          images = Array.from(found).filter(img => this.filterFallbackSelectedImage(img));
          break;
        }
      }
    }
    
    return images.filter(img => !img.hasAttribute('data-tryon-processed'));
  }

  // Override this for site-specific image filtering
  filterFallbackSelectedImage(img) {
    return img.width > 200 && img.height > 200;
  }

  // Shared button creation logic
  addTryOnButton(img) {
    if (this.isProgressOrGalleryActive()) {
      console.log(`${this.siteConfig.name}: Skipping individual button addition - progress or gallery is active`);
      return;
    }
    
    if (img.hasAttribute('data-tryon-processed')) return;
    
    img.setAttribute('data-tryon-processed', 'true');
    
    const container = this.findButtonContainer(img);
    if (!container) return;
    
    const button = this.createButton(img);
    const wrapper = this.createButtonWrapper();
    
    this.positionButton(container, wrapper, button, img);
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleTryOnClick(img.src);
    });
  }

  // Abstract methods for site-specific customization
  findButtonContainer(img) {
    return img.closest('div') || img.parentElement;
  }

  createButton(img) {
    const button = document.createElement('button');
    button.className = this.getButtonClassName();
    button.textContent = this.t('tryon.button');
    button.setAttribute('data-image-src', img.src);
    button.setAttribute('data-image-alt', img.alt || '');
    return button;
  }

  createButtonWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = this.getWrapperClassName();
    return wrapper;
  }

  // Abstract methods to be implemented by shop-specific connectors
  getButtonClassName() {
    return 'tryon-button';
  }

  getWrapperClassName() {
    return 'tryon-button-wrapper';
  }

  positionButton(container, wrapper, button, img) {
    throw new Error('positionButton must be implemented by shop-specific connector');
  }

  // Check if progress modal or gallery is currently active
  isProgressOrGalleryActive() {
    // Check for progress/loading modal
    const progressModal = document.querySelector('.tryon-modal');
    if (progressModal) {
      console.log('Progress modal is active, skipping button injection');
      return true;
    }
    
    // Check for gallery overlay
    const galleryOverlay = document.querySelector('.tryon-gallery-overlay');
    if (galleryOverlay) {
      console.log('Gallery is active, skipping button injection');
      return true;
    }
    
    return false;
  }

  // Shared functionality
  isCurrentDomainSupported() {
    const currentHost = window.location.hostname.toLowerCase();
    
    // Support both single domain name and multiple domains array
    if (this.siteConfig.name && !this.siteConfig.domains) {
      // Legacy support: check if current host contains the site name
      return currentHost.includes(this.siteConfig.name.toLowerCase());
    }
    
    if (this.siteConfig.domains && Array.isArray(this.siteConfig.domains)) {
      // New multi-domain support
      return this.siteConfig.domains.some(domain => 
        currentHost === domain.toLowerCase() || 
        currentHost.endsWith('.' + domain.toLowerCase())
      );
    }
    
    // Fallback: always allow if no domain configuration
    return true;
  }

  async checkUserSetup() {
    return new Promise(resolve => {
      chrome.storage.local.get(['geminiApiKey', 'userPhoto'], result => {
        resolve(result.geminiApiKey && result.userPhoto);
      });
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

  injectButtons() {
    if (this.isProgressOrGalleryActive()) {
      console.log(`${this.siteConfig.name}: Skipping button injection - progress or gallery is active`);
      return;
    }
    
    const images = this.findProductImages();
    images.forEach(img => this.addTryOnButton(img));
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
        console.log('🖼️ Generating actual try-on image with Gemini nano banana...');
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
          console.log('✅ Actual try-on image generated with Gemini nano banana');
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

  observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldReInject = false;
      
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          shouldReInject = true;
        }
      });
      
      if (shouldReInject) {
        setTimeout(() => this.injectButtons(), 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  removeExistingModal() {
    const existing = document.querySelector('.tryon-modal');
    if (existing) {
      existing.remove();
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


  // Static method for DOM ready initialization
  static initializeWhenReady(ConnectorClass) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => new ConnectorClass());
    } else {
      new ConnectorClass();
    }
  }
}