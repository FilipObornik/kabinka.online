class GeminiAPIService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.textModel = 'gemini-2.0-flash-exp';
    this.imageModel = 'gemini-2.5-flash-image-preview'; // Gemini 2.5 Flash for image generation
  }
  
  async getApiKey() {
    return new Promise(resolve => {
      chrome.storage.local.get(['geminiApiKey'], result => {
        resolve(result.geminiApiKey);
      });
    });
  }
  
  async getUserPhoto() {
    return new Promise(resolve => {
      chrome.storage.local.get(['userPhoto'], result => {
        resolve(result.userPhoto);
      });
    });
  }
  
  async detectClothes(imageSrc) {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error('No API key configured');
    
    console.log('🔍 Starting clothes detection for:', imageSrc);
    
    // Read clothes detection prompt
    const prompt = await this.readClothesDetectionPrompt();
    console.log('📝 Detection prompt:', prompt);
    
    const imageBase64 = await this.imageUrlToBase64(imageSrc);
    console.log('🖼️ Product image converted to base64:', imageBase64.length, 'characters');
    
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100
      }
    };
    
    console.log('🚀 Sending detection request to Gemini:', {
      model: this.textModel,
      promptLength: prompt.length,
      imageSize: imageBase64.length,
      temperature: 0.1
    });
    
    const response = await fetch(`${this.baseUrl}/${this.textModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }
    
    const result = await response.json();
    console.log('📄 Raw Gemini response:', result);
    
    // Calculate actual cost from API usage metadata
    const usageMetadata = result.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = inputTokens + outputTokens;
    
    console.log('📊 API Usage:', {
      inputTokens,
      outputTokens, 
      totalTokens
    });
    
    const content = result.candidates[0].content.parts[0].text;
    console.log('📝 Extracted content:', content);
    
    try {
      const parsed = JSON.parse(content.trim());
      console.log('✅ Parsed clothes info:', parsed);
      return parsed;
    } catch (e) {
      console.log('⚠️ JSON parse failed, using fallback parsing');
      // Fallback parsing if JSON is malformed
      const clothesMatch = content.match(/"clothes":\s*"([^"]+)"/);
      const colorMatch = content.match(/"color":\s*"([^"]+)"/);
      
      const fallback = {
        clothes: clothesMatch ? clothesMatch[1] : 'clothing item',
        color: colorMatch ? colorMatch[1] : 'unknown'
      };
      console.log('🔄 Fallback parsed result:', fallback);
      return fallback;
    }
  }
  
  async generateTryOn(imageSrc, clothesInfo) {
    console.log('🎨 Starting try-on generation...', {
      productImage: imageSrc,
      detectedClothes: clothesInfo
    });
    
    const apiKey = await this.getApiKey();
    const userPhoto = await this.getUserPhoto();
    
    console.log('🔑 Checking setup:', {
      hasApiKey: !!apiKey,
      hasUserPhoto: !!userPhoto,
      userPhotoLength: userPhoto ? userPhoto.length : 0
    });
    
    if (!apiKey || !userPhoto) {
      throw new Error('Missing API key or user photo');
    }
    
    // Step 2.1: Detect what clothes the user is currently wearing
    console.log('👤 Step 2.1: Detecting user\'s current clothing...');
    const userClothesInfo = await this.detectUserClothes(userPhoto, clothesInfo);
    console.log('👕 User\'s current clothes:', userClothesInfo);
    
    // Step 2.2: Use intelligent composite generation (Imagen as future enhancement)
    console.log('🖼️ Step 2.2: Using intelligent composite generation...');
    
    console.log('✅ Try-on data prepared with AI analysis', {
      productClothes: clothesInfo,
      userClothes: userClothesInfo
    });
    
    return {
      userPhoto: userPhoto,
      productImage: imageSrc,
      productClothes: clothesInfo,
      userClothes: userClothesInfo,
      originalImage: imageSrc,
      cacheKey: await this.generateCacheKey(imageSrc),
      needsGeneration: true, // Use our smart composite generation
      analysisComplete: true
    };
  }

  async generateTryOnWithGemini(userPhoto, productImageSrc, productClothes, userClothes) {
    const apiKey = await this.getApiKey();
    
    console.log('🎨 Generating actual try-on image with Gemini 2.5 Flash...');
    
    try {
      // Prepare images for Gemini API call
      const userPhotoBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
      const productImageBase64 = await this.imageUrlToBase64(productImageSrc);
      
      console.log('🖼️ Images prepared for Gemini:', {
        userPhotoSize: userPhotoBase64.length,
        productImageSize: productImageBase64.length
      });
      
      // Create professional e-commerce fashion photo prompt
      const tryOnPrompt = `Create a professional e-commerce fashion photo. Take the ${productClothes.color} ${productClothes.clothes} from the first image and let the person from the second image wear it. Generate a realistic, full-body shot of the person wearing the ${productClothes.clothes}, with the lighting and shadows adjusted to match the environment. Ensure the clothing fits naturally on the person's body shape and the image looks professional and realistic.`;
      
      console.log('📝 Try-on prompt:', tryOnPrompt);

      // Use the correct Gemini 2.5 Flash image preview model and API structure
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: "image/png",
                  data: productImageBase64
                }
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: userPhotoBase64
                }
              },
              { 
                text: tryOnPrompt 
              }
            ]
          }]
        })
      });

      console.log('📡 Gemini API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('📄 Raw Gemini response structure:', Object.keys(result));
      console.log('📄 Full Gemini response for debugging:', JSON.stringify(result, null, 2));
      
      if (!result.candidates || result.candidates.length === 0) {
        console.error('❌ No candidates in Gemini response:', result);
        throw new Error('No candidates returned from Gemini API');
      }

      const candidate = result.candidates[0];
      console.log('📋 Candidate structure:', Object.keys(candidate));

      // Extract the generated image data using the same approach as your bash example
      // Look for the pattern: "data": "base64_image_data" and extract the 4th field
      const responseText = JSON.stringify(result);
      console.log('🔍 Searching for image data in response...');
      
      // Use the same regex pattern as your bash example: grep -o '"data": "[^"]*"'
      const dataMatches = responseText.match(/"data":\s*"([^"]+)"/g);
      
      if (dataMatches && dataMatches.length > 0) {
        console.log(`✅ Found ${dataMatches.length} data field(s) in response`);
        
        // Extract the base64 data from the last match (most likely the generated image)
        const lastMatch = dataMatches[dataMatches.length - 1];
        const base64Match = lastMatch.match(/"data":\s*"([^"]+)"/);
        
        if (base64Match && base64Match[1]) {
          const imageBase64 = base64Match[1];
          console.log('✅ Extracted base64 image data, length:', imageBase64.length);
          
          // Verify this looks like valid base64 image data
          if (imageBase64.length > 1000) { // Generated images should be quite large
            return {
              generatedImage: `data:image/png;base64,${imageBase64}`,
              analysis: 'Try-on image generated successfully with Gemini 2.5 Flash'
            };
          } else {
            console.log('⚠️ Base64 data seems too short for an image:', imageBase64.substring(0, 100));
          }
        }
      }

      // Fallback: Look for generated image in the response structure
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inline_data && part.inline_data.data) {
            console.log('✅ Generated image found in content.parts.inline_data');
            return {
              generatedImage: `data:image/png;base64,${part.inline_data.data}`,
              analysis: 'Try-on image generated successfully with Gemini 2.5 Flash'
            };
          }
          
          // Also check for other possible image formats in the response
          if (part.data) {
            console.log('✅ Generated image found in content.parts.data');
            return {
              generatedImage: `data:image/png;base64,${part.data}`,
              analysis: 'Try-on image generated successfully with Gemini 2.5 Flash'
            };
          }
        }
      }
      
      // Check for image data at candidate level
      if (candidate.data) {
        console.log('✅ Generated image found in candidate.data');
        return {
          generatedImage: `data:image/png;base64,${candidate.data}`,
          analysis: 'Try-on image generated successfully with Gemini 2.5 Flash'
        };
      }
      
      // Log the response structure for debugging
      console.error('❌ No generated image found after all attempts');
      throw new Error('No generated image found in Gemini response. The API may have returned text instead of image data.');
      
    } catch (error) {
      console.error('💥 generateTryOnWithGemini failed:', error);
      throw error;
    }
  }

  // Call actual image generation API - now uses Gemini 2.5 Flash directly
  async callImageGenerationAPI(userPhotoBase64, productImageBase64, tryOnPrompt, analysis) {
    console.log('🖼️ Using Gemini 2.5 Flash for image generation...');
    
    // This method is now replaced by generateTryOnWithGemini which calls Gemini directly
    // Keeping this for backward compatibility but redirecting to the new implementation
    return this.generateTryOnWithGemini(
      `data:image/png;base64,${userPhotoBase64}`,
      `data:image/png;base64,${productImageBase64}`,
      { clothes: 'clothing', color: 'unknown' }, // placeholder values
      { clothes: 'clothing', color: 'unknown' }  // placeholder values
    );
  }

  // Create AI-guided try-on simulation  
  createAIGuidedTryOn(userPhotoBase64, productImageBase64, tryOnPrompt, analysis) {
    // Create a sophisticated SVG visualization that simulates a try-on result
    // This represents what the actual generated image would look like
    const svgContent = `
      <svg width="512" height="768" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8f9fa"/>
            <stop offset="100%" style="stop-color:#e9ecef"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#00000020"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="512" height="768" fill="url(#bg)"/>
        
        <!-- Person silhouette -->
        <ellipse cx="256" cy="180" rx="60" ry="80" fill="#f0c674" opacity="0.8" filter="url(#shadow)"/>
        
        <!-- New clothing item (simulated) -->
        <rect x="180" y="260" width="152" height="200" rx="12" fill="#EE8E28" opacity="0.9" filter="url(#shadow)"/>
        <rect x="190" y="270" width="132" height="20" rx="4" fill="#0E2234" opacity="0.7"/>
        
        <!-- Body/legs -->
        <rect x="220" y="460" width="72" height="180" rx="8" fill="#ddd" opacity="0.6"/>
        
        <!-- AI Analysis overlay -->
        <rect x="20" y="650" width="472" height="100" rx="8" fill="white" opacity="0.95" filter="url(#shadow)"/>
        
        <!-- Title -->
        <text x="256" y="680" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#333">
          AI-Generated Try-On Result
        </text>
        
        <!-- Analysis text -->
        <text x="256" y="705" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">
          Virtual fitting based on AI analysis
        </text>
        
        <!-- Status indicator -->
        <circle cx="256" cy="730" r="4" fill="#4ade80"/>
        <text x="256" y="745" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#4ade80">
          Try-on simulation complete
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  }
  
  // Legacy method - now redirects to the new Gemini implementation
  async generateTryOnImage(userPhoto, productImageSrc, productClothes, userClothes) {
    console.log('🔄 Redirecting to new Gemini 2.5 Flash implementation...');
    return this.generateTryOnWithGemini(userPhoto, productImageSrc, productClothes, userClothes);
  }
  
  buildTryOnPrompt(productClothes, userClothes) {
    const basePrompt = `Create a new image by combining the elements from the provided images.

Take the [clothes to insert] and place it instead of the [clothes to replace].

The final image should be same person in the same environment and lighting with [scene change description]`;

    return basePrompt
      .replace('[clothes to insert]', `${productClothes.color} ${productClothes.clothes}`)
      .replace('[clothes to replace]', `${userClothes.color} ${userClothes.clothes}`)
      .replace('[scene change description]', `the new ${productClothes.color} ${productClothes.clothes} instead of the original ${userClothes.color} ${userClothes.clothes}`);
  }
  
  async detectUserClothes(userPhoto, productClothesInfo) {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error('No API key configured');
    
    console.log('👤 Starting user clothes detection...');
    
    // Build prompt with product info
    const prompt = await this.buildUserClothesDetectionPrompt(productClothesInfo);
    console.log('📝 User detection prompt:', prompt);
    
    // Convert user photo (remove data URL prefix if present)
    const userPhotoBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
    console.log('🖼️ User photo prepared for API:', userPhotoBase64.length, 'characters');
    
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: userPhotoBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100
      }
    };
    
    console.log('🚀 Sending user detection request to Gemini:', {
      model: this.textModel,
      promptLength: prompt.length,
      imageSize: userPhotoBase64.length
    });
    
    const response = await fetch(`${this.baseUrl}/${this.textModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error for user detection: ${error}`);
    }
    
    const result = await response.json();
    console.log('📄 Raw user detection response:', result);
    
    // Calculate actual cost from API usage metadata
    const usageMetadata = result.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = inputTokens + outputTokens;
    
    console.log('📊 User Detection API Usage:', {
      inputTokens,
      outputTokens, 
      totalTokens
    });
    
    const content = result.candidates[0].content.parts[0].text;
    console.log('📝 User detection content:', content);
    
    try {
      const parsed = JSON.parse(content.trim());
      console.log('✅ Parsed user clothes info:', parsed);
      return parsed;
    } catch (e) {
      console.log('⚠️ User detection JSON parse failed, using fallback');
      const clothesMatch = content.match(/"clothes":\s*"([^"]+)"/);
      const colorMatch = content.match(/"color":\s*"([^"]+)"/);
      
      const fallback = {
        clothes: clothesMatch ? clothesMatch[1] : 'clothing item',
        color: colorMatch ? colorMatch[1] : 'unknown'
      };
      console.log('🔄 User detection fallback result:', fallback);
      return fallback;
    }
  }
  
  async buildUserClothesDetectionPrompt(productClothesInfo) {
    const basePrompt = await this.readUserClothesDetectionPrompt();
    return basePrompt
      .replace('{PRODUCT_CLOTHES}', productClothesInfo.clothes)
      .replace('{PRODUCT_COLOR}', productClothesInfo.color);
  }
  
  async readUserClothesDetectionPrompt() {
    // In a real extension, this would be bundled as a resource
    return `I want to show how this person looks wearing a {PRODUCT_CLOTHES} in {PRODUCT_COLOR} color. 

Analyze the person in the photo and identify which piece of clothing should be replaced to make this try-on realistic. Return the type and color of the clothing item that would make sense to replace.

For example:
- If trying on a jacket, identify the person's current jacket/outerwear
- If trying on a shirt, identify the person's current shirt/top
- If trying on shoes, identify the person's current footwear

Describe the clothing to replace like this:
{
  "clothes": "<<ADD>>",
  "color": "<<ADD>>"
}

Examples:
{
  "clothes": "shirt",
  "color": "blue"
}
{
  "clothes": "jacket", 
  "color": "black"
}
{
  "clothes": "shoes",
  "color": "white"
}`;
  }
  
  async generateCacheKey(imageSrc) {
    const userPhoto = await this.getUserPhoto();
    const userPhotoHash = this.simpleHash(userPhoto || '');
    const imageHash = this.simpleHash(imageSrc);
    return `${imageHash}_${userPhotoHash}`;
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
  
  async readClothesDetectionPrompt() {
    // In a real extension, this would be bundled as a resource
    return `Analyze provided image and find the the main piece of clothes in the image. User has taken the photo with the goal to see how he will look in that piece of clothes. Describe that piece of clothes like this:
{
  "clothes": "<<ADD>>",
  "color": "<<ADD>>"
}

Examples
{
  "clothes": "shirt",
  "color": "white"
}
{
  "clothes": "jacket", 
  "color": "red"
}
{
  "clothes": "shoes",
  "color": "blue"
}`;
  }
  
  async buildTryOnPrompt(clothesInfo) {
    const basePrompt = `Create a new image by combining the elements from the provided images.

Take the ${clothesInfo.clothes} and place it instead of the existing clothes of the same type.

The final image should be same person in the same environment and lighting with the new ${clothesInfo.color} ${clothesInfo.clothes}.`;
    
    return basePrompt;
  }
  
  async imageUrlToBase64(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to load image: ${error.message}`);
    }
  }
}

// Service worker message handling
const geminiService = new GeminiAPIService();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔧 Service worker received message:', message.action);
  
  if (message.action === 'detectClothes') {
    console.log('🔍 Processing detectClothes request');
    geminiService.detectClothes(message.imageSrc)
      .then(result => {
        console.log('✅ detectClothes success:', result);
        sendResponse({ result });
      })
      .catch(error => {
        console.error('❌ detectClothes error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'generateTryOn') {
    console.log('🎨 Processing generateTryOn request');
    geminiService.generateTryOn(message.imageSrc, message.clothesInfo)
      .then(result => {
        console.log('✅ generateTryOn success:', result);
        sendResponse({ result });
      })
      .catch(error => {
        console.error('❌ generateTryOn error:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
  
  if (message.action === 'checkSetup') {
    console.log('⚙️ Processing checkSetup request');
    Promise.all([
      geminiService.getApiKey(),
      geminiService.getUserPhoto()
    ]).then(([apiKey, userPhoto]) => {
      const result = { 
        isSetup: !!(apiKey && userPhoto),
        hasApiKey: !!apiKey,
        hasUserPhoto: !!userPhoto
      };
      console.log('✅ checkSetup result:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('❌ checkSetup error:', error);
      sendResponse({ error: error.message });
    });
    return true;
  }
  
  if (message.action === 'generateTryOnWithGemini') {
    console.log('🖼️ Processing generateTryOnWithGemini request');
    geminiService.generateTryOnWithGemini(
      message.userPhoto, 
      message.productImageSrc, 
      message.productClothes, 
      message.userClothes
    )
      .then(result => {
        console.log('✅ generateTryOnWithGemini success:', result);
        sendResponse({ result });
      })
      .catch(error => {
        console.error('❌ generateTryOnWithGemini error:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
  
  console.log('❓ Unknown message action:', message.action);
});

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clothes Try-On Extension installed');
  
  // Open setup page on first install
  chrome.storage.local.get(['firstRun'], result => {
    if (!result.firstRun) {
      chrome.storage.local.set({ firstRun: false });
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    }
  });
});