# Splitsy 💰
## Go Splitsies on your expenses with friends & family

> **🚀 Want to start immediately?** 
> 1. Install [Node.js](https://nodejs.org/) 
> 2. Visit [**Easy Setup Guide**](https://jettnguyen.github.io/Splitsy/easy-install.html) 
> 3. Scan QR code with Expo Go app - Done! 

A modern React Native expense splitting app with intelligent receipt scanning powered by OCR technology. Split bills effortlessly with friends, family, and roommates!

## ✨ Features

- 📱 **Cross-Platform**: Works on iOS and Android
- 🌓 **Dark/Light Mode**: Toggle between themes for comfortable viewing
- 📸 **Receipt Scanning**: Advanced OCR technology to extract data from receipts
- 👥 **Group Management**: Create and manage expense groups
- 💳 **Smart Splitting**: Automatically calculate splits and track who owes what
- 🔔 **Notifications**: Stay updated on payments and activities
- 💰 **Balance Tracking**: See your net balance at a glance
- 🎨 **Modern UI**: Clean interface with smooth animations

## ⚡ **INSTANT SETUP** - Choose Your Method:

### 🌐 **Method 1: Web Installer (EASIEST)**
**👆 Click here for guided setup:** [**easy-install.html**](https://jettnguyen.github.io/Splitsy/easy-install.html)

### 🚀 **Method 2: Auto-Installer Scripts**

**Windows Users:**
1. Download [setup.bat](https://github.com/JettNguyen/Splitsy/raw/main/setup.bat)
2. Double-click it
3. Done! 🎉

**Mac/Linux Users:**
```bash
curl -sSL https://github.com/JettNguyen/Splitsy/raw/main/setup.sh | bash
```

### 🚀 **Method 2: One-Line Command**

**For Complete Beginners** (Never used React Native before):

**Step 1:** Install Node.js from [nodejs.org](https://nodejs.org/) (just download and click through the installer)

**Step 2:** Copy and paste this into your terminal/command prompt:
```bash
git clone https://github.com/JettNguyen/Splitsy.git && cd Splitsy && npm install --legacy-peer-deps && npx expo start
```

**Step 3:** Install "Expo Go" app on your phone, scan the QR code, done! 📱

---

### � **Method 3: One-Line Command (For Developers)**

```bash
git clone https://github.com/JettNguyen/Splitsy.git && cd Splitsy && npm install --legacy-peer-deps && npx expo start
```

### 📱 **After Setup - Running Again**
- **Windows**: Double-click `run.bat`
- **Mac/Linux**: Run `./run.sh` or `npm start`

---

## 🚀 Detailed Setup (If You Want More Control)

### Prerequisites

Ensure you have the following installed:

- **Node.js** (18.0.0 or higher, 20.19.4+ recommended) - [Download here](https://nodejs.org/)
- **npm** (8.0.0 or higher) - Comes with Node.js

### Installation

#### 🚀 Quick Setup (Recommended)

**One-line install:**
```bash
git clone https://github.com/JettNguyen/Splitsy.git && cd Splitsy && npm install --legacy-peer-deps && npx expo start
```

#### 📋 Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/JettNguyen/Splitsy.git
   cd Splitsy
   ```

2. **Install dependencies**
   ```bash
   # Recommended approach (handles most compatibility issues):
   npm install --legacy-peer-deps
   
   # Alternative if the above fails:
   npm install --force
   
   # On Windows with permission issues, try:
   npm install --legacy-peer-deps --no-optional
   ```
   
   ⚠️ **Note**: You may see warnings about Node.js version requirements. This is normal and the app will still work.

3. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on your device**
   - Download the **Expo Go** app on your mobile device
   - Scan the QR code displayed in your terminal/browser
   - The app will load on your device!

### Alternative Run Methods

- **iOS Simulator**: `npm run ios` (macOS only)
- **Android Emulator**: `npm run android`
- **Web Browser**: `npm run web`

## 📱 Device Setup

### For iOS
1. Install **Expo Go** from the App Store
2. Scan the QR code with your camera app or Expo Go

### For Android
1. Install **Expo Go** from Google Play Store
2. Scan the QR code with the Expo Go app

## 🔧 Configuration

### Receipt Scanning Setup

The app uses **OCR.space API** for free receipt scanning. No additional setup required!

- ✅ **Free tier included**: 25,000 requests/month
- ✅ **No API key required**: Uses public demo key
- ✅ **Multiple formats supported**: Target, Walmart, and generic receipts

### Optional: Google Vision API (Enhanced Accuracy)

For better OCR accuracy, you can configure Google Vision API:

1. Get a Google Cloud Vision API key
2. Update `config/api.js`:
   ```javascript
   export const API_CONFIG = {
     GOOGLE_VISION_API_KEY: 'YOUR_API_KEY_HERE',
     USE_GOOGLE_VISION: true,
     // ... other config
   };
   ```

## 🛠️ Development

### Project Structure
```
Splitsy/
├── components/          # Reusable UI components
│   ├── EnhancedExpenseForm.js
│   ├── ReceiptScanner.js
│   └── Toast.js
├── context/            # React Context providers
│   ├── DataContext.js
│   ├── NotificationContext.js
│   ├── ThemeContext.js
│   ├── ToastContext.js
│   └── UserContext.js
├── screens/            # App screens/pages
│   ├── AuthScreen.js
│   ├── ProfileScreen.js
│   └── SettlementScreen.js
├── config/             # Configuration files
│   └── api.js
├── App.js              # Main app component
└── package.json        # Dependencies and scripts
```

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device
- `npm run web` - Run in web browser
- `npm run install-deps` - Reinstall all dependencies

## 🔧 Troubleshooting

### Common Issues

1. **"Metro bundler not running"**
   ```bash
   expo start --clear
   ```

2. **"Dependencies not found"**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **"Expo CLI not found"**
   ```bash
   npm install -g @expo/cli
   ```

4. **"Permission denied" (Windows)**
   - Run Command Prompt/PowerShell as Administrator
   - Or try: `npm install --no-optional`
   - Close any editors/antivirus software temporarily

5. **"App won't load on device"**
   - Ensure your device and computer are on the same WiFi network
   - Try restarting the Expo development server
   - Clear Expo cache: `expo start --clear`

### System Requirements

- **iOS**: iOS 13.4+ required
- **Android**: Android 6.0+ (API level 23+) required
- **Node.js**: 18.0.0 or higher (20.19.4+ recommended for full compatibility)
- **RAM**: Minimum 4GB recommended
- **Storage**: 2GB free space for dependencies

## 📋 Dependencies

### Core Dependencies
- **React Native**: Mobile app framework
- **Expo**: Development platform and runtime
- **AsyncStorage**: Local data persistence
- **Image Picker/Manipulator**: Camera and image handling
- **Vector Icons**: UI icons

### Features
- **Receipt Scanning**: OCR.space API integration
- **Theme System**: Dark/light mode support
- **State Management**: React Context
- **Notifications**: Local notifications
- **Image Processing**: Automatic image optimization

---

**Happy Splitting! 💸**