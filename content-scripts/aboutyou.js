// BaseTryOnConnector and ModalManager are loaded by manifest
class AboutYouTryOn extends BaseTryOnConnector {
  constructor() {
    const siteConfig = {
      name: 'aboutyou',
      selectors: {
        primary: [
          'img[src*="aboutstatic.com"]:not([data-testid*="Flag"]):not([alt*="vlajka"]):not([alt*="flag"])',
          'img[srcset*="aboutstatic.com"]:not([data-testid*="Flag"]):not([alt*="vlajka"]):not([alt*="flag"])'
        ],
        fallback: [
          'img[alt*="product"]',
          'img[alt*="clothing"]',
          'img[data-testid*="image"]:not([data-testid*="Flag"])'
        ]
      }
    };
    
    super(siteConfig);
  }
  

  positionButton(container, wrapper, button, img) {
    // Skip small images (likely icons, flags, etc.)
    if (img.offsetWidth < 50 || img.offsetHeight < 50) {
      console.log('Skipping small image:', img.offsetWidth, 'x', img.offsetHeight);
      return false;
    }
    
    // Skip flag images and other UI elements
    if (img.alt && (img.alt.includes('vlajka') || img.alt.includes('flag'))) {
      console.log('Skipping flag image');
      return false;
    }
    
    // Validate DOM structure before manipulation
    if (!container.contains(img)) {
      console.log('Container does not contain image, skipping');
      return false;
    }
    
    try {
      // Don't wrap the image - just add button to container directly
      // This avoids triggering AboutYou's padding logic
      
      // Make container relative for button positioning
      const originalPosition = container.style.position;
      if (!originalPosition || originalPosition === 'static') {
        container.style.position = 'relative';
      }
      
      // Add button directly to container
      container.appendChild(button);
      
      console.log('AboutYou button positioned successfully');
      return true;
    } catch (error) {
      console.error('Error positioning button:', error);
      return false;
    }
  }
  
}

// Initialize when DOM is ready
BaseTryOnConnector.initializeWhenReady(AboutYouTryOn);