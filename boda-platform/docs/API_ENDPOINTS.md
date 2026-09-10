# Boda Platform - API Endpoint Architecture

## RESTful API Structure

Base URL: `https://api.bodaplatform.io/v1`

---

## Authentication Module (`/auth`)

### POST `/auth/register`
Register a new user (rider or passenger)

**Request:**
```json
{
  "phone_number": "+254700000000",
  "country_code": "+254",
  "full_name": "John Doe",
  "role": "rider",
  "device_id": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to +254700000000",
  "otp_reference_id": "ref_123abc"
}
```

### POST `/auth/verify-otp`
Verify OTP and complete registration/login

**Request:**
```json
{
  "phone_number": "+254700000000",
  "otp": "123456",
  "otp_reference_id": "ref_123abc"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone_number": "+254700000000",
    "full_name": "John Doe",
    "role": "rider",
    "is_verified": true
  },
  "token": "jwt_token_here",
  "refresh_token": "refresh_token_here"
}
```

### POST `/auth/refresh`
Refresh access token

**Request:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

### POST `/auth/logout`
Invalidate tokens

---

## Rides Module (`/rides`)

### POST `/rides/request`
Passenger requests a ride

**Request:**
```json
{
  "pickup_latitude": -1.2921,
  "pickup_longitude": 36.8219,
  "pickup_address": "Westlands, Nairobi",
  "dropoff_latitude": -1.2833,
  "dropoff_longitude": 36.8172,
  "dropoff_address": "CBD, Nairobi",
  "payment_method": "mpesa",
  "passenger_note": "Waiting at the main gate"
}
```

**Response:**
```json
{
  "ride": {
    "id": "uuid",
    "status": "requested",
    "estimated_fare": {
      "base_fare": 80,
      "distance_fare": 120,
      "terrain_surcharge": 0,
      "peak_surcharge": 0,
      "total_fare": 200,
      "currency": "KES"
    },
    "estimated_distance_km": 5.2,
    "estimated_duration_minutes": 15,
    "nearby_riders_count": 8
  }
}
```

### GET `/rides/:id`
Get ride details

### PATCH `/rides/:id/accept`
Rider accepts a ride request

**Request:**
```json
{
  "rider_id": "uuid"
}
```

### PATCH `/rides/:id/status`
Update ride status

**Request:**
```json
{
  "status": "arrived" // arriving, arrived, in_transit, completed
}
```

### POST `/rides/:id/cancel`
Cancel a ride

**Request:**
```json
{
  "reason": "Driver too far away",
  "cancelled_by": "passenger" // or "rider"
}
```

### GET `/rides`
List rides (with filters)

**Query Parameters:**
- `status`: Filter by status
- `from_date`: Start date
- `to_date`: End date
- `limit`: Pagination limit
- `offset`: Pagination offset

---

## Fares Module (`/fares`)

### POST `/fares/estimate`
Get fare estimate before booking

**Request:**
```json
{
  "pickup_latitude": -1.2921,
  "pickup_longitude": 36.8219,
  "dropoff_latitude": -1.2833,
  "dropoff_longitude": 36.8172
}
```

**Response:**
```json
{
  "fare_breakdown": {
    "base_fare": 80,
    "distance_fare": 120,
    "terrain_surcharge": 0,
    "peak_surcharge": 0,
    "surge_multiplier": 1.0,
    "total_fare": 200,
    "rider_earnings": 180,
    "platform_commission": 20,
    "currency": "KES"
  },
  "distance_km": 5.2,
  "estimated_duration_minutes": 15,
  "breakdown": {
    "baseFareDescription": "Base fare (first 2km)",
    "distanceDescription": "3.20 km × 40 KES/km",
    "terrainDescription": "flat urban terrain (0% surcharge)",
    "peakDescription": "Standard rate"
  }
}
```

### GET `/fares/config`
Get current fare configuration (admin only)

### PUT `/fares/config`
Update fare configuration (admin only)

---

## Finance Module (`/finance`)

### GET `/finance/summary`
Get rider's financial summary

**Response:**
```json
{
  "today": {
    "total_rides": 8,
    "total_earnings": 2450,
    "total_expenses": 650,
    "fuel_expenses": 400,
    "maintenance_expenses": 150,
    "net_income": 1800,
    "hours_online": 7,
    "currency": "KES"
  },
  "this_week": { ... },
  "this_month": { ... }
}
```

### POST `/finance/expenses`
Log an expense

**Request:**
```json
{
  "type": "fuel_expense",
  "amount": 200,
  "category": "fuel",
  "description": "Fuel at Shell station",
  "receipt_image_url": "https://storage.../receipt.jpg",
  "device_timestamp": "2024-01-15T10:30:00Z"
}
```

### GET `/finance/transactions`
List transactions

**Query Parameters:**
- `type`: Filter by transaction type
- `from_date`: Start date
- `to_date`: End date
- `is_synced`: Filter unsynced transactions (for offline sync)

### POST `/finance/withdraw`
Withdraw earnings to Mobile Money

**Request:**
```json
{
  "amount": 1000,
  "method": "mpesa",
  "phone_number": "+254700000000"
}
```

### GET `/finance/lease-progress`
Get motorcycle lease/ownership progress

**Response:**
```json
{
  "ownership_status": "leasing",
  "lease_company": "Boda Lease Kenya Ltd",
  "total_amount": 120000,
  "paid_amount": 75000,
  "remaining_payments": 9,
  "monthly_payment": 5000,
  "next_payment_date": "2024-02-01",
  "progress_percentage": 62.5
}
```

---

## Metrics Module (`/metrics`)

### GET `/metrics/safety-score`
Get rider's safety score

**Response:**
```json
{
  "current_score": 87.5,
  "previous_score": 85.0,
  "score_change": 2.5,
  "risk_level": "low",
  "total_rides": 156,
  "incident_count": 2,
  "compliment_count": 23,
  "badges": [
    {
      "id": "safe_rider_100",
      "name": "Century Safe Rider",
      "icon": "🛡️",
      "earned_at": "2024-01-10"
    }
  ],
  "recommendations": [
    "Excellent work! Maintain your safe driving habits."
  ]
}
```

### GET `/metrics/performance-history`
Get performance history (chart data)

### POST `/metrics/events`
Log a performance event

**Request:**
```json
{
  "event_type": "safe_ride_completed",
  "ride_id": "uuid",
  "speed_at_event": 45,
  "location": {
    "latitude": -1.2921,
    "longitude": 36.8219
  }
}
```

### GET `/metrics/badges`
List all available badges and earned ones

---

## Riders Module (`/riders`)

### GET `/riders/nearby`
Find nearby riders (for dispatch)

**Query Parameters:**
- `latitude`: User's latitude
- `longitude`: User's longitude
- `radius_km`: Search radius (default: 5)
- `limit`: Max results (default: 20)

**Response:**
```json
{
  "riders": [
    {
      "id": "uuid",
      "distance_km": 0.5,
      "eta_minutes": 3,
      "rating_average": 4.8,
      "motorcycle_plate": "KCA 123X",
      "is_online": true
    }
  ]
}
```

### GET `/riders/:id/profile`
Get rider public profile

### PUT `/riders/:id/profile`
Update rider profile

### GET `/riders/:id/availability`
Get rider availability status

### PUT `/riders/:id/availability`
Toggle rider online/offline status

---

## Passengers Module (`/passengers`)

### GET `/passengers/me`
Get current passenger profile

### PUT `/passengers/me`
Update passenger profile

### GET `/passengers/me/saved-addresses`
List saved addresses

### POST `/passengers/me/saved-addresses`
Save a new address

**Request:**
```json
{
  "label": "Home",
  "latitude": -1.2921,
  "longitude": 36.8219,
  "address": "Westlands, Nairobi"
}
```

### DELETE `/passengers/me/saved-addresses/:id`
Remove saved address

---

## WebSocket Events (Socket.io)

### Connection
```javascript
const socket = io('https://api.bodaplatform.io', {
  auth: { token: jwt_token }
});
```

### Rider Events

#### Join rider room
```javascript
socket.emit('rider:join', { riderId: 'uuid' });
```

#### Update location (real-time tracking)
```javascript
socket.emit('rider:location', {
  latitude: -1.2921,
  longitude: 36.8219,
  speed_kmh: 45,
  heading: 180,
  timestamp: Date.now()
});
```

#### Listen for ride requests
```javascript
socket.on('rider:ride_request', (ride) => {
  // Show incoming ride request
});
```

#### Accept ride
```javascript
socket.emit('rider:accept_ride', { rideId: 'uuid' });
```

#### Update ride status
```javascript
socket.emit('rider:update_status', {
  rideId: 'uuid',
  status: 'arrived'
});
```

### Passenger Events

#### Join passenger room
```javascript
socket.emit('passenger:join', { passengerId: 'uuid' });
```

#### Listen for driver assignment
```javascript
socket.on('passenger:driver_found', (rider) => {
  // Show assigned driver details
});
```

#### Track driver location
```javascript
socket.on('passenger:driver_location', (location) => {
  // Update map with driver position
});
```

#### Ride status updates
```javascript
socket.on('passenger:ride_status', (status) => {
  // Update UI: arriving, arrived, in_transit, completed
});
```

### SOS Emergency Events

#### Trigger SOS
```javascript
socket.emit('sos:trigger', {
  userId: 'uuid',
  rideId: 'uuid',
  latitude: -1.2921,
  longitude: 36.8219,
  event_type: 'manual_trigger'
});
```

#### Receive SOS alerts (admin/fleet manager)
```javascript
socket.on('sos:alert', (alert) => {
  // Show emergency alert on dashboard
});
```

### Admin/Fleet Manager Events

#### Join admin room
```javascript
socket.emit('admin:join');
```

#### Listen for system-wide events
```javascript
socket.on('admin:ride_created', (ride) => { });
socket.on('admin:ride_completed', (ride) => { });
socket.on('admin:rider_went_offline', (rider) => { });
socket.on('admin:sos_triggered', (sos) => { });
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "RIDE_NOT_FOUND",
    "message": "The requested ride does not exist",
    "details": {
      "ride_id": "invalid_uuid"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., ride already accepted) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service outage |

---

## Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Ride requests | 5 requests | 1 minute |
| Location updates | 60 requests | 1 minute |
| General API | 100 requests | 1 minute |

Rate limit headers included in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312200
```

---

## Versioning

API version is included in the URL path: `/v1/`

Deprecation policy:
- Versions supported for minimum 12 months
- Deprecation warnings via response headers:
  ```
  Deprecation: true
  Sunset: Sat, 01 Jan 2025 00:00:00 GMT
  ```

---

## Webhooks (for third-party integrations)

### Available Webhook Events

- `ride.completed`
- `payment.received`
- `payment.failed`
- `rider.safety_score_updated`
- `sos.triggered`

### Webhook Payload Example

```json
{
  "id": "webhook_event_uuid",
  "event": "ride.completed",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "ride_id": "ride_uuid",
    "passenger_id": "passenger_uuid",
    "rider_id": "rider_uuid",
    "total_fare": 350,
    "distance_km": 8.5,
    "completed_at": "2024-01-15T10:25:00Z"
  }
}
```

### Webhook Signature

All webhooks include signature header:
```
X-Boda-Signature: sha256=abc123...
```

Verify using:
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

*API Documentation v1.0 - Last Updated: January 2024*
