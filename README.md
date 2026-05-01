# 🎬 Cinema Booking System — WMT Group Assignment (WD-AI-22)

## Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Payments**: PayHere Sandbox

## Team Members & Modules
| Student ID | Name | Module |
|---|---|---|
| IT24103194 | Perera T.G.R.N | Movie Card Management |
| IT24102811 | Jayasinghe P.K.A | Payment & Ticket System |
| IT24101445 | Munasinghe N.A.A.A | Time Slot Allocation |
| IT24100163 | Ransara A.P.R | Review Management |
| IT24101075 | Lithman P.V.L | Seat Booking System |
| IT24101219 | Piyarathna S.G.D.V | Branch & Hall Management |

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- Expo Go app on your phone (or Android Studio AVD)
- ngrok installed

### One-Command Start
```bash
bash start-dev.sh
```
This automatically starts backend, opens ngrok tunnel, updates `.env`, and launches Expo.

### Manual Setup

**Backend:**
```bash
cd backend
npm install
npm run dev          # Starts on port 5000
```

**Frontend:**
```bash
# First: update frontend/.env with your local IP
# API_BASE_URL=http://YOUR_LOCAL_IP:5000/api
cd frontend
npx expo start       # Scan QR with Expo Go
```

**Seed test data:**
```bash
cd backend
node utils/seeder.js
```

### Test Accounts (Password: `Password@123`)
| Email | Role |
|---|---|
| manager@cinema.lk | Main Manager |
| branch@cinema.lk | Branch Manager |
| employee@cinema.lk | Hall Employee |
| customer@cinema.lk | Customer |

---

## ☁️ Deploying Backend (Render)

1. Push `backend/` to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node server.js`
6. Add these **Environment Variables** (from your `.env`):
   ```
   MONGO_URI
   JWT_ACCESS_SECRET
   JWT_REFRESH_SECRET
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   PAYHERE_MERCHANT_ID
   PAYHERE_MERCHANT_SECRET
   PAYHERE_SANDBOX=true
   PAYHERE_CHECKOUT_URL=https://sandbox.payhere.lk/pay/checkout
   PAYHERE_NOTIFY_URL=https://YOUR-RENDER-URL.onrender.com/api/payments/webhook
   PAYHERE_RETURN_URL=cinemaapp://payment/success
   PAYHERE_CANCEL_URL=cinemaapp://payment/cancel
   CLOUDINARY_CLOUD_NAME=dywmsyj7b
   CLOUDINARY_API_KEY
   CLOUDINARY_API_SECRET
   NODE_ENV=production
   PORT=5000
   ```
7. After deploy, update `frontend/.env`:
   ```
   API_BASE_URL=https://YOUR-RENDER-URL.onrender.com/api
   ```

---

## 📁 Project Structure

```
WMT_Assignment/
├── backend/
│   ├── config/         # DB + Cloudinary
│   ├── middleware/     # Auth, error handler
│   ├── models/         # User, Branch, Hall, Movie, TimeSlot, Booking, SeatLock, Review
│   ├── routes/         # 7 route files
│   ├── controllers/    # 7 controller files
│   ├── utils/          # JWT, PayHere hash, QR generator, seeder
│   └── server.js
├── frontend/
│   ├── app/
│   │   ├── auth/       # login, register
│   │   ├── customer/   # home, movie detail, seat picker, checkout, tickets, ticket detail
│   │   ├── employee/   # ticket scanner
│   │   └── manager/    # dashboard, movies, slots, branches, halls, hall editor
│   ├── context/        # AuthContext
│   ├── services/       # api.js (axios)
│   └── constants/      # theme.js
├── start-dev.sh        # One-command dev launcher
└── .env
```

---

## 🔑 Key Features
- **Role-based access**: Main Manager, Branch Manager, Hall Employee, Customer
- **Visual Hall Editor**: Paint-tool seat grid with VIP/Loveseat/Producer/Lobby types
- **PayHere Integration**: Sandbox payment with server-side hash, webhook confirmation
- **QR Tickets**: Auto-generated QR on payment success, stored in Cloudinary
- **Race-condition-safe booking**: MongoDB TTL seat locks prevent double-booking
- **Soft delete branches**: 30-day restore window for main manager
