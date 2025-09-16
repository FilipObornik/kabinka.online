# 👗 Clothes Try-On Chrome Extension

Virtual clothes try-on using Google Gemini AI for e-commerce sites.

Learn more on [kabinka.online](https://kabinka.online)

> The entire app was **vibe coded** with Claude Code. If the concept makes users interested, the code will be refactored to support further development

## 🎯 Supported e-shops
- [Zalando](https://zalando.com) - all countries
- [AboutYou](https://aboutyou.com) - all countries

## ✨ Features
- **Virtual Try-On**: AI-powered clothes fitting using Gemini 2.5 Flash (Nano Banana)
- **Easy Setup**: Simple API key and photo upload process
- **Multi-Site Ready**: Modular architecture for easy expansion
- **Privacy First**: All data stored locally in browser

## 🚀 Installation
### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a free account if needed (or paid for grader usage)
3. Generate a new API key
4. Add the key to the plugin

### 2. Install Extension
1.  Official Chrome store [**Easiest**]
    1.  TODO link
2. As 3rd party plguin
   1. TODO link
3.  With source code [**Best for modifications**]
    1. Download/clone this repository
    2. Open Chrome and go to `chrome://extensions/`
    3. Enable "Developer mode" (top right toggle)
    4. Click "Load unpacked" and select the extension folder
    5. The extension icon will appear in your toolbar

### 3. Setup Extension
1. Click the extension icon in Chrome toolbar
2. Enter your Gemini API key
3. Upload a clear photo of yourself (stored locally only)
4. Click "Save Settings"

## 📖 How to Use

1. **Visit any of supported eshops**: Go to any product page
2. **Find button in left corner of image**: Look for orange blue buttons over product images with text ("Try on" / "Vyzkoušet")
3. **Click the button**: Button starts AI processing
4. **Wait for Result**
5. **View Result**: Generated image appears with cost information
6. **Download the result image**
7. **Regenerate**: Option to create new result if needed


## 🔧 Technical Implementation

### Architecture
```
├── manifest.json              # Extension configuration & site matching
├── content-scripts/
│   ├── base/
│   │   ├── BaseTryOnConnector.js  # Core business logic & API integration
│   │   └── ModalManager.js        # UI management & result display
│   ├── zalando.js            # Zalando-specific connector
│   └── aboutyou.js           # AboutYou-specific connector
├── background/
│   └── service-worker.js     # Gemini API communication
├── popup/
│   ├── popup.html           # Settings interface
│   ├── popup.css            # UI styling
│   └── popup.js             # Setup logic
├── styles/
│   └── content.css          # Button and modal styling
├── utils/
│   └── cache-manager.js     # Cache management utilities
└── prompts/
    ├── clothes_detection_prompt.txt
    ├── tryon_prompt.txt
    └── user_clothes_detection_prompt.txt
```

### Modular Architecture
The extension uses a **modular, extensible architecture** that separates concerns:

- **BaseTryOnConnector**: Shared business logic, API calls, and common functionality
- **ModalManager**: UI management, result display, and user interactions
- **Site Connectors**: E-shop specific implementations (Zalando, AboutYou)
- **Manifest-based Loading**: Automatic connector selection based on URL patterns

### Three-Step AI Process
1. **Clothes Detection**: Product image → Gemini → Clothes type & color
2. **User Clothes Detection**: User photo → Gemini → Body analysis
3. **Virtual Try-On**: User photo + Product image + Detected info → Gemini → Result

### Key Features
- **Modular Design**: Easy to add new e-shop connectors
- **Smart Image Detection**: Multiple selector strategies with fallbacks
- **Advanced Caching**: Results cached by image + user photo hash with automatic cleanup
- **Error Handling**: User-friendly error messages with retry options
- **Responsive Design**: Works on desktop and mobile
- **Privacy-First**: No data sent to external servers (except Gemini API)

## 🔐 Privacy & Security

- **Local Storage Only**: Your photo and settings never leave your browser
- **API Key Security**: Stored locally, not transmitted anywhere except Google
- **No Tracking**: Extension doesn't collect any usage data
- **Transparent**: All API calls visible in network tab

## 💰 Costs

- **Gemini API**: ~$0.002 per try-on request
- **Free Tier**: Google provides generous free quotas
- **Cost Tracking**: Extension shows running total of API costs

## 🛠️ Development

### Adding New Sites
1. Create new content script in `content-scripts/`
2. Add site-specific selectors configuration
3. Update manifest.json with new match patterns
4. Test fallback detection strategies

### Extending Features
- **More AI Models**: Easy to swap Gemini for other vision models
- **Better Prompts**: Customize prompts for different clothing types
- **Batch Processing**: Try multiple items at once
- **Social Features**: Share results (with user permission)

## 🐛 Troubleshooting

### Common Issues
1. **No buttons appearing**: Check if site CSS selectors changed
2. **API errors**: Verify API key is valid and has quota
3. **Poor results**: Try better lighting in user photo
4. **Slow performance**: Clear cache or check internet connection

### Debug Mode
1. Open Developer Tools (F12)
2. Check console for error messages
3. Network tab shows API requests
4. Storage tab shows cached data

## 📝 To-Do / Future Features

- [ ] Clean up the architecture - the plugin was mainly vibe-coded
- [ ] Support for more e-commerce sites (H&M, ASOS, etc.)
- [ ] Multiple user photos for different poses
- [ ] Size/fit recommendations based on body measurements
- [ ] Batch processing for multiple items
- [ ] History of processed items
- [ ] Possibility to chose AI model

## 📄 License

MIT License - feel free to modify and distribute

## 🤝 Contributing
Any contribution will be more than welcomed
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support
For issues, questions or collaboration:
1. Check existing GitHub issues
2. Create new issue with detailed description
3. Include browser version, error messages, and steps to reproduce

## 💼 Collaboration
If you are business or individual interested in collaboration (adding support for your e-shop) or interested in implementing this technology to your e-shop, you can reach out to me on info@filipobornik.cz or [LinkedIn](https://www.linkedin.com/in/obornik/)

---

**Note**: This extension requires a Google Gemini API key. The extension is for educational/demonstration purposes. Results may vary based on image quality and AI model capabilities.