# BodaClass - Motorcycle Taxi Management Platform

BodaClass is a comprehensive motorcycle taxi (boda boda) management platform designed to professionalize the industry by enforcing fair fares, monitoring rider attitude, ensuring safety compliance, and providing transparent analytics.

## 🚀 Features

### Core Modules
- **Rider Registration & Boda Class System**: Tiered classification (Bronze, Silver, Gold, Platinum)
- **Agent, Stage & Fare Management**: Dynamic fares and automated commission tracking
- **Reporting & Analytics Dashboard**: Comprehensive reports for all user types
- **Customer Rating & Attitude Monitoring**: Granular 5-category rating system
- **Ride Booking & Real-Time Tracking**: Live GPS tracking with ETA updates
- **Safety & Compliance Engine**: Pre-trip checklists and SOS features
- **Training & Gamification**: Mandatory training modules and rewards system
- **Super Admin Panel**: Full system configuration and dispute resolution

### User Roles
- **Customer App**: Book rides, track, rate, safety features
- **Rider App**: Accept rides, navigation, safety checklists, performance viewing
- **Agent/Stage Manager Portal**: Manage local rider assignments and commissions
- **Super Admin Dashboard**: System configuration and analytics

## 🏗️ Technical Architecture

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Sequelize ORM
- **Real-time**: Socket.IO for live tracking and notifications
- **Authentication**: JWT-based authentication
- **File Storage**: AWS S3 / Firebase Storage

### Frontend (Planned)
- **Mobile Apps**: React Native (Customer & Rider)
- **Web Dashboard**: React.js (Admin & Agent)

### Services
- **Maps**: Google Maps API / Mapbox
- **Payments**: Mobile Money (MTN MoMo, Airtel Money), Stripe, Paystack
- **Notifications**: Firebase Cloud Messaging

## 📁 Project Structure

```
bodaclass/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and service configurations
│   │   ├── controllers/     # Business logic controllers
│   │   ├── middleware/      # Authentication and validation
│   │   ├── models/          # Sequelize database models
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # External service integrations
│   │   ├── utils/           # Helper functions
│   │   └── server.js        # Application entry point
│   ├── .env.example         # Environment variables template
│   └── package.json
├── web-admin/               # React admin dashboard (to be implemented)
├── mobile-app/              # React Native mobile apps (to be implemented)
└── shared/                  # Shared code and types
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js v16+
- PostgreSQL v12+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE bodaclass_db;
   ```

5. **Run database migrations**
   ```bash
   npm run dev  # Server will auto-sync in development mode
   ```

6. **Start the server**
   ```bash
   npm run dev    # Development with hot reload
   npm start      # Production mode
   ```

### Environment Variables

Required environment variables in `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bodaclass_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

# AWS S3 (for document storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=bodaclass-documents

# Maps API
GOOGLE_MAPS_API_KEY=your_maps_api_key

# Payment Gateways
MTN_MOMO_API_KEY=your_mtn_key
AIRTEL_MONEY_API_KEY=your_airtel_key
STRIPE_SECRET_KEY=your_stripe_key
PAYSTACK_SECRET_KEY=your_paystack_key
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

### Riders (Protected)
- `GET /api/riders/` - List riders
- `GET /api/riders/:id` - Get rider details
- `PUT /api/riders/:id` - Update rider info
- `POST /api/riders/documents` - Upload KYC documents

### Rides
- `POST /api/rides/` - Create ride request
- `GET /api/rides/:id` - Get ride details
- `PUT /api/rides/:id/status` - Update ride status
- `GET /api/rides/my-rides` - Get user's ride history

### Ratings
- `POST /api/ratings/` - Submit rating
- `GET /api/ratings/rider/:id` - Get rider ratings

### Complaints
- `POST /api/complaints/` - File complaint
- `GET /api/complaints/:id` - Get complaint details
- `PUT /api/complaints/:id/status` - Update complaint status

### Admin (Admin only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/analytics` - Get platform analytics
- `PUT /api/admin/riders/:id/verify` - Verify rider
- `PUT /api/admin/riders/:id/suspend` - Suspend rider

## 🔐 Boda Class Tiers

| Tier | Requirements | Benefits |
|------|-------------|----------|
| **Bronze** | Default | Standard rates |
| **Silver** | 4.0+ rating, 50+ trips | Priority support |
| **Gold** | 4.5+ rating, 200+ trips | Lower commission, bonus eligibility |
| **Platinum** | 4.8+ rating, 500+ trips | Lowest commission, premium badges, top priority |

## ⚙️ Automated Business Logic

- **Tier Promotion/Demotion**: Runs nightly based on 30-day average ratings
- **Suspension Trigger**: Automatic suspension if attitude score < 2.0 over 10 trips
- **Fare Calculation**: Base Fare + (Distance × Rate/km) + Commission%

## 📝 License

ISC

## 👥 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

Built with ❤️ for the boda boda community
