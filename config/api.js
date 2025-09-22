// API Configuration
// The app now uses OCR.space API for free text recognition
// No API key required for basic usage

export const API_CONFIG = {
  // Free OCR API Configuration (OCR.space)
  OCR_API_URL: 'https://api.ocr.space/parse/image',
  OCR_API_KEY: 'helloworld', // Free tier API key (publicly available)
  
  // OCR Settings
  OCR_ENABLED: true, // Now enabled by default with free service
  MAX_IMAGE_SIZE: 1000, // Max width/height for OCR processing
  IMAGE_QUALITY: 0.9, // Image compression quality (0.1 - 1.0)
  
  // Fallback Google Vision API (optional - for enhanced accuracy)
  GOOGLE_VISION_API_KEY: 'YOUR_GOOGLE_VISION_API_KEY',
  GOOGLE_VISION_URL: 'https://vision.googleapis.com/v1/images:annotate',
  USE_GOOGLE_VISION: false, // Set to true if you have a Google API key
};

// Instructions for getting Google Vision API key:
/*
1. Go to Google Cloud Console (https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Vision API
4. Go to "Credentials" and create an API key
5. Restrict the API key to Vision API for security
6. Replace 'YOUR_GOOGLE_VISION_API_KEY' above with your key
7. Set OCR_ENABLED to true
*/