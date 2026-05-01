# Listic — Architecture Documentation

> **AI-powered e-commerce product image generator** built with NestJS + Expo React Native.  
> Upload a product photo → Gemini AI generates 6 professional e-commerce images → sharp post-processes for platform compliance → stored on Azure Blob Storage.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Module Structure](#4-module-structure)
5. [Database Schema](#5-database-schema)
6. [Image Generation Pipeline](#6-image-generation-pipeline)
7. [Azure Blob Storage](#7-azure-blob-storage)
8. [Payment Flow (Razorpay)](#8-payment-flow-razorpay)
9. [Authentication & Security](#9-authentication--security)
10. [Platform Specifications](#10-platform-specifications)
11. [Admin Panel](#11-admin-panel)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Environment Variables](#13-environment-variables)
14. [Key Code Reference](#14-key-code-reference)

---

## 1. System Overview

```mermaid
graph TB
    subgraph Client["📱 Expo Mobile App"]
        UI[React Native UI]
        AuthStore[Auth Store - Zustand]
        API_Client[API Client - Axios]
    end

    subgraph Server["🖥️ NestJS API"]
        Auth[Auth Module]
        Images[Images Module]
        Payments[Payments Module]
        Storage[Storage Module]
        Platforms[Platforms Module]
        Admin[Admin Module]
    end

    subgraph AdminPanel["⚡ Admin Dashboard"]
        AdminUI[React + Vite + Tailwind]
    end

    subgraph External["☁️ External Services"]
        Gemini[Google Gemini AI<br/>gemini-2.5-flash-image]
        Azure[Azure Blob Storage<br/>2 Containers]
        Razorpay[Razorpay<br/>Payment Gateway]
        Neon[Neon Postgres<br/>Database]
    end

    UI --> API_Client
    API_Client -->|REST API| Auth
    API_Client -->|REST API| Images
    API_Client -->|REST API| Payments

    AdminUI -->|REST API + JWT| Admin
    AdminUI -->|REST API + JWT| Auth

    Images --> Gemini
    Images --> Storage
    Storage --> Azure
    Payments --> Razorpay
    Auth --> Neon
    Images --> Neon
    Payments --> Neon
    Admin --> Neon
```

---

## 2. Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | Expo ~52.0, React Native, Expo Router ~4.0 |
| Admin Panel | React 18, Vite 5, Tailwind CSS 3, Recharts, React Router 6 |
| Backend     | NestJS 10.3 (CommonJS), TypeScript     |
| Database    | PostgreSQL (Neon free tier), TypeORM    |
| AI          | Google Gemini 2.5 Flash Image (`@google/generative-ai`) |
| Storage     | Azure Blob Storage (per-container SAS URLs) |
| Payments    | Razorpay SDK (INR)                     |
| Image Processing | sharp ^0.33                       |
| Auth        | JWT (passport-jwt), bcrypt (12 rounds) |
| State Mgmt  | Zustand (auth-store)                   |

---

## 3. High-Level Architecture

```mermaid
flowchart LR
    subgraph Mobile["Expo Mobile App"]
        direction TB
        Landing["Landing Page"]
        AuthPages["Login / Register"]
        Home["Home - Projects List"]
        Upload["Upload Product Photo"]
        Generate["Generate Images"]
        Results["View Results"]
        Purchase["Purchase Credits"]
        History["Payment History"]
    end

    subgraph API["NestJS API :3000"]
        direction TB
        AuthCtrl["POST /api/auth/register\nPOST /api/auth/login"]
        ImagesCtrl["POST /api/images/projects\nPOST /api/images/projects/:id/generate\nGET  /api/images/projects/:id\nGET  /api/images/projects"]
        PayCtrl["GET  /api/payments/tiers\nPOST /api/payments/create-order\nPOST /api/payments/verify\nGET  /api/payments/history\nPOST /api/payments/webhook"]
        AdminCtrl["GET  /api/admin/dashboard\nGET  /api/admin/activity\nGET  /api/admin/revenue\nGET  /api/admin/users\nPATCH /api/admin/users/:id/credits\nPATCH /api/admin/users/:id/admin"]
    end

    Mobile -->|HTTP + JWT| API
    AdminPanel -->|HTTP + JWT| API
```

---

## 4. Module Structure

```
apps/
├── admin/                       # Admin Dashboard (React + Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json              # Vercel SPA rewrites
│   └── src/
│       ├── main.tsx             # React entry point
│       ├── App.tsx              # Routes + ProtectedRoute guard
│       ├── api.ts               # Axios client with JWT interceptors
│       ├── components/
│       │   ├── Layout.tsx       # Sidebar nav + outlet
│       │   └── StatCard.tsx     # Reusable stat card
│       └── pages/
│           ├── Login.tsx        # Admin login
│           ├── Dashboard.tsx    # Overview stats + recent activity
│           ├── Users.tsx        # Paginated user list + search
│           ├── UserDetail.tsx   # User detail, credits, admin toggle
│           └── Revenue.tsx      # Charts, tier breakdown, payments
│
├── api/                         # NestJS Backend
│   ├── make-admin.js            # One-off script to promote user to admin
│   └── src/
│       ├── main.ts              # Bootstrap, CORS, rawBody, JWT guard
│       ├── app.module.ts        # Root module, TypeORM config
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.service.ts  # Register, login, JWT sign
│       │   ├── auth.controller.ts
│       │   ├── jwt.strategy.ts  # Passport JWT strategy
│       │   ├── jwt-auth.guard.ts
│       │   └── admin.guard.ts   # AdminGuard — checks user.isAdmin
│       ├── users/
│       │   ├── user.entity.ts   # Users table
│       │   ├── users.service.ts # CRUD + credit mgmt
│       │   └── users.module.ts
│       ├── admin/
│       │   ├── admin.module.ts
│       │   ├── admin.controller.ts  # Dashboard, users, revenue endpoints
│       │   ├── admin.service.ts     # Stats, analytics, user management
│       │   └── admin.dto.ts         # Validated DTOs for admin inputs
│       ├── images/
│       │   ├── images.service.ts          # Orchestration
│       │   ├── imagen.service.ts          # Gemini SDK
│       │   ├── image-processing.service.ts # sharp pipeline (trim+resize+pad)
│       │   ├── images.controller.ts
│       │   └── entities/
│       │       └── image-project.entity.ts # Projects + Generated Images
│       ├── storage/
│       │   ├── storage.service.ts  # Azure Blob / local filesystem
│       │   └── storage.module.ts
│       ├── platforms/
│       │   ├── platform-specs.ts   # 5 platform dimensions/rules
│       │   └── platforms.service.ts
│       └── payments/
│           ├── payments.service.ts    # Razorpay orders, verify, webhook
│           ├── payments.controller.ts # All payment endpoints
│           ├── payment.entity.ts      # Payments table
│           └── payments.dto.ts
│
└── mobile/                      # Expo React Native
    ├── app/
    │   ├── _layout.tsx          # Route guard, navigation
    │   ├── index.tsx            # Landing page
    │   ├── (auth)/
    │   │   ├── login.tsx
    │   │   └── register.tsx
    │   ├── (tabs)/
    │   │   ├── home.tsx
    │   │   └── settings.tsx
    │   ├── upload.tsx
    │   ├── generate/[id].tsx
    │   ├── results/[id].tsx
    │   ├── purchase.tsx
    │   └── payment-history.tsx
    └── src/
        ├── api.ts               # Axios client
        ├── stores/auth-store.ts # Zustand auth state
        └── theme.ts             # Gemini dark theme colors
```

---

## 5. Database Schema

```mermaid
erDiagram
    users {
        uuid id PK
        varchar email UK
        varchar passwordHash
        varchar name
        int creditsRemaining
        boolean isAdmin
        timestamp createdAt
        timestamp updatedAt
    }

    image_projects {
        uuid id PK
        uuid userId FK
        varchar originalImageUrl
        varchar productName
        varchar productCategory
        boolean isWearable
        text targetPlatforms
        varchar status
        varchar errorMessage
        timestamp createdAt
        timestamp updatedAt
    }

    generated_images {
        uuid id PK
        uuid projectId FK
        varchar imageUrl
        varchar imageType
        varchar platform
        int width
        int height
        text prompt
        timestamp createdAt
    }

    payments {
        uuid id PK
        uuid userId FK
        varchar razorpayOrderId
        varchar razorpayPaymentId UK
        varchar tierSlug
        varchar tierName
        int credits
        int amountPaise
        varchar currency
        varchar status
        timestamp createdAt
    }

    users ||--o{ image_projects : "has many"
    users ||--o{ payments : "has many"
    image_projects ||--o{ generated_images : "has many"
```

### Entity Relationships

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `users` | `creditsRemaining`, `isAdmin` | Decremented on generate, incremented on purchase. `isAdmin` gates admin API access |
| `image_projects` | `status`: pending → processing → completed/failed | Tracks generation lifecycle |
| `generated_images` | `imageType`: main, lifestyle, closeup, scale, angle, model | 6 images per project |
| `payments` | `razorpayPaymentId` (UNIQUE) | Idempotency key for double-payment protection |

---

## 6. Image Generation Pipeline

```mermaid
sequenceDiagram
    participant User as 📱 Mobile App
    participant API as 🖥️ NestJS API
    participant DB as 🗄️ Neon Postgres
    participant Azure as ☁️ Azure Blob Storage
    participant Gemini as 🤖 Gemini AI
    participant Sharp as 📐 sharp

    User->>API: POST /images/projects (upload photo)
    API->>Azure: uploadFile() → originals container
    Azure-->>API: original image URL
    API->>DB: Save ImageProject (status: pending)
    API-->>User: 201 project created

    User->>API: POST /images/projects/:id/generate
    API->>DB: Deduct 1 credit from user
    API-->>User: 200 (processing started)
    
    Note over API: Fire-and-forget background loop

    loop For each of 6 image types
        API->>Azure: resolveExternalUrl() → download blob
        Azure-->>API: base64 data URI
        API->>Gemini: generateContent(prompt + image)
        Gemini-->>API: base64 generated image
        API->>Azure: uploadFromUrl() → generated container
        Azure-->>API: raw image URL
        API->>Azure: resolveExternalUrl() → download raw
        Azure-->>API: base64 of raw image
        API->>Sharp: trim whitespace + resize to 96% fill + pad
        Sharp-->>API: platform-compliant buffer (narrow borders)
        API->>Azure: uploadBuffer() → generated container
        Azure-->>API: final processed URL
        API->>DB: Save GeneratedImage entity
    end

    API->>DB: Update project status → completed
    User->>API: GET /images/projects/:id (poll)
    API-->>User: Project with 6 generated images
```

### Image Types Generated

| Type | Description | When |
|------|-------------|------|
| `main` | White background studio shot, 85% product fill | Always |
| `lifestyle` | Product in aspirational lifestyle setting | Always |
| `closeup` | Extreme close-up showing texture and detail | Always |
| `scale` | Size reference comparison shot | Always |
| `angle` | 45-degree angle showing depth and dimension | Always |
| `model` | Clothing on model (neck down, no face) | Wearable items only |

### Retry Strategy

Rate-limited (`429`) Gemini API calls use exponential backoff:

```
Attempt 0 → immediate
Attempt 1 → wait 10s
Attempt 2 → wait 20s
Attempt 3 → wait 30s
Attempt 4 → wait 40s
Attempt 5 → fail
```

---

## 7. Azure Blob Storage

### Dual-Container Architecture

```mermaid
flowchart TB
    subgraph Azure["Azure Blob Storage (listic.blob.core.windows.net)"]
        C1["📦 user-uploaded-product-images<br/>(originals container)"]
        C2["📦 ai-generated-product-images<br/>(generated container)"]
    end

    Upload["User uploads photo"] -->|uploadFile bucket=originals| C1
    GenRaw["Gemini AI output"] -->|uploadFromUrl bucket=generated| C2
    Processed["sharp processed image"] -->|uploadBuffer bucket=generated| C2

    C1 -->|resolveExternalUrl| DataURI1["base64 data URI<br/>→ sent to Gemini"]
    C2 -->|resolveExternalUrl| DataURI2["base64 data URI<br/>→ post-processing input"]
```

### Authentication: Per-Container SAS URLs

Azure uses **container-level SAS (Shared Access Signature)** tokens — not account-level keys. Each container has its own SAS URL:

```
AZURE_SAS_URL_ORIGINALS = https://listic.blob.core.windows.net/user-uploaded-product-images?sp=racwdl&st=...&sig=...
AZURE_SAS_URL_GENERATED = https://listic.blob.core.windows.net/ai-generated-product-images?sp=racwdl&st=...&sig=...
```

The `ContainerClient` is initialized directly from the full SAS URL — no `BlobServiceClient` or account keys needed.

### Blob Naming Convention

```
originals/{userId}/{uuid}.{ext}          ← user upload
generated/{userId}/{projectId}/{uuid}.png ← raw AI output
processed/{userId}/{projectId}/{uuid}.png ← post-processed final
```

### Key Code: Storage Service

```typescript
// storage.service.ts — Constructor initializes per-container clients
constructor(private readonly config: ConfigService) {
  const originalsSasUrl = this.config.get<string>('AZURE_SAS_URL_ORIGINALS', '');
  const generatedSasUrl = this.config.get<string>('AZURE_SAS_URL_GENERATED', '');

  if (originalsSasUrl && generatedSasUrl) {
    this.containerClients.originals = new ContainerClient(originalsSasUrl);
    this.containerClients.generated = new ContainerClient(generatedSasUrl);
    this.useLocal = false;
  } else {
    this.useLocal = true; // Fallback to local filesystem
  }
}

// Upload buffer (post-processed image) to Azure
async uploadBuffer(buffer: Buffer, prefix: string, contentType = 'image/png',
    bucket: StorageBucket = 'generated'): Promise<string> {
  const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
  const containerClient = this.getContainerClient(bucket);
  const blobName = `${prefix}/${uuid()}.${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blockBlobClient.url;
}

// Convert any stored image to base64 data URI for Gemini SDK
async resolveExternalUrl(url: string): Promise<string> {
  // Azure: download blob and convert to base64
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
```

---

## 8. Payment Flow (Razorpay)

### Credit Tiers

| Tier | Credits | Price (INR) | Price (Paise) |
|------|---------|------------|----------------|
| Starter | 5 | ₹99 | 9,900 |
| Popular | 15 | ₹249 | 24,900 |
| Pro | 50 | ₹699 | 69,900 |

### Payment Sequence

```mermaid
sequenceDiagram
    participant App as 📱 Mobile App
    participant API as 🖥️ NestJS API
    participant RZP as 💳 Razorpay
    participant DB as 🗄️ Neon Postgres

    App->>API: POST /payments/create-order {tierSlug}
    API->>RZP: razorpay.orders.create({amount, currency, notes})
    RZP-->>API: {orderId, amount, currency}
    API-->>App: {orderId, amount, currency, keyId}

    App->>RZP: Open Razorpay Checkout Modal
    RZP-->>App: {razorpay_order_id, razorpay_payment_id, razorpay_signature}

    App->>API: POST /payments/verify {order_id, payment_id, signature}
    
    Note over API: Verify HMAC-SHA256 signature
    API->>API: expectedSig = HMAC(keySecret, orderId|paymentId)
    API->>API: Compare expectedSig === razorpay_signature

    Note over API: Idempotency check
    API->>DB: SELECT * FROM payments WHERE razorpayPaymentId = ?
    alt Already processed
        DB-->>API: existing payment found
        API-->>App: {success: true, credits: existing.credits}
    else New payment
        Note over API,DB: Atomic Transaction
        API->>DB: BEGIN TRANSACTION
        API->>DB: INSERT INTO payments (...)
        API->>DB: UPDATE users SET creditsRemaining = creditsRemaining + N
        API->>DB: COMMIT
        API-->>App: {success: true, credits: N}
    end
```

### Webhook Safety Net (Browser Crash Recovery)

```mermaid
sequenceDiagram
    participant RZP as 💳 Razorpay Server
    participant API as 🖥️ NestJS API
    participant DB as 🗄️ Neon Postgres

    Note over RZP: payment.captured event
    RZP->>API: POST /payments/webhook<br/>X-Razorpay-Signature header<br/>Raw JSON body

    API->>API: Verify webhook signature<br/>HMAC-SHA256(rawBody, webhookSecret)
    
    alt Signature valid
        API->>RZP: Fetch order details
        RZP-->>API: Order with notes {userId, tierSlug, credits}
        API->>DB: Check idempotency (razorpayPaymentId)
        alt Not yet processed
            API->>DB: Atomic transaction (payment + credits)
        end
        API-->>RZP: 200 OK
    else Signature invalid
        API-->>RZP: 400 Bad Request
    end
```

### Key Code: Atomic Payment Verification

```typescript
// payments.service.ts — verifyAndGrant()
async verifyAndGrant(params): Promise<{ success: boolean; credits: number }> {
  // 1. HMAC-SHA256 signature verification
  const expectedSig = crypto
    .createHmac('sha256', this.keySecret)
    .update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`)
    .digest('hex');
  if (expectedSig !== params.razorpay_signature) {
    throw new BadRequestException('Payment verification failed');
  }

  // 2. Idempotency check — prevent double-crediting
  const existing = await this.paymentRepo.findOne({
    where: { razorpayPaymentId: params.razorpay_payment_id },
  });
  if (existing) return { success: true, credits: existing.credits };

  // 3. Atomic transaction — payment record + credits together
  await this.dataSource.transaction(async (manager) => {
    await manager.save(Payment, { /* payment fields */ });
    await manager.createQueryBuilder()
      .update(User)
      .set({ creditsRemaining: () => `"creditsRemaining" + ${credits}` })
      .where('id = :userId', { userId })
      .execute();
  });
}
```

---

## 9. Authentication & Security

### Auth Flow

```mermaid
sequenceDiagram
    participant App as 📱 Mobile App
    participant Store as 🔐 Auth Store
    participant API as 🖥️ NestJS API
    participant DB as 🗄️ Postgres

    App->>API: POST /auth/register {email, password, name}
    API->>API: bcrypt.hash(password, 12)
    API->>DB: INSERT INTO users
    API->>API: jwt.sign({sub: userId, email})
    API-->>App: {accessToken, userId}
    App->>Store: Save token to AsyncStorage

    Note over App,Store: On app launch
    Store->>Store: loadToken() from AsyncStorage
    Store->>Store: isTokenExpired()? → auto-logout if expired

    Note over App: Route Guard (_layout.tsx)
    App->>App: Check segments vs PUBLIC_SEGMENTS
    alt Unauthenticated + protected route
        App->>App: router.replace('/')
    else Authenticated + auth page
        App->>App: router.replace('/(tabs)/home')
    end
```

### Security Measures

| Layer | Measure | Implementation |
|-------|---------|---------------|
| **Password** | bcrypt with 12 salt rounds | `bcrypt.hash(password, 12)` |
| **JWT** | 7-day expiry, HS256 | `JwtModule.register({ signOptions: { expiresIn: '7d' } })` |
| **JWT Secret** | Production startup guard | Exits if secret contains `change-in-production` |
| **Token Expiry** | Client-side check | `isTokenExpired()` decodes + checks `exp` on load |
| **Route Guard** | Expo Router segments | `PUBLIC_SEGMENTS` whitelist in `_layout.tsx` |
| **Input Validation** | NestJS ValidationPipe | `whitelist: true, forbidNonWhitelisted: true` |
| **CORS** | Explicit origin whitelist | `CORS_ORIGINS` env var, split by comma |
| **Admin Guard** | Role-based access control | `AdminGuard` checks `user.isAdmin` from DB on every request |
| **Admin API** | JWT + AdminGuard stacked | All `/api/admin/*` endpoints require both guards |
| **Webhook** | HMAC-SHA256 signature | Raw body + `X-Razorpay-Signature` header |
| **Payments** | Idempotency | UNIQUE constraint on `razorpayPaymentId` |
| **Payments** | Atomic transactions | Single DB transaction for payment + credits |
| **API Prefix** | Global `/api` prefix | `app.setGlobalPrefix('api')` |

### Key Code: Frontend Route Guard

```typescript
// _layout.tsx
const PUBLIC_SEGMENTS = ['index', '(auth)', 'about', 'privacy'];

useEffect(() => {
  if (isLoading) return;
  const firstSegment = segments[0] || 'index';
  const isPublic = PUBLIC_SEGMENTS.includes(firstSegment);

  if (!isAuthenticated && !isPublic) {
    router.replace('/');          // Protected → redirect to landing
  } else if (isAuthenticated && firstSegment === '(auth)') {
    router.replace('/(tabs)/home'); // Logged in → redirect to home
  }
}, [isAuthenticated, isLoading, segments]);
```

---

## 10. Platform Specifications

```mermaid
graph LR
    subgraph Platforms["Supported E-Commerce Platforms"]
        A["Amazon<br/>2000×2000<br/>White BG<br/>85% fill"]
        F["Flipkart<br/>1024×1024<br/>White BG<br/>75% fill"]
        M["Meesho<br/>1024×1024<br/>White BG<br/>70% fill"]
        AJ["AJIO<br/>1080×1440<br/>Any BG<br/>70% fill"]
        G["Gumroad<br/>1280×720<br/>Any BG<br/>50% fill"]
    end
```

| Platform | Dimensions | Max Size | Background | Min Fill | Formats |
|----------|-----------|----------|------------|----------|---------|
| Amazon | 2000×2000 | 10 MB | White (255,255,255) | 85% | JPEG, PNG, TIFF |
| Flipkart | 1024×1024 | 5 MB | White | 75% | JPEG, PNG |
| Meesho | 1024×1024 | 5 MB | White | 70% | JPEG, PNG |
| AJIO | 1080×1440 | 5 MB | Any | 70% | JPEG, PNG |
| Gumroad | 1280×720 | 8 MB | Any | 50% | JPEG, PNG, GIF |

### Key Code: sharp Post-Processing (Trim + Resize + Pad)

```typescript
// image-processing.service.ts — 3-step pipeline for minimal borders
async processForPlatform(inputBuffer: Buffer, spec: PlatformSpec): Promise<Buffer> {
  // 1. Trim excess whitespace from Gemini output
  const trimmed = await this.trimWhitespace(inputBuffer);

  // 2. Resize product to fill 96% of frame, pad to exact dimensions
  const padded = await this.resizeAndPad(trimmed, width, height, bg);

  // 3. Flatten to white if required, output as PNG
  //    Falls back to JPEG if PNG exceeds platform file size limit
}

// Product fills 96% of frame → ~2% border on each side
private async resizeAndPad(buffer, targetWidth, targetHeight, bg) {
  const fillRatio = 0.96;
  const innerW = Math.round(targetWidth * fillRatio);
  const innerH = Math.round(targetHeight * fillRatio);

  const resized = await sharp(buffer)
    .resize(innerW, innerH, { fit: 'inside' })
    .toBuffer();

  return sharp(resized)
    .extend({ top, bottom, left, right, background: bg })
    .toBuffer();
}
```

---

## 11. Admin Panel

### Architecture

The admin panel is a separate React SPA (`apps/admin`) that communicates with the same NestJS API via JWT-authenticated REST calls.

```mermaid
flowchart LR
    subgraph Admin["⚡ Admin Dashboard (Vercel)"]
        Login[Login Page] --> Verify[Verify admin access]
        Verify --> Dashboard[Dashboard]
        Dashboard --> UsersPage[Users Management]
        Dashboard --> RevenuePage[Revenue Analytics]
        UsersPage --> UserDetail[User Detail]
    end

    subgraph API["🖥️ NestJS API (Render)"]
        AuthEndpoint[POST /api/auth/login]
        AdminEndpoints[GET/PATCH /api/admin/*]
    end

    Login -->|Login with existing credentials| AuthEndpoint
    AuthEndpoint -->|JWT token| Verify
    Verify -->|GET /api/admin/dashboard| AdminEndpoints
    Dashboard -->|JWT + AdminGuard| AdminEndpoints
```

### Admin API Endpoints

| Method | Endpoint | Description | Guards |
|--------|----------|-------------|--------|
| GET | `/api/admin/dashboard` | Overview stats (users, revenue, projects) | JWT + Admin |
| GET | `/api/admin/activity` | Recent users, payments, projects | JWT + Admin |
| GET | `/api/admin/revenue` | Revenue breakdown with year/month filters | JWT + Admin |
| GET | `/api/admin/revenue/monthly` | Monthly chart data for a given year | JWT + Admin |
| GET | `/api/admin/users` | Paginated user list with search | JWT + Admin |
| GET | `/api/admin/users/:id` | User detail with payments & projects | JWT + Admin |
| PATCH | `/api/admin/users/:id/credits` | Update user credits (0–100,000) | JWT + Admin |
| PATCH | `/api/admin/users/:id/admin` | Toggle admin role | JWT + Admin |

### Admin Guard Flow

```mermaid
sequenceDiagram
    participant Client as ⚡ Admin Panel
    participant JWT as JwtAuthGuard
    participant Admin as AdminGuard
    participant DB as 🗄️ Postgres
    participant Controller as AdminController

    Client->>JWT: Request with Bearer token
    JWT->>JWT: Validate JWT signature & expiry
    JWT->>Admin: request.user = {userId, email}
    Admin->>DB: SELECT isAdmin FROM users WHERE id = userId
    alt isAdmin = true
        DB-->>Admin: User is admin
        Admin->>Controller: Allow request
    else isAdmin = false
        DB-->>Admin: Not admin
        Admin-->>Client: 403 Forbidden
    end
```

### Promoting a User to Admin

```bash
DATABASE_URL=postgres://... node apps/api/make-admin.js user@email.com
```

Or directly in Neon SQL Editor:
```sql
UPDATE users SET "isAdmin" = true WHERE email = 'user@email.com';
```

---

## 12. Infrastructure & Deployment

| Service | Provider | URL / Details |
|---------|----------|---------------|
| Database | Neon (Postgres) | Serverless Postgres with connection pooling |
| API | Render | https://api.listic.in |
| Mobile/Web App | Vercel | Main app deployment |
| Admin Panel | Vercel | Separate Vercel project (`apps/admin`) |
| Blob Storage | Azure Blob Storage | Two containers with SAS URL auth |
| AI | Google Gemini | gemini-2.5-flash-image model |
| Payments | Razorpay | INR payment gateway |

### Deployment Configuration

**API (Render):**
- Build command: `npm run build:api`
- Start command: `npm run start:api`
- Environment: Set all API env vars (DATABASE_URL, JWT_SECRET, etc.)
- CORS_ORIGINS must include all frontend domains

**Admin Panel (Vercel):**
- Root directory: `apps/admin`
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite
- Environment: `VITE_API_URL=https://api.listic.in/api`
- SPA rewrites configured in `vercel.json`

---

## 13. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@host/listic?sslmode=require` |
| `JWT_SECRET` | JWT signing key (must change in production) | `listic-dev-secret-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `AZURE_SAS_URL_ORIGINALS` | SAS URL for user-uploaded-product-images container | `https://listic.blob.core.windows.net/user-uploaded-product-images?sp=...&sig=...` |
| `AZURE_SAS_URL_GENERATED` | SAS URL for ai-generated-product-images container | `https://listic.blob.core.windows.net/ai-generated-product-images?sp=...&sig=...` |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | `ESiSZ...` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret | Set from Razorpay Dashboard |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `PORT` | API server port | `3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:8081,http://localhost:5173` |

**Admin Panel (`apps/admin`):**

| Variable | Purpose | Example |
|----------|---------|--------|
| `VITE_API_URL` | API base URL (must end with `/api`) | `https://api.listic.in/api` |

---

## 14. Key Code Reference

### Gemini AI Image Generation

```typescript
// imagen.service.ts — Sends prompt + image to Gemini, receives generated image
async generateImage(request: GenerationRequest): Promise<string> {
  const prompt = this.buildPrompt(request);
  const imagePart = this.resolveImagePart(request.originalImageUrl);

  const result = await this.model.generateContent([prompt, imagePart]);
  const parts = result.response.candidates?.[0]?.content?.parts;

  const generatedImagePart = parts.find((p: any) => p.inlineData);
  const mimeType = generatedImagePart.inlineData.mimeType || 'image/png';
  const base64 = generatedImagePart.inlineData.data;

  return `data:${mimeType};base64,${base64}`;
}

// Image part format expected by Gemini SDK
private resolveImagePart(imageUrl: string) {
  // imageUrl is always a data URI after StorageService.resolveExternalUrl()
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  return { inlineData: { data: match[2], mimeType: match[1] } };
}
```

### Generation Orchestration (Fire-and-Forget)

```typescript
// images.service.ts — Background generation loop
async generateImages(userId, projectId, additionalPrompt?) {
  // Deduct credit upfront
  const hasCredit = await this.usersService.deductCredit(userId);
  if (!hasCredit) throw new ForbiddenException('No credits remaining');

  project.status = 'processing';
  await this.projectRepo.save(project);

  // Fire-and-forget: returns immediately, processes in background
  this.runGeneration(project, userId, additionalPrompt).catch((err) => {
    this.logger.error(`Background generation crashed: ${err}`);
  });

  return project; // Client polls GET /projects/:id for status
}
```

### Database Connection Resilience (Neon Free Tier)

```typescript
// app.module.ts — TypeORM config with keepalive for Neon
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get('DATABASE_URL'),
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    synchronize: config.get('NODE_ENV') !== 'production',
    retryAttempts: 3,
    retryDelay: 1000,
    extra: {
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 5,
      keepAlive: true,                // Prevents Neon from killing idle connections
      keepAliveInitialDelayMillis: 10000,
    },
  }),
})
```

### Production JWT Secret Guard

```typescript
// main.ts — Refuses to start if JWT secret is the dev placeholder
async function bootstrap() {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (process.env.NODE_ENV === 'production' && jwtSecret.includes('change-in-production')) {
    console.error('FATAL: JWT_SECRET is still the dev placeholder.');
    process.exit(1);
  }
  // ... rest of bootstrap
}
```

---

## End-to-End Flow Summary

```mermaid
flowchart TD
    Start([User opens app]) --> Auth{Authenticated?}
    Auth -->|No| Login[Login / Register]
    Login --> Home
    Auth -->|Yes| Home[View Projects]
    
    Home --> Upload[Upload Product Photo]
    Upload -->|Photo + metadata| CreateProject[POST /images/projects]
    CreateProject -->|Save to Azure originals| SaveOriginal[(Azure: originals)]
    CreateProject -->|Save to DB| DB1[(Postgres: image_projects)]
    
    Home --> CheckCredits{Has credits?}
    CheckCredits -->|No| Purchase[Purchase Credits]
    Purchase --> Razorpay[Razorpay Checkout]
    Razorpay --> Verify[POST /payments/verify]
    Verify -->|Atomic TX| AddCredits[(DB: credits + payment)]
    AddCredits --> CheckCredits
    
    CheckCredits -->|Yes| Generate[POST /projects/:id/generate]
    Generate -->|Deduct 1 credit| DeductCredit[(DB: -1 credit)]
    
    Generate --> Loop{For each image type}
    Loop --> Gemini[Gemini 2.5 Flash Image]
    Gemini --> RawUpload[Upload raw → Azure generated]
    RawUpload --> Sharp[sharp: resize + optimize]
    Sharp --> FinalUpload[Upload processed → Azure generated]
    FinalUpload --> SaveGen[(DB: generated_images)]
    SaveGen --> Loop
    
    Loop -->|All 6 done| Complete[Status: completed]
    Complete --> Results[View Results Page]
    Results --> Download[Download / Share Images]

    subgraph AdminFlow["Admin Panel"]
        AdminLogin[Admin Login] --> AdminDash[Dashboard]
        AdminDash --> ManageUsers[Manage Users]
        AdminDash --> ViewRevenue[Revenue Analytics]
        ManageUsers --> EditCredits[Edit Credits / Toggle Admin]
    end
```

---

*Generated for **Listic** — AI E-Commerce Product Image Generator*
