export const API_CONFIG = {
  OCR_API_URL: 'https://api.ocr.space/parse/image',
  OCR_API_KEY: 'helloworld',
  
  OCR_ENABLED: true,
  MAX_IMAGE_SIZE: 1000, // max width/height for ocr processing
  IMAGE_QUALITY: 0.9, // image compression quality (0.1 - 1.0)
  
  // fallback google vision api (optional)
  GOOGLE_VISION_API_KEY: 'YOUR_GOOGLE_VISION_API_KEY',
  GOOGLE_VISION_URL: 'https://vision.googleapis.com/v1/images:annotate',
  USE_GOOGLE_VISION: false, // set to true if you have a google api key
};

// instructions for getting google vision api key:
/* 
1. go to google cloud console (https:// console.cloud.google.com/)
2. create a new project or select existing one
3. enable the vision api
4. create credentials (api key)
5. copy the api key and replace 'your_google_vision_api_key' above
6. set use_google_vision to true
 */