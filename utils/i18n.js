class I18nManager {
  constructor() {
    this.translations = {};
    this.currentLanguage = 'cs'; // Default to Czech
    this.fallbackLanguage = 'cs';
  }

  // Initialize i18n system
  async init() {
    try {
      // Load saved language preference
      const result = await chrome.storage.local.get(['preferredLanguage']);
      
      // Determine language to use
      this.currentLanguage = this.detectLanguage(result.preferredLanguage);
      
      // Load translations
      await this.loadTranslations(this.currentLanguage);
      
      console.log(`🌐 I18n initialized with language: ${this.currentLanguage}`);
      return this.currentLanguage;
    } catch (error) {
      console.error('❌ I18n initialization failed:', error);
      return this.fallbackLanguage;
    }
  }

  // Detect which language to use
  detectLanguage(savedLanguage) {
    // 1. Use saved preference if available
    if (savedLanguage && this.isLanguageSupported(savedLanguage)) {
      return savedLanguage;
    }

    // 2. Detect from browser language
    const browserLang = navigator.language.split('-')[0];
    if (this.isLanguageSupported(browserLang)) {
      return browserLang;
    }

    // 3. Detect from current domain
    const hostname = window.location?.hostname?.toLowerCase() || '';
    if (hostname.includes('.com') && !hostname.includes('.cz')) {
      return 'en';
    }
    if (hostname.includes('.de')) {
      return 'de';
    }

    // 4. Fallback to Czech
    return this.fallbackLanguage;
  }

  // Check if language is supported
  isLanguageSupported(lang) {
    const supportedLanguages = ['cs', 'en']; // Add more as needed
    return supportedLanguages.includes(lang);
  }

  // Load translation file for a specific language
  async loadTranslations(language) {
    try {
      const url = chrome.runtime.getURL(`locales/${language}.json`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${language}`);
      }
      
      this.translations[language] = await response.json();
      console.log(`✅ Loaded translations for: ${language}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load translations for ${language}:`, error);
      
      // Load fallback if not already loaded
      if (language !== this.fallbackLanguage && !this.translations[this.fallbackLanguage]) {
        try {
          const fallbackUrl = chrome.runtime.getURL(`locales/${this.fallbackLanguage}.json`);
          const fallbackResponse = await fetch(fallbackUrl);
          this.translations[this.fallbackLanguage] = await fallbackResponse.json();
          console.log(`✅ Loaded fallback translations: ${this.fallbackLanguage}`);
        } catch (fallbackError) {
          console.error(`❌ Failed to load fallback translations:`, fallbackError);
        }
      }
    }
  }

  // Get translated text
  t(key, params = {}) {
    try {
      let translation = this.getTranslation(key, this.currentLanguage);
      
      // Fallback to default language if not found
      if (translation === key && this.currentLanguage !== this.fallbackLanguage) {
        translation = this.getTranslation(key, this.fallbackLanguage);
      }
      
      // Replace parameters in translation
      return this.interpolate(translation, params);
    } catch (error) {
      console.warn(`⚠️ Translation failed for key: ${key}`, error);
      return key;
    }
  }

  // Get translation from loaded translations
  getTranslation(key, language) {
    const translations = this.translations[language];
    if (!translations) {
      return key;
    }

    // Support nested keys like "popup.title"
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }
    
    return typeof result === 'string' ? result : key;
  }

  // Replace parameters in translation string
  interpolate(translation, params) {
    let result = translation;
    
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  // Change language
  async setLanguage(language) {
    if (!this.isLanguageSupported(language)) {
      console.warn(`⚠️ Unsupported language: ${language}`);
      return false;
    }

    try {
      // Load translations if not already loaded
      if (!this.translations[language]) {
        await this.loadTranslations(language);
      }

      // Update current language
      this.currentLanguage = language;

      // Save preference
      await chrome.storage.local.set({ preferredLanguage: language });

      console.log(`🌐 Language changed to: ${language}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to change language to ${language}:`, error);
      return false;
    }
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Get available languages
  getAvailableLanguages() {
    return [
      { code: 'cs', name: 'Čeština', nativeName: 'Čeština' },
      { code: 'en', name: 'English', nativeName: 'English' }
    ];
  }

  // Helper method to update DOM elements with translations
  updateElementText(element, translationKey, params = {}) {
    if (element) {
      element.textContent = this.t(translationKey, params);
    }
  }

  updateElementHTML(element, translationKey, params = {}) {
    if (element) {
      element.innerHTML = this.t(translationKey, params);
    }
  }

  updateElementAttribute(element, attribute, translationKey, params = {}) {
    if (element) {
      element.setAttribute(attribute, this.t(translationKey, params));
    }
  }
}

// Create global instance
window.i18n = new I18nManager();

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18nManager;
}