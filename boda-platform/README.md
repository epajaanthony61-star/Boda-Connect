# Boda Platform 🏍️

> Open-source mobile and web application platform for Boda Boda (motorcycle taxi) operators and commuters in East Africa.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-0.72-61DAFB?logo=react)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)

## 🌟 Core Value Proposition

**For Riders (Drivers):**
- ✅ Fair distance-based fare calculation
- ✅ Financial tools for micro-entrepreneurship (earnings tracking, expense logging, lease management)
- ✅ Safety tracking and performance badges
- ✅ Progress toward motorcycle ownership

**For Passengers (Commuters):**
- ✅ Transparent fare breakdown before booking
- ✅ Real-time driver tracking
- ✅ SOS emergency button
- ✅ Safe, reliable transportation

**For Fleet Managers:**
- ✅ Real-time fleet monitoring dashboard
- ✅ Rider performance analytics
- ✅ Safety incident management
- ✅ Financial reporting

---

## 🏗️ Architecture Overview

```
boda-platform/
├── backend/                 # Node.js + TypeScript API server
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Auth, validation, etc.
│   │   ├── utils/          # Helper functions
│   │   │   ├── fareCalculator.ts      # Dynamic fare algorithm
│   │   │   └── riderSafetyScore.ts    # Safety scoring algorithm
│   │   └── sockets/        # WebSocket event handlers
│   └── package.json
│
├── mobile/                  # React Native app (Rider & Passenger)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── RiderFinancialDashboard.tsx  # Financial tracking UI
│   │   │   └── ...
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── utils/
│   │   └── context/
│   └── package.json
│
├── web/                     # React admin dashboard
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
│
└── docs/
    ├── DATABASE_SCHEMA.sql  # PostgreSQL schema with PostGIS
    ├── API_ENDPOINTS.md     # REST API documentation
    └── ARCHITECTURE.md      # Plugin system & extensibility guide
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- Redis (for real-time features)
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials, API keys, etc.

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# For iOS
cd ios && pod install && cd ..
npm run ios

# For Android
npm run android
```

### Web Dashboard Setup

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 📱 Key Features

### Fare Calculation Algorithm

Our dynamic fare calculation considers:
- **Base Fare**: Covers first 2km
- **Distance Rate**: Per-km charge after base distance
- **Terrain Surcharge**: Extra for hilly/rural areas (Kampala, Kigali hills)
- **Peak Hours**: Rush hour multipliers (6-9 AM, 5-8 PM)
- **Dynamic Surge**: Real-time demand-based pricing

See [`backend/src/utils/fareCalculator.ts`](backend/src/utils/fareCalculator.ts) for implementation.

### Rider Safety Score

Comprehensive safety tracking with:
- **Incident Detection**: Speeding, harsh braking, rapid acceleration
- **Positive Reinforcement**: Safe ride bonuses, customer compliments
- **Recency Weighting**: Recent events have more impact
- **Badge System**: Earn achievements for safe driving milestones
- **Personalized Recommendations**: AI-driven improvement suggestions

See [`backend/src/utils/riderSafetyScore.ts`](backend/src/utils/riderSafetyScore.ts) for implementation.

### Offline-First Design

Built for East African connectivity challenges:
- Local transaction logging when offline
- Automatic sync when connection restored
- Compressed GPS data transmission
- Selective sync based on connection quality
- Photo receipt compression

### Mobile Money Integration

Plugin-based payment system supporting:
- M-Pesa (Kenya)
- Airtel Money (Uganda, Kenya)
- Tigo Pesa (Rwanda, Tanzania)
- Easy to add new providers via plugin system

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js, TypeScript, Express.js |
| **Database** | PostgreSQL 14+ with PostGIS |
| **Real-time** | Socket.io |
| **Cache** | Redis |
| **Mobile** | React Native, Expo |
| **Web** | React, Vite, Tailwind CSS |
| **Authentication** | JWT with Phone OTP |
| **Maps** | Plugin-based (Google Maps / OSM) |
| **Payments** | Plugin-based (M-Pesa, Airtel, etc.) |

---

## 📖 Documentation

- [Database Schema](docs/DATABASE_SCHEMA.sql) - Complete PostgreSQL schema with PostGIS
- [API Endpoints](docs/API_ENDPOINTS.md) - RESTful API documentation
- [Architecture Guide](docs/ARCHITECTURE.md) - Plugin system and extensibility

---

## 🔌 Plugin System

Extend the platform with custom plugins:

### Available Plugin Types

1. **Payment Providers** - Add new mobile money or card processors
2. **Map Services** - Integrate alternative map providers
3. **SMS Gateways** - Connect local SMS providers for OTP
4. **Analytics** - Add custom tracking and reporting

### Creating a Plugin

```typescript
// Example: Custom payment plugin
import { PaymentPlugin } from './types';

export default class MyPaymentPlugin implements PaymentPlugin {
  name = 'my_payment_provider';
  version = '1.0.0';
  
  async initialize(config: any): Promise<void> {
    // Initialize your service
  }
  
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Process payment
  }
}
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete plugin documentation.

---

## 🌍 East African Context

This platform is specifically designed for East African operations:

### Challenges Addressed

| Challenge | Solution |
|-----------|----------|
| **Poor Connectivity** | Offline-first architecture with sync queue |
| **Multiple Currencies** | Support for KES, UGX, RWF with automatic conversion |
| **Cash Economy** | Mobile Money integration (M-Pesa, Airtel Money) |
| **Hilly Terrain** | Fare surcharges for difficult terrain (Kampala, Kigali) |
| **Informal Leasing** | Lease tracking toward motorcycle ownership |
| **Safety Concerns** | SOS button, real-time tracking, safety scoring |
| **Low Digital Literacy** | Simple, intuitive UI with local language support (future) |

### Regional Configurations

Default fare configurations included for:
- 🇰🇪 Kenya (Nairobi)
- 🇺🇬 Uganda (Kampala)
- 🇷🇼 Rwanda (Kigali)

Easily customizable per city/region via admin dashboard.

---

## 👥 User Roles

### Rider (Driver)
- Accept/reject ride requests
- Track earnings and expenses
- Log fuel and maintenance costs
- Monitor safety score and badges
- Manage lease payments
- Withdraw to Mobile Money

### Passenger
- Request rides with fare estimate
- Track driver in real-time
- Rate and review riders
- Save favorite addresses
- Emergency SOS button
- Ride history and receipts

### Fleet Manager / Admin
- Monitor all active rides
- View rider performance metrics
- Manage fare configurations
- Handle disputes and incidents
- Generate financial reports
- Configure plugins

---

## 🔒 Security

- JWT-based authentication with phone OTP
- Role-based access control (RBAC)
- Encrypted sensitive data at rest
- HTTPS/TLS for all communications
- Rate limiting on all endpoints
- Audit logging for critical actions
- Plugin sandboxing with resource limits

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Mobile tests
cd mobile
npm test

# E2E tests
npm run test:e2e
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Review Checklist

- [ ] TypeScript types defined
- [ ] Unit tests included (min 80% coverage)
- [ ] Documentation updated
- [ ] Follows ESLint rules
- [ ] Works in offline mode
- [ ] No hardcoded secrets

---

## 📞 Support

- **Documentation**: https://docs.bodaplatform.io
- **Discord Community**: https://discord.gg/bodaplatform
- **GitHub Issues**: https://github.com/bodaplatform/boda-platform/issues
- **Email**: developers@bodaplatform.io

---

## 🙏 Acknowledgments

Built with ❤️ for East Africa's Boda Boda community, empowering riders with technology for financial inclusion and safer roads.

Special thanks to:
- The boda rider communities in Nairobi, Kampala, and Kigali
- Open-source contributors worldwide
- Mobile Money providers for accessible financial services

---

## 📈 Roadmap

### Q1 2024
- [ ] Core platform MVP
- [ ] M-Pesa integration
- [ ] Basic safety scoring

### Q2 2024
- [ ] Airtel Money integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support (Swahili, Luganda, Kinyarwanda)

### Q3 2024
- [ ] AI-powered route optimization
- [ ] Group ride sharing
- [ ] Insurance partnerships

### Q4 2024
- [ ] Electric motorcycle integration
- [ ] Carbon credit tracking
- [ ] Expansion to Tanzania

---

*Last Updated: January 2024*
