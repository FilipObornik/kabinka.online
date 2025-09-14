// BaseTryOnConnector and ModalManager are loaded by manifest
class ZalandoTryOn extends BaseTryOnConnector {
  constructor() {
    const siteConfig = {
      name: 'zalando',
      selectors: {
        primary: [
          'img[data-testid*="product_gallery-media-slider-image-"]',
          'img[data-testid*="product_gallery-thumbnail-carousel-image-"]',
          'img[data-testid*="product_gallery-hover-zoom-image-"]',
          '#tab-panel-0'
        ],
        fallback: [
          'img[src*="ztat.net"][src*="article"]'
        ]
      }
    };
    
    super(siteConfig);
  }
  
  positionButton(container, wrapper, button, img) {
    // Zalando-specific positioning: relative wrapper containing image and button
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    
    // Insert wrapper and move image into it
    container.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    wrapper.appendChild(button);
  }
  
}

// Initialize when DOM is ready
BaseTryOnConnector.initializeWhenReady(ZalandoTryOn);