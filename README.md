# Splitsy
**Split expenses effortlessly with friends, family, and roommates**

A React Native app for tracking shared expenses with receipt scanning and automated bill splitting.

## Features

- **Cross-Platform**: iOS & Android support
- **Dark/Light Mode**: Theme switching
- **Receipt Scanning**: OCR-powered data extraction
- **Group Management**: Create and manage expense groups
- **Smart Splitting**: Automatic split calculations
- **Balance Tracking**: Real-time balance summaries

## Quick Start

### Prerequisites
- **Node.js** 18.0+
- **Expo Go** app on your phone

### Setup
```bash
#clone and install
git clone https://github.com/JettNguyen/Splitsy.git
cd Splitsy
npm install --legacy-peer-deps

#start backend
cd backend
npm install
node server.js

#start frontend
cd .. 
npm start
```

Scan the QR code with Expo Go and you're ready!

## Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Node.js, Express, MongoDB
- **OCR**: Receipt scanning and data extraction
- **Icons**: Expo Vector Icons (Ionicons)

## Development

### Available Scripts
- `npm start` - Start Expo development server
- `npm run android` - Open on Android
- `npm run ios` - Open on iOS
- `npm run web` - Open in web browser
