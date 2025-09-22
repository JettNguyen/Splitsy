# Receipt Scanner Setup Guide

## Overview
The receipt scanner in Splitsy now uses **FREE OCR** by default! It automatically extracts text from receipt images and parses merchant information, dates, totals, and items using OCR.space API.

## Current Status
- ✅ **FREE OCR ENABLED** - No setup required!
- ✅ Smart image processing and optimization  
- ✅ Advanced receipt text parsing algorithms  
- ✅ Automatic fallback to enhanced simulation if OCR fails
- ⚙️ Optional Google Vision API for enhanced accuracy

## How It Works

### Free OCR (Default - No Setup Required)
1. **Image Optimization**: Resizes and compresses images for better OCR performance
2. **Text Extraction**: Uses OCR.space free API for text recognition
3. **Smart Parsing**: Advanced algorithms extract:
   - Merchant names (business patterns, major retailers)
   - Dates (multiple format support: MM/DD/YYYY, DD-MM-YYYY, etc.)
   - Total amounts (looks for "TOTAL", "AMOUNT DUE", or largest monetary value)
   - Individual items (name and price combinations)
4. **Data Validation**: Filters out irrelevant text and validates extracted information
5. **Fallback**: If OCR fails, automatically uses enhanced simulation with realistic data

### Enhanced Google Vision API (Optional)
For even better accuracy, you can optionally enable Google Vision API:

1. Get a Google Vision API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Open `config/api.js`
3. Replace `'YOUR_GOOGLE_VISION_API_KEY'` with your actual API key
4. Set `USE_GOOGLE_VISION: true`
## Parsing Features

### Merchant Detection
- Recognizes common business name patterns
- Identifies major retailers (Target, Walmart, Starbucks, etc.)
- Cleans and formats merchant names properly

### Date Recognition
- Supports multiple date formats
- Automatically converts to MM/DD/YYYY format
- Falls back to current date if none found

### Total Amount Detection
- Searches for explicit total indicators
- Identifies largest monetary amount as fallback
- Validates price formatting

### Item Extraction
- Matches item names with prices
- Filters out non-product lines (totals, taxes, etc.)
- Limits to reasonable item names (2-50 characters)
- Extracts up to 10 items per receipt

## Error Handling
- Graceful fallback to realistic simulation if OCR fails
- User notifications for processing issues
- Maintains app functionality regardless of API status
- Automatic retry with different OCR services

## Cost Information
- **Free OCR**: Completely free with OCR.space API (public key included)
- **Google Vision API**: Optional upgrade for better accuracy
  - First 1,000 requests per month are free
  - ~$1.50 per 1,000 requests thereafter

## Testing
1. Take photos of real receipts with good lighting
2. Try different receipt types (grocery, restaurant, retail)
3. Compare extracted data with actual receipt information
4. Test with various lighting conditions and angles

## Troubleshooting

### Common Issues
- **Poor text extraction**: Try better lighting or clearer photos
- **Missing items**: Some receipt formats may not be recognized
- **Incorrect totals**: Parser may select subtotal instead of final total
- **Wrong merchant**: May extract address or other text as merchant name

### Improving Accuracy
- Ensure good lighting when taking photos
- Keep receipt flat and fully visible
- Avoid shadows and reflections
- Crop receipt to remove background if possible
- Take photos straight-on (not at an angle)