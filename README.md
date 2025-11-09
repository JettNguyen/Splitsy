# Splitsy

**Split expenses effortlessly with friends, family, and roommates**

A React Native app for tracking shared expenses with receipt scanning and automated bill splitting.

## Features

- **Cross-Platform**: iOS & Android support
- **Receipt Scanning**: Tesseract OCR data extraction
- **Friend/Group Management**: Create and manage friends & groups
- **Dark/Light Mode**: Theme switching

## Quick Start

### Prerequisites

- **Node.js** 18.0+
- **Expo Go** app on your phone

### Setup

#### 1. Clone and Install Dependencies

##### Clone

```bash
git clone https://github.com/JettNguyen/Splitsy.git
cd Splitsy
```

##### Install Dependencies

```bash
npm install
npm install expo
cd backend
npm install
```

##### Install Tesseract

```bash
# Mac
brew install tesseract

# OR download through the tesseract installer page for Windows machines with link below:
```

##### Windows install link:

- [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki)

##### Change `main.py`

In backend/python_ocr/main.py, select the tesseract path based on what OS you have

#### 2. Use .env file (provided by the team)

- Ensure it is named `.env`

#### 3. Update IP in `.env`, `app.config.js` & `ReceiptScanner.js`

- If you do not know your IP, run `ipconfig` (Windows) or `ifconfig` (Mac)
- Replace `IP_ADDRESS`'s IP value on line 2 of `Splitsy/.env`
- Replace `IP_ADDRESS`'s IP value on line 6 of `Splitsy/app.config.js`
- Replace `BACKEND_URL`'s IP value on line 19 of `Splitsy/components/ReceiptScanner.js` (after "https://" and before the ":5000")

#### 4. Start the Application

```bash
# terminal 1: start backend server
cd backend
node server.js
```

```bash
# OR use this: backend server that refreshes upon every change
npm install -g nodemon
nodemon server. js
```

```bash
#terminal 2: start frontend
npm start
```

```bash
#terminal 3: start python ocr microservice
cd backend/python_ocr
python -m venv venv          #start python environment
venv\Scripts\activate        # windows  
source venv/bin/activate     # mac/linux                           
pip install flask flask-cors pillow pytesseract werkzeug    #install dependencies

python main.py               #run the flask server
```

#### 5. Connect Your Device

- Scan the QR code with Expo Go app

## Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Node.js, Express, MongoDB
- **Database**: MongoDB
- **Authentication**: JWT tokens
- **OCR**: Receipt scanning and data extraction
- **Icons**: Expo Vector Icons

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

## Notes

*AI was utilized in this project to assist in setting up the initial code environment and address specific backend implementation issues.*
