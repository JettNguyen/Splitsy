# Splitsy
**Split expenses effortlessly with friends, family, and roommates**

A React Native app for tracking shared expenses with receipt scanning and automated bill splitting.

## Features

- **Cross-Platform**: iOS & Android support
- **Dark/Light Mode**: Theme switching
- **Receipt Scanning**: OCR-powered data extraction
- **Friend/Group Management**: Create and manage friends & groups

## Quick Start

### Prerequisites
- **Node.js** 18.0+
- **Expo Go** app on your phone

### Setup

#### 1. Clone and Install Dependencies
```bash
#clone the repository
git clone https://github.com/JettNguyen/Splitsy.git
cd Splitsy

#install dependencies
npm install
npm install expo
cd backend
npm install
```

#### 2. Use .env file (provided by me)
- Ensure it is named `.env` with the dot
- Put it in the root directory

#### 3. Start the Application
```bash
#start frontend
cd ..
npm start
```

#### 4. Connect Your Device
- Scan the QR code with Expo Go app

## Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Node.js, Express, MongoDB
- **Database**: MongoDB Atlas (cloud) or MongoDB (local)
- **Authentication**: JWT tokens
- **OCR**: Receipt scanning and data extraction
- **Icons**: Expo Vector Icons (Ionicons)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/members` - Add member to group
- `DELETE /api/groups/:id/members/:userId` - Remove member from group

### Transactions
- `GET /api/transactions/:groupId` - Get group transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
