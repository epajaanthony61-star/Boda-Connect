# Boda Platform - Open-Source Modular Architecture

## Overview

This document outlines the modular architecture designed for the Boda Boda platform, enabling third-party developers to extend functionality through plugins while maintaining core system integrity.

## Core Design Principles

1. **Modularity**: Clear separation between core platform and extensible modules
2. **Offline-First**: Built for East African connectivity challenges
3. **Localization**: Multi-country support (Kenya, Uganda, Rwanda) with configurable parameters
4. **Extensibility**: Plugin system for payment providers, map services, and custom features
5. **Security**: Role-based access control with audit logging

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────┬──────────────────┬────────────────────────────┤
│   Rider App     │  Passenger App   │    Web Admin Dashboard     │
│  (React Native) │  (React Native)  │      (React + Vite)        │
└────────┬────────┴────────┬─────────┴─────────────┬──────────────┘
         │                 │                       │
         └─────────────────┼───────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY                                 │
│              (Rate Limiting, Auth, Logging)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    CORE SERVICES LAYER                           │
├─────────────┬─────────────┬──────────────┬──────────────────────┤
│   Auth      │    Rides    │   Finance    │    Metrics & Safety  │
│   Service   │   Service   │   Service    │       Service        │
└─────────────┴─────────────┴──────────────┴──────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   PLUGIN SYSTEM LAYER                            │
├─────────────┬─────────────┬──────────────┬──────────────────────┤
│   Payment   │    Maps     │   SMS/OTP    │    Analytics         │
│   Plugins   │   Plugins   │   Plugins    │    Plugins           │
└─────────────┴─────────────┴──────────────┴──────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     DATA LAYER                                   │
├─────────────────────┬───────────────────────────────────────────┤
│   PostgreSQL+PostGIS│         Redis Cache & Pub/Sub             │
└─────────────────────┴───────────────────────────────────────────┘
```

---

## Plugin System Architecture

### Plugin Interface Specification

All plugins must implement the following interface:

```typescript
// backend/src/plugins/types.ts

export interface Plugin {
  // Metadata
  name: string;
  version: string;
  description: string;
  author: string;
  
  // Lifecycle hooks
  initialize(config: PluginConfig): Promise<void>;
  shutdown(): Promise<void>;
  
  // Health check
  isHealthy(): Promise<boolean>;
  
  // Configuration schema (JSON Schema format)
  configSchema: JSONSchema7;
}

export interface PaymentPlugin extends Plugin {
  // Payment processing
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  refundPayment(transactionId: string): Promise<RefundResponse>;
  
  // Mobile Money specific
  initiateMobileMoneyPush(phone: string, amount: number): Promise<MMSResponse>;
  checkTransactionStatus(transactionId: string): Promise<MMStatusResponse>;
}

export interface MapsPlugin extends Plugin {
  // Geocoding
  geocodeAddress(address: string): Promise<GeocodeResult[]>;
  reverseGeocode(lat: number, lon: number): Promise<AddressResult>;
  
  // Routing
  calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult>;
  calculateDistanceMatrix(origins: Coordinates[], destinations: Coordinates[]): Promise<DistanceMatrixResult>;
  
  // Map tiles (for offline caching)
  getMapTileUrl(x: number, y: number, zoom: number): string;
}

export interface SMSPlugin extends Plugin {
  sendSMS(phone: string, message: string): Promise<SMSResponse>;
  verifyOTP(phone: string, code: string): Promise<boolean>;
  generateOTP(phone: string): Promise<string>;
}
```

### Plugin Registration

Plugins are registered in the database and loaded dynamically:

```sql
-- From DATABASE_SCHEMA.sql
CREATE TABLE installed_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_name VARCHAR(100) UNIQUE NOT NULL,
    plugin_version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config_json JSONB DEFAULT '{}'::jsonb,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Plugin Loading Mechanism

```typescript
// backend/src/plugins/pluginManager.ts

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Plugin, PaymentPlugin, MapsPlugin } from './types';

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private pluginConfigs: Map<string, any> = new Map();

  async loadAllPlugins(): Promise<void> {
    // Load plugins from database
    const installedPlugins = await this.getInstalledPluginsFromDB();
    
    for (const pluginInfo of installedPlugins) {
      try {
        await this.loadPlugin(pluginInfo.name, pluginInfo.config_json);
        console.log(`✓ Plugin loaded: ${pluginInfo.name} v${pluginInfo.plugin_version}`);
      } catch (error) {
        console.error(`✗ Failed to load plugin ${pluginInfo.name}:`, error);
      }
    }
  }

  async loadPlugin(name: string, config: any): Promise<void> {
    // Dynamically import plugin module
    const pluginModule = await import(`../plugins/${name}/index.js`);
    const PluginClass = pluginModule.default;
    
    const plugin: Plugin = new PluginClass();
    await plugin.initialize(config);
    
    this.plugins.set(name, plugin);
    this.pluginConfigs.set(name, config);
  }

  getPlugin<T extends Plugin>(name: string): T | undefined {
    return this.plugins.get(name) as T;
  }

  async shutdown(): Promise<void> {
    for (const [, plugin] of this.plugins) {
      await plugin.shutdown();
    }
  }
}

export const pluginManager = new PluginManager();
```

---

## Available Plugin Categories

### 1. Payment Provider Plugins

#### M-Pesa Plugin (Kenya)
```typescript
// backend/src/plugins/mpesa/index.ts

import { PaymentPlugin } from '../types';

export default class MPesaPlugin implements PaymentPlugin {
  name = 'mpesa_integration';
  version = '1.0.0';
  description = 'Safaricom M-Pesa mobile money integration';
  author = 'Boda Platform';

  async initialize(config: any): Promise<void> {
    // Initialize M-Pesa Daraja API client
    // Store consumer key, secret, etc.
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Implement STK Push for M-Pesa
  }

  async initiateMobileMoneyPush(phone: string, amount: number): Promise<MMSResponse> {
    // M-Pesa Lipa Na M-Pesa Online
  }

  // ... other required methods
}
```

#### Airtel Money Plugin (Uganda/Kenya)
```typescript
// backend/src/plugins/airtel-money/index.ts

import { PaymentPlugin } from '../types';

export default class AirtelMoneyPlugin implements PaymentPlugin {
  name = 'airtel_money_integration';
  version = '1.0.0';
  description = 'Airtel Money mobile money integration';
  author = 'Boda Platform';

  // Implementation for Airtel Money API
}
```

#### Tigo Pesa Plugin (Rwanda/Tanzania)
```typescript
// backend/src/plugins/tigo-pesa/index.ts
// Similar structure for Tigo Pesa
```

### 2. Map Provider Plugins

#### Google Maps Plugin
```typescript
// backend/src/plugins/google-maps/index.ts

import { MapsPlugin } from '../types';

export default class GoogleMapsPlugin implements MapsPlugin {
  name = 'google_maps_provider';
  version = '1.0.0';
  description = 'Google Maps API integration';
  author = 'Boda Platform';

  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    // Call Google Geocoding API
  }

  async calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    // Call Google Directions API
    // Optimize for motorcycle routes (avoid highways if preferred)
  }

  getMapTileUrl(x: number, y: number, zoom: number): string {
    // Return Google Maps tile URL
  }
}
```

#### OpenStreetMap Plugin (Free Alternative)
```typescript
// backend/src/plugins/osm/index.ts

import { MapsPlugin } from '../types';

export default class OSMPlugin implements MapsPlugin {
  name = 'openstreetmap_provider';
  version = '1.0.0';
  description = 'OpenStreetMap with OSRM routing (free alternative)';
  author = 'Boda Platform';

  // Implementation using Nominatim for geocoding
  // OSRM for routing
}
```

### 3. SMS/OTP Plugins

#### Africa's Talking SMS Plugin
```typescript
// backend/src/plugins/africas-talking/index.ts

import { SMSPlugin } from '../types';

export default class AfricasTalkingPlugin implements SMSPlugin {
  name = 'africas_talking_sms';
  version = '1.0.0';
  description = 'Africa\'s Talking SMS gateway for East Africa';
  author = 'Boda Platform';

  async sendSMS(phone: string, message: string): Promise<SMSResponse> {
    // Send via Africa's Talking API
    // Supports Kenya, Uganda, Rwanda, Tanzania
  }
}
```

#### Twilio Plugin (International)
```typescript
// backend/src/plugins/twilio/index.ts
// For international operations
```

---

## Creating a Custom Plugin

### Step 1: Create Plugin Directory Structure

```
backend/src/plugins/my-custom-plugin/
├── index.ts          # Main plugin implementation
├── types.ts          # Plugin-specific types
├── config.schema.json # JSON Schema for configuration
├── README.md         # Documentation
└── tests/
    └── index.test.ts
```

### Step 2: Implement Plugin Interface

```typescript
// backend/src/plugins/my-custom-plugin/index.ts

import { Plugin } from '../types';

export default class MyCustomPlugin implements Plugin {
  name = 'my_custom_plugin';
  version = '1.0.0';
  description = 'Description of what your plugin does';
  author = 'Your Name';

  configSchema = {
    type: 'object',
    required: ['apiKey'],
    properties: {
      apiKey: { type: 'string', description: 'API key for the service' },
      sandboxMode: { type: 'boolean', default: true },
    },
  };

  async initialize(config: any): Promise<void> {
    // Validate config against schema
    // Initialize connections, clients, etc.
    console.log(`${this.name} initialized`);
  }

  async shutdown(): Promise<void> {
    // Clean up resources
    console.log(`${this.name} shut down`);
  }

  async isHealthy(): Promise<boolean> {
    // Check if plugin is functioning
    return true;
  }
}
```

### Step 3: Register Plugin

Add to database:

```sql
INSERT INTO installed_plugins (plugin_name, plugin_version, config_json)
VALUES ('my_custom_plugin', '1.0.0', '{"apiKey": "your-key", "sandboxMode": true}');
```

### Step 4: Test Plugin

```bash
npm test -- plugins/my-custom-plugin
```

---

## Offline-First Architecture

### Mobile App Offline Strategy

```typescript
// mobile/src/utils/offlineSync.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

class OfflineSyncManager {
  private syncQueue: string[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.setupNetworkListener();
  }

  private async setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Sync when coming back online
      if (!wasOnline && this.isOnline) {
        this.syncPendingOperations();
      }
    });
  }

  async queueOperation(operation: any): Promise<void> {
    if (this.isOnline) {
      // Execute immediately
      await this.executeOperation(operation);
    } else {
      // Queue for later
      this.syncQueue.push(JSON.stringify(operation));
      await this.saveQueue();
    }
  }

  private async saveQueue(): Promise<void> {
    await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }

  private async syncPendingOperations(): Promise<void> {
    while (this.syncQueue.length > 0) {
      const operation = JSON.parse(this.syncQueue[0]);
      try {
        await this.executeOperation(operation);
        this.syncQueue.shift(); // Remove successful operation
      } catch (error) {
        console.error('Sync failed, will retry:', error);
        break; // Stop on first failure
      }
    }
    await this.saveQueue();
  }

  private async executeOperation(operation: any): Promise<void> {
    // Execute the actual API call
  }
}

export const offlineSyncManager = new OfflineSyncManager();
```

### Database Offline Support

```sql
-- Financial transactions table supports offline logging
CREATE TABLE financial_transactions (
    -- ... other columns
    is_synced BOOLEAN DEFAULT TRUE,
    device_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Index for quick sync queries
    CREATE INDEX idx_transactions_synced 
    ON financial_transactions(is_synced) 
    WHERE is_synced = FALSE;
);
```

---

## Low-Bandwidth Optimizations

### 1. Data Compression

```typescript
// Compress GPS tracking data before sending
function compressGPSTrack(points: GPSPoint[]): CompressedTrack {
  // Use delta encoding for coordinates
  // Reduce precision based on zoom level
  // Batch multiple points together
}
```

### 2. Selective Sync

```typescript
// Only sync critical data on poor connections
async function selectiveSync(connectionQuality: 'poor' | 'fair' | 'good') {
  if (connectionQuality === 'poor') {
    // Sync only ride completions and payments
    await syncCriticalData();
  } else if (connectionQuality === 'fair') {
    // Sync + location updates
    await syncLocationUpdates();
  } else {
    // Full sync
    await fullSync();
  }
}
```

### 3. Image Optimization

```typescript
// Compress receipt images before upload
async function compressReceiptImage(uri: string): Promise<string> {
  // Resize to max 1024x1024
  // JPEG quality 60%
  // Convert to WebP if supported
}
```

---

## Security Considerations

### Plugin Sandboxing

```typescript
// Plugins run with limited permissions
interface PluginPermissions {
  canAccessDatabase: boolean;
  canMakeHTTPRequests: boolean;
  canAccessFileSystem: boolean;
  canSendSMS: boolean;
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
}

// Enforce limits
class SandboxedPlugin {
  private limits: PluginPermissions;
  
  async executeWithLimits(operation: () => Promise<void>): Promise<void> {
    const timeout = setTimeout(() => {
      throw new Error('Plugin execution timeout');
    }, this.limits.maxExecutionTimeMs);
    
    try {
      await operation();
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

### Audit Logging

```typescript
// Log all plugin actions
async function logPluginAction(
  pluginName: string,
  action: string,
  userId: string,
  metadata: any
): Promise<void> {
  await db.query(`
    INSERT INTO plugin_audit_logs 
    (plugin_name, action, user_id, metadata, timestamp)
    VALUES ($1, $2, $3, $4, NOW())
  `, [pluginName, action, userId, JSON.stringify(metadata)]);
}
```

---

## Testing Guidelines

### Unit Tests

```typescript
// plugins/my-plugin/tests/index.test.ts

import MyPlugin from '../index';

describe('MyPlugin', () => {
  let plugin: MyPlugin;

  beforeEach(async () => {
    plugin = new MyPlugin();
    await plugin.initialize({ apiKey: 'test-key' });
  });

  afterEach(async () => {
    await plugin.shutdown();
  });

  it('should process payment correctly', async () => {
    const result = await plugin.processPayment({
      amount: 100,
      currency: 'KES',
      phone: '+254700000000',
    });
    
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// Test plugin with real API (sandbox mode)
describe('MPesaPlugin Integration', () => {
  it('should complete STK push in sandbox', async () => {
    // Test with Safaricom sandbox environment
  });
});
```

---

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY plugins/ ./plugins/

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Environment Variables

```bash
# .env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/boda_platform
REDIS_URL=redis://localhost:6379

# Plugin configurations
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=xxx
MPESA_SHORTCODE=174379
MPESA_PASSKEY=xxx

GOOGLE_MAPS_API_KEY=xxx

AFRICAS_TALKING_USERNAME=xxx
AFRICAS_TALKING_API_KEY=xxx

# Feature flags
ENABLE_PLUGINS=true
PLUGIN_SANDBOX_MODE=true
```

---

## Contributing Guidelines

1. **Fork the repository**
2. **Create your plugin** following the interface specification
3. **Write comprehensive tests** (minimum 80% coverage)
4. **Document your plugin** with usage examples
5. **Submit a pull request** with:
   - Plugin code
   - Tests
   - Documentation
   - Example configuration

### Code Review Checklist

- [ ] Implements all required interface methods
- [ ] Includes error handling
- [ ] Has proper TypeScript types
- [ ] Contains unit tests
- [ ] Documented with JSDoc comments
- [ ] Follows ESLint rules
- [ ] No hardcoded secrets
- [ ] Works in sandbox/test mode

---

## Support & Community

- **Documentation**: https://docs.bodaplatform.io
- **Discord**: https://discord.gg/bodaplatform
- **GitHub Issues**: https://github.com/bodaplatform/boda-platform/issues
- **Email**: developers@bodaplatform.io

## License

MIT License - See LICENSE file for details

---

*Built with ❤️ for East Africa's Boda Boda community*
