-- Boda Platform Database Schema
-- PostgreSQL with PostGIS extension for geospatial tracking
-- Designed for East African Boda Boda operations

-- Enable PostGIS extension for geo-location features
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    country_code VARCHAR(5) DEFAULT '+254', -- Kenya default, supports +256 (Uganda), +250 (Rwanda)
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('rider', 'passenger', 'fleet_manager', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast phone number lookups during authentication
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- RIDER PROFILES & VEHICLES
-- ============================================
CREATE TABLE riders (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE,
    license_expiry DATE,
    motorcycle_registration VARCHAR(50) UNIQUE,
    motorcycle_model VARCHAR(100),
    motorcycle_color VARCHAR(50),
    motorcycle_plate_number VARCHAR(20) UNIQUE,
    
    -- Financial tracking for lease/ownership
    ownership_status VARCHAR(30) DEFAULT 'leasing' CHECK (ownership_status IN ('owned', 'leasing', 'renting')),
    lease_company VARCHAR(100),
    lease_amount DECIMAL(12, 2),
    lease_remaining_payments INTEGER,
    
    -- Performance metrics
    safety_score DECIMAL(4, 2) DEFAULT 100.00 CHECK (safety_score BETWEEN 0 AND 100),
    total_rides INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    rating_average DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating_average BETWEEN 0 AND 5),
    total_ratings INTEGER DEFAULT 0,
    
    -- Badges earned (stored as JSON for flexibility)
    badges JSONB DEFAULT '[]'::jsonb,
    
    -- Emergency contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Geospatial index for finding nearby riders
CREATE INDEX idx_riders_location ON riders USING GIST (
    -- This will be updated in real-time via Socket.io
    -- Storing last known location for quick queries
    ST_SetSRID(ST_MakePoint(0, 0), 4326) -- Placeholder, updated dynamically
);

CREATE INDEX idx_riders_safety_score ON riders(safety_score);
CREATE INDEX idx_riders_rating ON riders(rating_average);

-- ============================================
-- PASSENGER PROFILES
-- ============================================
CREATE TABLE passengers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    saved_addresses JSONB DEFAULT '[]'::jsonb, -- Array of {label, latitude, longitude, address}
    preferred_payment_method VARCHAR(50) DEFAULT 'mpesa', -- mpesa, airtel_money, cash, card
    total_rides INTEGER DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating_average BETWEEN 0 AND 5),
    total_ratings INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RIDES & TRIPS
-- ============================================
CREATE TYPE ride_status AS ENUM (
    'requested',
    'accepted',
    'arriving',
    'arrived',
    'in_transit',
    'completed',
    'cancelled_by_passenger',
    'cancelled_by_rider',
    'cancelled_by_system'
);

CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES passengers(id),
    rider_id UUID REFERENCES riders(id),
    
    -- Trip details
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT,
    
    dropoff_latitude DECIMAL(10, 8) NOT NULL,
    dropoff_longitude DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT,
    
    -- Distance & duration (calculated using PostGIS)
    distance_km DECIMAL(8, 2),
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Fare calculation
    base_fare DECIMAL(10, 2) NOT NULL,
    distance_fare DECIMAL(10, 2) NOT NULL,
    surge_multiplier DECIMAL(4, 2) DEFAULT 1.00,
    terrain_surcharge DECIMAL(10, 2) DEFAULT 0.00, -- Extra for difficult terrain/rural areas
    total_fare DECIMAL(10, 2) NOT NULL,
    platform_commission DECIMAL(10, 2) DEFAULT 0.00, -- Platform fee (e.g., 10%)
    rider_earnings DECIMAL(10, 2) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(50) DEFAULT 'mpesa',
    payment_status VARCHAR(30) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_transaction_id VARCHAR(100),
    payment_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status tracking
    status ride_status DEFAULT 'requested',
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient ride queries
CREATE INDEX idx_rides_passenger ON rides(passenger_id);
CREATE INDEX idx_rides_rider ON rides(rider_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_requested_at ON rides(requested_at);
CREATE INDEX idx_rides_location ON rides USING GIST (
    ST_SetSRID(ST_MakePoint(pickup_longitude, pickup_latitude), 4326)
);

-- Ride trajectory tracking (for safety and dispute resolution)
CREATE TABLE ride_trajectory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed_kmh DECIMAL(6, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Geospatial index for trajectory replay
CREATE INDEX idx_trajectory_ride ON ride_trajectory(ride_id);
CREATE INDEX idx_trajectory_location ON ride_trajectory USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
CREATE INDEX idx_trajectory_timestamp ON ride_trajectory(timestamp);

-- ============================================
-- FINANCIAL LEDGER (Rider Expenses & Earnings)
-- ============================================
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES riders(id),
    ride_id UUID REFERENCES rides(id),
    
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'ride_earning',
        'fuel_expense',
        'maintenance_expense',
        'lease_payment',
        'insurance_payment',
        'platform_withdrawal',
        'mobile_money_deposit',
        'bonus',
        'penalty'
    )),
    
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES', -- Supports KES, UGX, RWF
    
    -- Mobile Money integration
    payment_provider VARCHAR(50), -- mpesa, airtel_money, tigo_pesa
    provider_transaction_id VARCHAR(100),
    
    -- Expense categorization
    category VARCHAR(50), -- e.g., 'fuel', 'oil_change', 'tire_replacement'
    description TEXT,
    receipt_image_url TEXT, -- Photo receipt for expenses
    
    -- Offline sync support
    is_synced BOOLEAN DEFAULT TRUE, -- FALSE if logged offline, pending sync
    device_timestamp TIMESTAMP WITH TIME ZONE, -- Client-side timestamp for offline logging
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_rider ON financial_transactions(rider_id);
CREATE INDEX idx_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON financial_transactions(created_at);
CREATE INDEX idx_transactions_synced ON financial_transactions(is_synced) WHERE is_synced = FALSE;

-- Daily summary for quick dashboard loading
CREATE TABLE rider_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES riders(id),
    date DATE NOT NULL,
    
    total_rides INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    total_expenses DECIMAL(12, 2) DEFAULT 0.00,
    fuel_expenses DECIMAL(12, 2) DEFAULT 0.00,
    maintenance_expenses DECIMAL(12, 2) DEFAULT 0.00,
    net_income DECIMAL(12, 2) DEFAULT 0.00,
    
    hours_online INTEGER DEFAULT 0,
    distance_covered_km DECIMAL(10, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(rider_id, date)
);

CREATE INDEX idx_daily_summary_rider_date ON rider_daily_summaries(rider_id, date);

-- ============================================
-- PERFORMANCE & SAFETY LOGS
-- ============================================
CREATE TABLE performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES riders(id),
    
    -- Event type
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'speeding_incident',
        'harsh_braking',
        'rapid_acceleration',
        'safe_ride_completed',
        'customer_compliment',
        'customer_complaint',
        'accident_reported',
        'sos_triggered',
        'route_deviation'
    )),
    
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    
    -- Location context
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    speed_at_event_kmh DECIMAL(6, 2),
    
    ride_id UUID REFERENCES rides(id),
    
    -- Impact on score
    score_impact DECIMAL(5, 2) DEFAULT 0.00, -- Negative for incidents, positive for good behavior
    
    is_resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_performance_rider ON performance_logs(rider_id);
CREATE INDEX idx_performance_type ON performance_logs(event_type);
CREATE INDEX idx_performance_created_at ON performance_logs(created_at);

-- ============================================
-- RATINGS & REVIEWS
-- ============================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    
    rating_value INTEGER NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
    review_text TEXT,
    
    -- Specific feedback tags (JSON array)
    tags JSONB DEFAULT '[]'::jsonb, -- e.g., ["safe_driving", "clean_motorcycle", "friendly"]
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ride_id, from_user_id)
);

CREATE INDEX idx_ratings_from_user ON ratings(from_user_id);
CREATE INDEX idx_ratings_to_user ON ratings(to_user_id);

-- ============================================
-- SOS EMERGENCY EVENTS
-- ============================================
CREATE TABLE sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    ride_id UUID REFERENCES rides(id),
    
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    event_type VARCHAR(50) DEFAULT 'manual_trigger' CHECK (event_type IN ('manual_trigger', 'automatic_crash_detection', 'route_deviation_alert')),
    description TEXT,
    
    -- Response tracking
    emergency_contacts_notified BOOLEAN DEFAULT FALSE,
    authorities_notified BOOLEAN DEFAULT FALSE,
    platform_notified BOOLEAN DEFAULT TRUE,
    
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sos_user ON sos_events(user_id);
CREATE INDEX idx_sos_created_at ON sos_events(created_at);

-- ============================================
-- PLUGIN SYSTEM (For extensibility)
-- ============================================
CREATE TABLE installed_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_name VARCHAR(100) UNIQUE NOT NULL,
    plugin_version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config_json JSONB DEFAULT '{}'::jsonb,
    
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON riders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passengers_updated_at BEFORE UPDATE ON passengers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate distance between two points (in km)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    ) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- INITIAL DATA: PLATFORM CONFIGURATION
-- ============================================
INSERT INTO installed_plugins (plugin_name, plugin_version, config_json) VALUES
('mpesa_integration', '1.0.0', '{"sandbox_mode": true, "consumer_key": "", "consumer_secret": ""}'),
('airtel_money_integration', '1.0.0', '{"sandbox_mode": true}'),
('google_maps_provider', '1.0.0', '{"api_key": ""}'),
('offline_sync_engine', '1.0.0', '{"sync_interval_seconds": 300}');

-- Comments documenting East African operational considerations
COMMENT ON TABLE financial_transactions IS 'Supports offline-first logging for areas with poor connectivity. Transactions are marked is_synced=FALSE until network is available.';
COMMENT ON TABLE riders IS 'Tracks lease ownership progress - critical for rider micro-entrepreneurship and financial inclusion.';
COMMENT ON TABLE performance_logs IS 'Safety scoring algorithm accounts for local road conditions and traffic patterns specific to East African urban areas.';
COMMENT ON TABLE rides IS 'Fare calculation includes terrain surcharge for rural/hilly areas common in regions like Kampala or Kigali.';
