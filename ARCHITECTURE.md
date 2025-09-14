# Try-On Extension Architecture

## Overview
The extension has been refactored from a monolithic approach to a modular, extensible architecture that supports multiple e-shop connectors.

## Architecture Components

### 1. Base Classes (`/content-scripts/base/`)

#### `BaseTryOnConnector.js`
- **Purpose**: Core business logic shared across all e-shops
- **Responsibilities**:
  - User setup validation 
  - Cache management
  - API communication (detectClothes, generateTryOn, generateTryOnWithGemini)
  - Page change observation
  - Common utility functions

#### `ModalManager.js`  
- **Purpose**: UI management for modals and galleries
- **Responsibilities**:
  - Loading animations
  - Result display
  - Image gallery functionality
  - Download functionality
  - Error handling UI

### 2. Shop-Specific Connectors (`/content-scripts/`)

#### `zalando.js`
- **Purpose**: Zalando-specific implementation
- **Unique Features**:
  - Zalando DOM selectors for product images
  - Button placement strategy for Zalando's layout
  - Czech language UI text

#### `aboutyou.js`
- **Purpose**: AboutYou-specific implementation  
- **Unique Features**:
  - AboutYou DOM selectors
  - Different button positioning (top-right absolute)
  - English language UI

### 3. Manifest-Based Loading
- **Purpose**: Chrome extension manifest automatically loads appropriate connector based on URL patterns
- **Benefits**: No runtime overhead, guaranteed availability of base classes

## Adding New E-Shop Connector

1. **Create new connector file** (e.g., `asos.js`):
```javascript
class AsosTryOn extends BaseTryOnConnector {
  constructor() {
    const siteConfig = {
      name: 'asos.com',
      selectors: {
        primary: ['img[data-testid="product-image"]'],
        fallback: ['img[src*="asos"][src*="product"]']
      }
    };
    super(siteConfig);
    this.modalManager = new ModalManager();
    this.modalManager.onRegenerateRequest = (imageSrc) => this.handleTryOnClick(imageSrc);
  }
  
  // Implement required abstract methods
  findProductImages() { /* ASOS-specific logic */ }
  addTryOnButton(img) { /* ASOS-specific button placement */ }
  
  // UI delegation to modal manager
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
```

2. **Add to manifest.json**:
```json
{
  "matches": ["*://*.asos.com/*"],
  "js": [
    "content-scripts/base/BaseTryOnConnector.js",
    "content-scripts/base/ModalManager.js", 
    "content-scripts/asos.js"
  ],
  "css": ["styles/content.css"],
  "run_at": "document_end"
}
```

## Benefits of New Architecture

### ✅ **Maintainability**
- Clear separation of concerns
- Shared code elimination
- Easy to debug shop-specific issues

### ✅ **Extensibility** 
- Simple to add new e-shops
- Minimal code duplication
- Consistent behavior across sites

### ✅ **Testability**
- Modular components can be tested independently
- Mock-friendly interfaces

### ✅ **Performance**
- Only loads connector for current site
- Shared functionality cached
- Reduced memory footprint

## File Structure
```
content-scripts/
├── base/
│   ├── BaseTryOnConnector.js     # Core business logic
│   └── ModalManager.js           # UI management
├── zalando.js                    # Zalando connector
└── aboutyou.js                   # AboutYou connector
```

## Migration Notes

### What Changed
- **Before**: Single 1000+ line file with everything mixed
- **After**: Modular architecture with clear responsibilities

### What Stayed the Same
- All existing functionality preserved
- Same API calls and data flow
- Same user experience

### Breaking Changes
- None - fully backward compatible