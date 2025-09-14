class ModalManager {
  constructor() {
    this._galleryOpening = false;
    this.i18n = null;
    this.initializeI18n();
  }

  async initializeI18n() {
    if (window.i18n) {
      this.i18n = window.i18n;
      await this.i18n.init();
    } else {
      console.warn('i18n not available in ModalManager');
    }
  }

  // Helper method for translations
  t(key, params = {}) {
    return this.i18n ? this.i18n.t(key, params) : key;
  }

  // Helper method to set dynamic height for images based on their aspect ratio
  setDynamicImageHeight(img, maxWidth) {
    if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
      // If image not loaded yet, wait for it to load
      img.onload = () => this.setDynamicImageHeight(img, maxWidth);
      return;
    }

    // Adjust width based on screen size for responsive design
    let actualWidth = maxWidth;
    if (window.innerWidth <= 768) {
      // Mobile responsive adjustments
      if (maxWidth === 120) actualWidth = 100; // Side images
      if (maxWidth === 180) actualWidth = 140; // Center image
    }

    const aspectRatio = img.naturalHeight / img.naturalWidth;
    const calculatedHeight = actualWidth * aspectRatio;
    img.style.height = `${calculatedHeight}px`;
  }

  async showLoadingModal(imageSrc) {
    this.removeExistingModal();

    const userPhoto = await new Promise(resolve => {
      chrome.storage.local.get(['userPhoto'], result => {
        resolve(result.userPhoto || '');
      });
    });

    const modal = document.createElement('div');
    modal.className = 'tryon-modal';
    modal.innerHTML = `
      <div class="tryon-modal-content">
        <div class="tryon-modal-header">
          <h3>${this.t('tryon.modal.title')}</h3>
          <button class="tryon-close-btn">${this.t('tryon.modal.buttons.close')}</button>
        </div>
        <div class="tryon-modal-body">
          <div class="tryon-loading-container">
            <div class="tryon-images-animation">
              <div class="tryon-image-moving user-image">
                <img src="${userPhoto}" alt="Your photo" />
                <span class="image-label">${this.t('tryon.modal.labels.you')}</span>
              </div>
              <div class="tryon-image-moving product-image">
                <img src="${imageSrc}" alt="Product" />
                <span class="image-label">${this.t('tryon.modal.labels.product')}</span>
              </div>
            </div>
            <div class="tryon-progress">
              <div class="tryon-progress-bar">
                <div class="tryon-progress-fill"></div>
              </div>
              <p class="tryon-progress-text">${this.t('tryon.modal.loading.progress')}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set dynamic heights for images
    const userImg = modal.querySelector('.user-image img');
    const productImg = modal.querySelector('.product-image img');

    if (userImg) {
      this.setDynamicImageHeight(userImg, 120); // 120px width for user image
    }
    if (productImg) {
      this.setDynamicImageHeight(productImg, 120); // 120px width for product image
    }

    this.startLoadingAnimation(modal);

    modal.querySelector('.tryon-close-btn').addEventListener('click', () => {
      this.removeExistingModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.removeExistingModal();
      }
    });
  }

  startLoadingAnimation(modal) {
    const userImage = modal.querySelector('.user-image');
    const productImage = modal.querySelector('.product-image');
    const progressFill = modal.querySelector('.tryon-progress-fill');
    const progressText = modal.querySelector('.tryon-progress-text');

    const texts = this.i18n.translations[this.i18n.currentLanguage]['tryon']?.['modal']?.['loading']?.['texts'];
    let loadingTexts = Array.isArray(texts) ? texts : [
      'Trying on new clothes from the store... 👔',
      'Combining your style with catalog selection... 🛍️',
      'Seeing how these pieces look on you... ✨',
      'Virtually dressing you in new outfit... 👗',
      'Finding the perfect size for you... 📏',
      'Preparing your virtual mirror... 🪞',
      'Fine-tuning details for perfect look... 💅',
      'Creating your personal fashion show... ✨',
      'Almost done, finalizing your new look... 🎯',
      'Last few touches to make it perfect... 🏁',
      'Preparing a surprise for your eyes... 👀'
    ];

    let progress = 0;
    let textIndex = 0;

    const animationInterval = setInterval(() => {
      progress += 0.67;

      progressFill.style.width = `${Math.min(progress, 100)}%`;

      const moveDistance = (Math.min(progress, 100) / 100) * 45;
      userImage.style.transform = `translateX(${moveDistance}%)`;
      productImage.style.transform = `translateX(-${moveDistance}%)`;

      if (Math.floor(progress * 0.075) > textIndex && textIndex < loadingTexts.length - 1) {
        textIndex = Math.floor(progress * 0.075);
        progressText.textContent = loadingTexts[Math.min(textIndex, loadingTexts.length - 1)];
      }

      if (progress >= 100) {
        clearInterval(animationInterval);
        progressText.textContent = this.t('tryon.modal.loading.complete');
      }
    }, 100);

    modal.setAttribute('data-animation-interval', animationInterval);
  }

  showResult(result) {
    console.log('📺 showResult called with:', {
      hasGeneratedImage: !!result.generatedImage,
      generatedImageLength: result.generatedImage ? result.generatedImage.length : 0,
      generatedImagePreview: result.generatedImage ? result.generatedImage.substring(0, 50) + '...' : 'none',
      allKeys: Object.keys(result)
    });

    const modal = document.querySelector('.tryon-modal');
    if (!modal) {
      console.error('❌ Modal not found when trying to show result');
      return;
    }

    if (!result.generatedImage) {
      console.error('❌ No generated image in result. Result object keys:', Object.keys(result));
      console.error('❌ Full result object:', result);
      return;
    }

    const animationInterval = modal.getAttribute('data-animation-interval');
    if (animationInterval) {
      clearInterval(parseInt(animationInterval));
    }

    this.triggerCrashAnimation(modal, result);
  }

  triggerCrashAnimation(modal, result) {
    const loadingContainer = modal.querySelector('.tryon-loading-container');
    if (!loadingContainer) return;

    const userImage = modal.querySelector('.user-image');
    const productImage = modal.querySelector('.product-image');

    if (userImage && productImage) {
      userImage.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      productImage.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      userImage.style.transform = 'translateX(50%) scale(0.8)';
      productImage.style.transform = 'translateX(-50%) scale(0.8)';

      setTimeout(() => {
        this.showFinalResult(modal, result);
      }, 600);
    } else {
      setTimeout(() => {
        this.showFinalResult(modal, result);
      }, 300);
    }
  }

  showFinalResult(modal, result) {
    const body = modal.querySelector('.tryon-modal-body');

    body.innerHTML = `
      <div class="tryon-result-container">
        <div class="tryon-horizontal-layout">
          <div class="tryon-left-image" data-gallery-index="0">
            <img src="${result.userPhoto || ''}" alt="Your original photo" />
            <span class="image-label">${this.t('tryon.modal.labels.yourOriginalPhoto')}</span>
          </div>
          <div class="tryon-center-image" data-gallery-index="1">
            <img src="${result.generatedImage || ''}" alt="Your new look" />
            <span class="image-label">${this.t('tryon.modal.labels.yourNewLook')}</span>
          </div>
          <div class="tryon-right-image" data-gallery-index="2">
            <img src="${result.productImage || ''}" alt="Product" />
            <span class="image-label">${this.t('tryon.modal.labels.product')}</span>
          </div>
        </div>
        <div class="tryon-result-info">
          <button class="tryon-regenerate-btn">${this.t('tryon.modal.buttons.regenerate')}</button>
        </div>
        <div class="tryon-result-footer">
          <div class="result-branding">
            <img src="chrome-extension://${chrome.runtime.id}/octopus_piece_optimized.png" alt="Octopus" class="result-logo">
            <div class="result-branding-text">
                        <p>🧥 <a href="https://kabinka.online" target="_blank">${this.t('branding.website')}</a></p>
                    <p>${this.t('branding.createdBy')} <a href="https://filipobornik.cz" target="_blank">${this.t('branding.author')}</a> z <a href="https://aisrozumem.cz" target="_blank">${this.t('branding.company')}</a></p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Set dynamic heights for result images
    const leftImg = body.querySelector('.tryon-left-image img');
    const centerImg = body.querySelector('.tryon-center-image img');
    const rightImg = body.querySelector('.tryon-right-image img');

    if (leftImg) {
      this.setDynamicImageHeight(leftImg, 120); // 120px width for side images
    }
    if (centerImg) {
      this.setDynamicImageHeight(centerImg, 180); // 180px width for center image
    }
    if (rightImg) {
      this.setDynamicImageHeight(rightImg, 120); // 120px width for side images
    }

    const resultContainer = body.querySelector('.tryon-result-container');
    resultContainer.style.opacity = '0';
    resultContainer.style.transform = 'scale(0.95)';

    setTimeout(() => {
      resultContainer.style.transition = 'all 0.5s ease';
      resultContainer.style.opacity = '1';
      resultContainer.style.transform = 'scale(1)';
    }, 100);

    this.addGalleryHandlers(modal, result);

    const regenerateBtn = modal.querySelector('.tryon-regenerate-btn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', async () => {
        if (result.cacheKey) {
          await this.clearCache(result.cacheKey);
        }
        this.removeExistingModal();
        // Note: This would need to be handled by the connector
        if (this.onRegenerateRequest) {
          this.onRegenerateRequest(result.originalImage || result.productImage);
        }
      });
    }
  }

  showError(message) {
    const modal = document.querySelector('.tryon-modal');
    if (!modal) return;

    const body = modal.querySelector('.tryon-modal-body');
    body.innerHTML = `
      <div class="tryon-error">
        <p class="error-message">${message}</p>
        <button class="tryon-retry-btn">${this.t('tryon.modal.buttons.retry')}</button>
      </div>
    `;

    modal.querySelector('.tryon-retry-btn').addEventListener('click', () => {
      this.removeExistingModal();
    });
  }

  removeExistingModal() {
    const existing = document.querySelector('.tryon-modal');
    if (existing) {
      existing.remove();
    }
  }

  addGalleryHandlers(modal, result) {
    const galleryImages = [
      { src: result.userPhoto || '', alt: this.t('tryon.gallery.labels.yourOriginalPhoto'), label: this.t('tryon.modal.labels.yourOriginalPhoto') },
      { src: result.generatedImage || '', alt: this.t('tryon.gallery.labels.yourNewLook'), label: this.t('tryon.modal.labels.yourNewLook') },
      { src: result.productImage || '', alt: this.t('tryon.gallery.labels.originalProduct'), label: this.t('tryon.modal.labels.product') }
    ];

    console.log('🖼️ Setting up gallery handlers for images:', galleryImages.map(img => img.label));

    const imageContainers = modal.querySelectorAll('[data-gallery-index]');
    console.log('📱 Found image containers:', imageContainers.length);

    imageContainers.forEach((container, idx) => {
      if (container.hasAttribute('data-gallery-handled')) {
        console.log(`⚠️ Container ${idx} already has gallery handler, skipping`);
        return;
      }

      container.setAttribute('data-gallery-handled', 'true');
      container.style.cursor = 'pointer';
      container.style.userSelect = 'none';

      container.addEventListener('mouseenter', () => {
        container.style.transform = 'scale(1.02)';
        container.style.transition = 'transform 0.2s ease';
      });

      container.addEventListener('mouseleave', () => {
        container.style.transform = 'scale(1)';
      });

      container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(container.getAttribute('data-gallery-index'));
        console.log(`🎯 Gallery clicked - container ${idx}, index ${index}`);

        if (this._galleryOpening) {
          console.log('⚠️ Gallery already opening, ignoring click');
          return;
        }

        this._galleryOpening = true;
        setTimeout(() => {
          this._galleryOpening = false;
        }, 1000);

        this.openGallery(galleryImages, index);
      });
    });
  }

  openGallery(images, startIndex = 0) {
    console.log(`🚀 Opening gallery with ${images.length} images, starting at index ${startIndex}`);

    this.closeGallery();

    let currentIndex = startIndex;

    const galleryOverlay = document.createElement('div');
    galleryOverlay.className = 'tryon-gallery-overlay';
    galleryOverlay.innerHTML = `
      <div class="tryon-gallery-container">
        <button class="tryon-gallery-close">&times;</button>
        <button class="tryon-gallery-prev">‹</button>
        <div class="tryon-gallery-content">
          <img src="${images[currentIndex].src}" alt="${images[currentIndex].alt}" class="tryon-gallery-image" />
          <div class="tryon-gallery-info">
            <h3>${images[currentIndex].label}</h3>
            <p class="tryon-gallery-counter">${this.t('tryon.gallery.counter', { current: currentIndex + 1, total: images.length })}</p>
          </div>
          <div class="tryon-gallery-actions">
            <button class="tryon-gallery-download">${this.t('tryon.gallery.download', { label: images[currentIndex].label })}</button>
          </div>
        </div>
        <button class="tryon-gallery-next">›</button>
      </div>
    `;

    document.body.appendChild(galleryOverlay);
    console.log('✅ Gallery overlay added to DOM');

    const updateGallery = () => {
      const img = galleryOverlay.querySelector('.tryon-gallery-image');
      const label = galleryOverlay.querySelector('.tryon-gallery-info h3');
      const counter = galleryOverlay.querySelector('.tryon-gallery-counter');
      const downloadBtn = galleryOverlay.querySelector('.tryon-gallery-download');

      if (img && label && counter) {
        img.src = images[currentIndex].src;
        img.alt = images[currentIndex].alt;
        label.textContent = images[currentIndex].label;
        counter.textContent = this.t('tryon.gallery.counter', { current: currentIndex + 1, total: images.length });
        console.log(`📷 Gallery updated to show: ${images[currentIndex].label}`);

        if (downloadBtn) {
          const imageLabel = images[currentIndex].label;
          downloadBtn.textContent = this.t('tryon.gallery.download', { label: imageLabel });
        }
      }
    };

    const goToPrev = () => {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      updateGallery();
    };

    const goToNext = () => {
      currentIndex = (currentIndex + 1) % images.length;
      updateGallery();
    };

    const prevBtn = galleryOverlay.querySelector('.tryon-gallery-prev');
    const nextBtn = galleryOverlay.querySelector('.tryon-gallery-next');
    const closeBtn = galleryOverlay.querySelector('.tryon-gallery-close');
    const downloadBtn = galleryOverlay.querySelector('.tryon-gallery-download');
    const galleryImage = galleryOverlay.querySelector('.tryon-gallery-image');

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToPrev();
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToNext();
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeGallery();
    });

    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadImage(images[currentIndex]);
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    galleryImage.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    galleryImage.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          goToPrev();
        } else {
          goToNext();
        }
      }
    }, { passive: true });

    galleryOverlay.addEventListener('click', (e) => {
      if (e.target === galleryOverlay) {
        this.closeGallery();
      }
    });

    const handleKeyboard = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          this.closeGallery();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    galleryOverlay.setAttribute('data-keyboard-handler', 'true');

    galleryOverlay._keyboardHandler = handleKeyboard;

    galleryOverlay.style.cssText = `
      display: flex !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 999999 !important;
      background: rgba(0, 0, 0, 0.95) !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    `;

    console.log('🚀 Gallery cssText applied directly');

    const tryonButtons = document.querySelectorAll('.tryon-button');
    tryonButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    galleryOverlay._hiddenButtons = tryonButtons;

    console.log('🚀 Hid', tryonButtons.length, '"Vyzkoušet" buttons');

    setTimeout(() => {
      const computedStyle = window.getComputedStyle(galleryOverlay);
      console.log('🔍 Gallery final state check:', {
        display: computedStyle.display,
        opacity: computedStyle.opacity,
        visibility: computedStyle.visibility,
        zIndex: computedStyle.zIndex,
        isVisible: galleryOverlay.offsetWidth > 0 && galleryOverlay.offsetHeight > 0
      });

      if (computedStyle.opacity === '0' || computedStyle.display === 'none') {
        console.log('⚠️ Gallery still not visible, trying alternative method');
        galleryOverlay.setAttribute('style', `
          display: block !important;
          position: fixed !important;
          top: 0px !important;
          left: 0px !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 2147483647 !important;
          background: rgba(0, 0, 0, 0.95) !important;
          opacity: 1 !important;
          visibility: visible !important;
        `);
      }
    }, 100);
  }

  closeGallery() {
    const existingGallery = document.querySelector('.tryon-gallery-overlay');
    if (existingGallery) {
      console.log('🚪 Closing gallery');

      if (existingGallery._hiddenButtons) {
        existingGallery._hiddenButtons.forEach(btn => {
          btn.style.display = '';
        });
        console.log('🔄 Restored', existingGallery._hiddenButtons.length, '"Vyzkoušet" buttons');
      }

      if (existingGallery._keyboardHandler) {
        document.removeEventListener('keydown', existingGallery._keyboardHandler);
      }

      existingGallery.style.opacity = '0';
      setTimeout(() => {
        if (existingGallery.parentNode) {
          existingGallery.remove();
          console.log('✅ Gallery closed and removed from DOM');
        }
      }, 300);
    }
  }

  downloadImage(imageData) {
    console.log('📥 Downloading image:', imageData.label);

    try {
      const link = document.createElement('a');

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `tryon-${imageData.label.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`;

      link.href = imageData.src;
      link.download = filename;
      link.target = '_blank';

      if (imageData.src.startsWith('data:')) {
        fetch(imageData.src)
          .then(response => response.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            link.href = blobUrl;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

            console.log('✅ Image download triggered:', filename);
          })
          .catch(error => {
            console.error('❌ Download failed:', error);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('✅ Image download triggered:', filename);
      }

    } catch (error) {
      console.error('❌ Download error:', error);
      window.open(imageData.src, '_blank');
    }
  }
}