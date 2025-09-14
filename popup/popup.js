class ExtensionSetup {
  constructor() {
    this.apiKey = '';
    this.userPhoto = '';
    this.isSetup = false;
    this.currentLanguage = 'cs';
    
    this.init();
  }
  
  async init() {
    await this.initializeI18n();
    await this.loadCurrentSettings();
    this.bindEvents();
    this.updateUI();
  }
  
  async initializeI18n() {
    this.currentLanguage = await window.i18n.init();
    this.updateLanguageSelector();
    this.updateAllTexts();
  }

  async loadCurrentSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(['geminiApiKey', 'userPhoto', 'totalTryons'], result => {
        this.apiKey = result.geminiApiKey || '';
        this.userPhoto = result.userPhoto || '';
        this.totalTryons = result.totalTryons || 0;
        this.isSetup = !!(this.apiKey && this.userPhoto);
        resolve();
      });
    });
  }
  
  bindEvents() {
    // Language selector
    const languageSelect = document.getElementById('language-select');
    languageSelect.addEventListener('change', async (e) => {
      await this.changeLanguage(e.target.value);
    });

    // API Key input
    const apiKeyInput = document.getElementById('api-key');
    apiKeyInput.addEventListener('input', (e) => {
      this.apiKey = e.target.value.trim();
      this.updateSaveButton();
      this.updateApiStatus();
    });
    
    // Photo upload
    const photoUpload = document.getElementById('user-photo');
    const uploadArea = document.getElementById('photo-upload');
    
    uploadArea.addEventListener('click', () => photoUpload.click());
    
    photoUpload.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handlePhotoUpload(e.target.files[0]);
      }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files[0] && files[0].type.startsWith('image/')) {
        this.handlePhotoUpload(files[0]);
      }
    });
    
    // Save settings
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Other buttons
    document.getElementById('test-extension').addEventListener('click', () => {
      // Open both supported sites
      chrome.tabs.create({ url: 'https://www.zalando.cz/' });
      chrome.tabs.create({ url: 'https://www.aboutyou.cz/' });
    });
    
    document.getElementById('edit-settings').addEventListener('click', () => {
      this.showSetupSection();
    });
    
    document.getElementById('clear-cache').addEventListener('click', () => {
      this.clearCache();
    });
    
    document.getElementById('help-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
    
    document.getElementById('video-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.showVideoTutorial();
    });
    
    document.getElementById('privacy-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.showPrivacyInfo();
    });
  }
  
  async handlePhotoUpload(file) {
    if (!file.type.startsWith('image/')) {
      this.showError(window.i18n.t('messages.errors.invalidFile'));
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      this.showError(window.i18n.t('messages.errors.fileTooLarge'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.userPhoto = e.target.result;
      this.showPhotoPreview(this.userPhoto);
      this.updateSaveButton();
      this.updatePhotoStatus();
    };
    reader.readAsDataURL(file);
  }
  
  showPhotoPreview(photoData) {
    const placeholder = document.querySelector('.upload-placeholder');
    const preview = document.getElementById('photo-preview');
    
    placeholder.style.display = 'none';
    preview.style.display = 'block';
    preview.src = photoData;
  }
  
  hidePhotoPreview() {
    const placeholder = document.querySelector('.upload-placeholder');
    const preview = document.getElementById('photo-preview');
    
    placeholder.style.display = 'block';
    preview.style.display = 'none';
  }
  
  updateApiStatus() {
    const statusDot = document.querySelector('#api-status .status-dot');
    const statusText = document.querySelector('#api-status .status-text');
    
    if (this.apiKey) {
      statusDot.className = 'status-dot success';
      statusText.textContent = window.i18n.t('popup.setup.apiKey.statusSet');
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = window.i18n.t('popup.setup.apiKey.statusNotSet');
    }
  }
  
  updatePhotoStatus() {
    const statusDot = document.querySelector('#photo-status .status-dot');
    const statusText = document.querySelector('#photo-status .status-text');
    
    if (this.userPhoto) {
      statusDot.className = 'status-dot success';
      statusText.textContent = window.i18n.t('popup.setup.photo.statusSet');
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = window.i18n.t('popup.setup.photo.statusNotSet');
    }
  }
  
  updateSaveButton() {
    const saveBtn = document.getElementById('save-settings');
    const isValid = this.apiKey && this.userPhoto;
    
    saveBtn.disabled = !isValid;
  }
  
  async saveSettings() {
    try {
      await new Promise(resolve => {
        chrome.storage.local.set({
          geminiApiKey: this.apiKey,
          userPhoto: this.userPhoto
        }, resolve);
      });
      
      this.isSetup = true;
      this.updateUI();
      this.showSuccess(window.i18n.t('messages.success.settingsSaved'));
      
    } catch (error) {
      this.showError(window.i18n.t('messages.errors.saveFailed', { error: error.message }));
    }
  }
  
  updateUI() {
    const setupSection = document.getElementById('setup-section');
    const readySection = document.getElementById('ready-section');
    const usageStats = document.getElementById('usage-stats');
    
    if (this.isSetup) {
      setupSection.style.display = 'none';
      readySection.style.display = 'block';
      usageStats.style.display = 'block';
      
      // Update stats
      document.getElementById('total-tryons').textContent = this.totalTryons;
      
    } else {
      setupSection.style.display = 'block';
      readySection.style.display = 'none';
      usageStats.style.display = 'none';
      
      // Populate existing values
      document.getElementById('api-key').value = this.apiKey;
      if (this.userPhoto) {
        this.showPhotoPreview(this.userPhoto);
      }
      
      this.updateApiStatus();
      this.updatePhotoStatus();
      this.updateSaveButton();
    }
  }
  
  showSetupSection() {
    this.isSetup = false;
    this.updateUI();
  }
  
  async clearCache() {
    try {
      // Get all cache keys
      const storage = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });
      
      const cacheKeys = Object.keys(storage).filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length === 0) {
        this.showSuccess(window.i18n.t('messages.success.cacheEmpty'));
        return;
      }
      
      // Remove cache keys
      await new Promise(resolve => {
        chrome.storage.local.remove(cacheKeys, resolve);
      });
      
      this.showSuccess(window.i18n.t('messages.success.cacheCleared', { count: cacheKeys.length }));
      
    } catch (error) {
      this.showError(window.i18n.t('messages.errors.clearCacheFailed', { error: error.message }));
    }
  }
  
  showSuccess(message) {
    this.showNotification(message, 'success');
  }
  
  showError(message) {
    this.showNotification(message, 'error');
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#EE8E28'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
  showHelp() {
    const helpTitle = window.i18n.t('messages.help.title');
    const helpContent = window.i18n.t('messages.help.content');
    alert(helpTitle + helpContent);
  }
  
  showPrivacyInfo() {
    const privacyTitle = window.i18n.t('messages.privacy.title');
    const privacyContent = window.i18n.t('messages.privacy.content');
    alert(privacyTitle + privacyContent);
  }
  
  showVideoTutorial() {
    // Open video tutorial in a new tab
    // You can replace this URL with the actual video tutorial link
    chrome.tabs.create({ 
      url: 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID' // Replace with actual video URL
    });
  }

  // Language management methods
  updateLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.value = this.currentLanguage;
    }
  }

  async changeLanguage(language) {
    const success = await window.i18n.setLanguage(language);
    if (success) {
      this.currentLanguage = language;
      this.updateAllTexts();
      document.documentElement.lang = language;
    }
  }

  updateAllTexts() {
    // Update elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      window.i18n.updateElementText(element, key);
    });

    // Update elements with data-i18n-html attributes
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      window.i18n.updateElementHTML(element, key);
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      window.i18n.updateElementAttribute(element, 'placeholder', key);
    });

    // Update title
    const title = document.querySelector('title[data-i18n]');
    if (title) {
      const key = title.getAttribute('data-i18n');
      document.title = window.i18n.t(key);
    }

    // Update status indicators if they are visible
    this.updateApiStatus();
    this.updatePhotoStatus();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ExtensionSetup();
});