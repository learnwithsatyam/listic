# Listic — Mistakes Caught & Fixed During Development

> A log of every bug, oversight, and architectural mistake that was identified and corrected during the AI-assisted development of this project. Ordered chronologically.

---

## 1. Wrong Payment Gateway for India

| | |
|---|---|
| **Phase** | Initial architecture |
| **What went wrong** | Stripe was chosen as the payment gateway. |
| **Why it's a problem** | Stripe requires an invite/application in India and is not generally available for Indian businesses. Since Listic targets Indian sellers (Amazon India, Flipkart, Meesho, AJIO), Stripe was unusable. |
| **Fix** | Full migration from Stripe to **Razorpay** — rewrote `payments.service.ts`, `payments.controller.ts`, `payments.dto.ts`, `purchase.tsx`, and `api.ts`. Updated all 20+ Stripe references in README. |
| **Lesson** | Validate third-party service availability in the target market before integrating. |

---

## 2. Razorpay .env Key Misconfiguration

| | |
|---|---|
| **Phase** | Razorpay setup |
| **What went wrong** | `RAZORPAY_KEY_SECRET` was set to the same value as `RAZORPAY_KEY_ID` in the `.env` file. |
| **Why it's a problem** | Signature verification would always fail because HMAC-SHA256 was computed with the wrong secret. All payments would be rejected. |
| **Fix** | Regenerated keys from Razorpay Dashboard and set the correct distinct values. |
| **Lesson** | Always verify that env vars have distinct, correct values — copy-paste errors are common with key pairs. |

---

## 3. No Payment Persistence / History

| | |
|---|---|
| **Phase** | After Razorpay integration |
| **What went wrong** | Payments were verified and credits added, but no payment record was saved to the database. |
| **Why it's a problem** | No audit trail. Users couldn't see their purchase history. Disputes and refunds would be impossible to handle. No way to verify if a specific payment was already processed. |
| **Fix** | Created `payment.entity.ts` with full payment fields (orderId, paymentId, tier, credits, amount, status, timestamps). Added `GET /payments/history` endpoint. Built `payment-history.tsx` page. Wired navigation from Settings. |
| **Lesson** | Every financial transaction must be recorded in a persistent store. |

---

## 4. Non-Atomic Payment + Credit Operations

| | |
|---|---|
| **Phase** | Payment verification |
| **What went wrong** | Payment record save and credit addition were two separate, independent database operations. |
| **Why it's a problem** | **Race condition / partial failure**: If the server crashed between saving the payment record and adding credits, the user would be charged but never get credits. Or vice versa — credits added but no payment record, leading to phantom credits. **Double-crediting**: No idempotency check meant the same payment could be verified twice, granting credits both times. |
| **Fix** | Wrapped both operations in a single `dataSource.transaction()`. Added `UNIQUE` constraint on `razorpayPaymentId` column. Added idempotency check — if payment ID already exists, return early without duplicate credit. |
| **Lesson** | Financial operations that must succeed or fail together MUST be in a database transaction. Always have an idempotency key. |

---

## 5. Database Connection Drops (Neon Free Tier)

| | |
|---|---|
| **Phase** | Runtime stability |
| **What went wrong** | API would randomly throw connection errors after periods of inactivity. |
| **Why it's a problem** | Neon's free tier aggressively kills idle connections. The default TypeORM pool config had no keepalive, no retry, and short timeouts — so any connection that went idle was silently dropped, and the next request would fail. |
| **Fix** | Added to TypeORM config: `keepAlive: true`, `keepAliveInitialDelayMillis: 10000`, `connectionTimeoutMillis: 10000`, `idleTimeoutMillis: 30000`, `max: 5` pool size, `retryAttempts: 3`, `retryDelay: 1000`. |
| **Lesson** | Free-tier managed databases have aggressive idle timeouts. Always configure keepalive and retry when using serverless/free Postgres providers. |

---

## 6. No Frontend Route Guards

| | |
|---|---|
| **Phase** | Security audit |
| **What went wrong** | Any user could navigate directly to protected URLs (`/upload`, `/purchase`, project pages) without being authenticated. |
| **Why it's a problem** | Unauthenticated users would see broken screens or get cryptic 401 errors from API calls instead of being redirected to login. Bad UX and potential information leakage. |
| **Fix** | Added route guard in `_layout.tsx` using Expo Router's `useSegments()`. Defined `PUBLIC_SEGMENTS = ['index', '(auth)', 'about', 'privacy']`. Unauthenticated users accessing protected routes are redirected to `/`. Authenticated users on auth pages are redirected to `/(tabs)/home`. |
| **Lesson** | Backend auth guards are necessary but not sufficient. Frontend must also enforce navigation protection for UX consistency. |

---

## 7. No JWT Expiry Validation on Client

| | |
|---|---|
| **Phase** | Security audit |
| **What went wrong** | Token was loaded from AsyncStorage on app launch, but never checked for expiry. |
| **Why it's a problem** | A user who last opened the app 30 days ago would appear "authenticated" (token exists in storage), try to navigate to protected screens, and get 401 errors on every API call. Confusing UX — looks logged in but nothing works. |
| **Fix** | Added `isTokenExpired()` function in `auth-store.ts` that decodes the JWT and checks the `exp` claim. Called on `loadToken()` — if expired, token is cleared and user is treated as logged out. |
| **Lesson** | Client-side token validation is essential for UX, even though the server also validates. An expired token should silently log the user out, not show them a broken authenticated state. |

---

## 8. Insecure JWT Secret Could Reach Production

| | |
|---|---|
| **Phase** | Security audit |
| **What went wrong** | The `.env` had `JWT_SECRET=listic-dev-secret-change-in-production-abc123xyz`. Nothing prevented this from being used in production. |
| **Why it's a problem** | Anyone who read the repo (or guessed the common dev placeholder) could forge valid JWTs and impersonate any user. Complete authentication bypass. |
| **Fix** | Added startup guard in `main.ts`: if `NODE_ENV === 'production'` and `JWT_SECRET` contains `change-in-production`, the server logs `FATAL` and calls `process.exit(1)`. Production literally cannot start with the insecure secret. |
| **Lesson** | Defense in depth — dev placeholder secrets must be programmatically blocked from reaching production, not just documented. |

---

## 9. No Webhook Safety Net for Payments

| | |
|---|---|
| **Phase** | Payment reliability |
| **What went wrong** | The only way credits were granted was through the client-side `POST /payments/verify` call after Razorpay checkout. |
| **Why it's a problem** | If the user's browser/app crashed, lost network, or was closed after successful payment but before the verify call, they'd be charged money but never receive credits. No recovery mechanism existed. |
| **Fix** | Added `POST /payments/webhook` endpoint. Razorpay sends `payment.captured` events server-to-server. The webhook verifies the `X-Razorpay-Signature` header using HMAC-SHA256, then runs the same idempotent credit-granting flow. Enabled `rawBody: true` in NestJS bootstrap for webhook signature verification. |
| **Lesson** | Client-initiated payment verification is never reliable. Always implement server-to-server webhooks as a safety net for payment systems. |

---

## 10. No Image Post-Processing for Platform Compliance

| | |
|---|---|
| **Phase** | Image generation pipeline |
| **What went wrong** | Gemini AI-generated images were stored and served as-is, at whatever dimensions the model produced. |
| **Why it's a problem** | Each e-commerce platform has strict image requirements: Amazon requires 2000×2000 with white background, Flipkart needs 1024×1024, AJIO needs 1080×1440 portrait, etc. AI-generated images at arbitrary sizes would be **rejected** by the platforms, making the entire product useless. |
| **Fix** | Created `image-processing.service.ts` using `sharp`. Pipeline: resize to exact platform dimensions → apply white background when required → output PNG → fallback to JPEG if file exceeds platform size limit. Integrated into `runGeneration()`: raw AI output is uploaded, then post-processed, then the final version is uploaded and saved. |
| **Lesson** | AI output is a starting point, not a finished product. Post-processing must enforce the exact specification requirements of the target system. |

---

## 11. Azure Blob Storage Auth Model Mismatch

| | |
|---|---|
| **Phase** | Azure integration |
| **What went wrong** | Code was written to use `BlobServiceClient` with an account-level connection string/key. The user's Azure setup had **container-level SAS URLs** instead. |
| **Why it's a problem** | `BlobServiceClient.fromConnectionString()` requires an account key or account-level SAS. Container-level SAS tokens are scoped to a single container and use a different URL format. The code would throw auth errors on every upload. |
| **Fix** | Switched to `ContainerClient` initialized directly from the full SAS URL. Two separate clients for the two containers (`originals`, `generated`). Removed `BlobServiceClient` entirely. Updated `.env` to have `AZURE_SAS_URL_ORIGINALS` and `AZURE_SAS_URL_GENERATED` instead of a single connection string. |
| **Lesson** | Understand the exact auth model your cloud provider setup uses before writing the integration code. Container-level SAS ≠ Account-level SAS ≠ Connection string. |

---

## 12. Azure URLs Not Converted for Gemini SDK

| | |
|---|---|
| **Phase** | Azure + Gemini integration |
| **What went wrong** | `resolveExternalUrl()` was returning the raw Azure Blob URL (e.g., `https://listic.blob.core.windows.net/...`). |
| **Why it's a problem** | The Gemini SDK requires images as inline base64 data URIs (`data:image/png;base64,...`). It cannot fetch external URLs. When Azure was the storage backend, every generation call would fail with "Image must be a data URI" because the URL was just an HTTP link, not a data URI. This worked in local dev (where `resolveExternalUrl` read from the filesystem) but broke completely with Azure. |
| **Fix** | Made `resolveExternalUrl()` `async`. It now always downloads the image (whether from local filesystem or Azure) and converts it to a `data:` URI with base64 encoding. Updated all callers to `await` the result. |
| **Lesson** | Storage abstraction layers must produce output in the format consumers expect. When switching storage backends, verify the entire downstream pipeline still works with the new URL format. |

---

## 13. Silent Error Swallowing on Frontend

| | |
|---|---|
| **Phase** | Frontend error handling audit |
| **What went wrong** | Multiple screens had `catch {}` blocks that did nothing — errors were swallowed silently. |
| **Where** | **projects.tsx**: `catch { // handled silently }` — user sees empty project list even on network failure. **results/[id].tsx**: `catch { // handled }` — no error display on project fetch failure. **credits-store.ts**: `catch { set({ loading: false }) }` — credits show "—" forever if API fails, with no indication of error. **home.tsx & settings.tsx**: no error handling at all on `fetchCredits()`. |
| **Why it's a problem** | Users see broken/empty screens with no explanation. They can't distinguish between "no data" and "network error". No way to retry. |
| **Fix** | Added `error` state to credits store. Projects screen shows error message with Retry button. Results screen shows error icon + message. Home/Settings credit chips show "Tap to retry" in red on failure. |
| **Lesson** | `catch {}` is almost never the right approach. Every caught error should either be displayed to the user, logged, or have a clear recovery path. Empty catch blocks hide bugs. |

---

## 14. No Email Format Validation

| | |
|---|---|
| **Phase** | Frontend validation audit |
| **What went wrong** | Login and registration forms only checked if fields were non-empty (`!email`). |
| **Why it's a problem** | Users could submit `"hello"` or `"   "` as an email. The request would reach the backend and fail with a cryptic error. Wasted API call and bad UX. Also, spaces-only strings like `"   "` passed the `!name` check. |
| **Fix** | Added `/\S+@\S+\.\S+/` regex validation for email format. Changed empty checks to use `.trim()` — `!email.trim()` and `!name.trim()`. |
| **Lesson** | Validate on the client before sending to the server. Backend validation is the safety net; frontend validation is the UX. |

---

## 15. No Client-Side File Size Validation

| | |
|---|---|
| **Phase** | Frontend validation audit |
| **What went wrong** | Upload screen said "JPG, PNG up to 10MB" but never actually checked the file size before uploading. |
| **Why it's a problem** | Users could pick a 50MB photo, wait for the entire upload, then get rejected by the backend's `MaxFileSizeValidator(10MB)`. Wasted bandwidth and time. |
| **Fix** | Added `asset.fileSize` check right after image picker returns — rejects with `Alert.alert('File Too Large', ...)` before any upload attempt. |
| **Lesson** | Validate constraints as early as possible. If the backend has a limit, mirror it on the client to fail fast. |

---

## 16. No "No Credits" Specific Error Handling

| | |
|---|---|
| **Phase** | Frontend validation audit |
| **What went wrong** | When image generation failed due to "No credits remaining", it showed a generic red error screen with no actionable next step. |
| **Why it's a problem** | User sees "Generation Failed — No credits remaining" but has no button to buy credits. They have to manually navigate back and find the purchase page. Terrible conversion point. |
| **Fix** | Generate screen now detects credit-related errors and shows a specific UI: diamond icon (not error icon), "No Credits Remaining" title, "Purchase credits to generate product images" message, and a prominent **"Buy Credits"** button that navigates directly to `/purchase`. Other errors get a **"Go Back"** button. |
| **Lesson** | Error states are UX opportunities. When the error has a clear resolution (buy credits), make it one tap away. |

---

## 17. `Alert.alert()` Invisible on Web

| | |
|---|---|
| **Phase** | Frontend testing on web |
| **What went wrong** | All validation messages and error alerts used React Native's `Alert.alert()` — which is a **no-op on web**. It only works on iOS and Android. |
| **Why it's a problem** | When running via `npm run dev:web` (Expo for web), every single user-facing alert was silently swallowed: form validation ("Please fill in all fields"), login errors ("Invalid credentials"), upload validation ("Please enter a product name"), file size warnings, download errors — **all invisible**. Users could submit invalid forms with zero feedback. |
| **Where** | 18 `Alert.alert()` calls across 6 files: `login.tsx`, `register.tsx`, `upload.tsx`, `results/[id].tsx`, `purchase.tsx`, `settings.tsx`. |
| **Fix** | Created `src/utils/alert.ts` with a cross-platform `showAlert()` function: uses `window.alert()` on web and `Alert.alert()` on native. Replaced all 17 simple alert calls. The 1 remaining `Alert.alert` (logout confirmation with Cancel/Logout buttons) was already correctly guarded with `Platform.OS === 'web' ? window.confirm(...)`. |
| **Lesson** | React Native ≠ cross-platform by default. `Alert`, `Share`, `Linking`, and other APIs may behave differently or be no-ops on web. Always test on **all target platforms**, not just the one you develop on. |

---

## 18. Popup Alerts Instead of Inline Validation

| | |
|---|---|
| **Phase** | UX refinement |
| **What went wrong** | All form validation errors were shown as popup alerts (`window.alert()` on web, `Alert.alert()` on native) — even for field-level mistakes like "Email is required" or "Please enter a product name". |
| **Why it's a problem** | Popups are disruptive, non-contextual, and require a click to dismiss before the user can see which field is wrong. On web they look like ugly browser alerts, not part of the app. Users have to remember what the popup said, dismiss it, then find the right field. For multi-field forms (upload has 4 fields), a single popup saying "Please select a category" gives no visual cue about which part of the form needs attention. |
| **Where** | `login.tsx` (2 validation + 1 API error), `register.tsx` (3 validation + 1 API error), `upload.tsx` (4 validation + 1 file size + 1 API error) — 12 popup alerts in form screens. |
| **Fix** | Replaced all form popups with **inline error text** below each field, plus **red borders** on errored inputs, plus an **error banner** at the top for API errors (e.g., "Invalid email or password"). Errors auto-clear when the user starts typing or selects a value. Upload form shows label-level errors for chips/toggles ("Category — Please select a category"). `showAlert()` is kept only for non-form contexts (permission denied, download failed, etc). |
| **Lesson** | Form validation should be inline, contextual, and non-blocking. Popups are for confirmations and one-off notifications, not for telling the user which field is wrong. |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Security vulnerabilities** | 4 (#6, #7, #8, #9) |
| **Data integrity / financial bugs** | 3 (#3, #4, #9) |
| **Integration failures** | 3 (#1, #11, #12) |
| **Missing validation** | 3 (#14, #15, #16) |
| **Silent failures / bad UX** | 4 (#13, #16, #17, #18) |
| **Infrastructure / config issues** | 3 (#2, #5, #10) |
| **Platform incompatibility** | 1 (#17) |
| **Total mistakes caught** | **18** |

---

## Key Takeaways

1. **AI writes code fast but skips edge cases** — It builds the happy path well but misses error states, validation, and failure recovery unless explicitly asked.
2. **Always audit financial code** — Atomicity, idempotency, and webhook safety nets are non-negotiable for any payment system.
3. **Silent `catch {}` is a code smell** — Every single instance we found was a bug. Errors should be surfaced, not hidden.
4. **Frontend and backend validation are both needed** — Backend is the security boundary; frontend is the UX boundary. Skipping either creates problems.
5. **Cloud service integrations need exact auth model matching** — "Works with Azure" is not enough. SAS tokens, connection strings, and account keys are different things.
6. **Test the full pipeline after changing any layer** — Switching from local storage to Azure broke Gemini because the URL format changed. Integration tests would have caught this immediately.

---

*Documented for the Listic project — March 2026*
