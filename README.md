# APEX — AI Fitness Operating System
## Complete Setup Guide

---

## WHAT YOU'RE BUILDING

APEX is a complete AI-powered fitness app for Android:
- **AI Workout Generator** — GPT-4o generates personalized 4-week progressive plans
- **Food Photo Scanner** — GPT-4o Vision analyzes Indian meals for nutrition
- **AI Coach Chat** — Streaming chat with full user context injection
- **Budget Diet Planner** — 7-day Indian meal plans within your budget
- **Body Scan Analysis** — GPT-4o Vision body composition assessment
- **Progress Dashboard** — Weight charts, workout heatmap, badges

---

## PREREQUISITES

Install these before starting:

```bash
# Node.js 20+ (required)
node --version  # should show v20+

# Install Expo CLI
npm install -g expo-cli@latest eas-cli@latest

# Verify
expo --version
eas --version
```

---

## PART 1 — CLONE AND INSTALL

```bash
# Navigate to your projects folder
cd ~/projects

# Copy all files from this delivery into apex-fitness/
# Then install dependencies:
cd apex-fitness
npm install

# Install babel module resolver (required for path aliases)
npm install --save-dev babel-plugin-module-resolver
```

---

## PART 2 — SUPABASE SETUP

### 2.1 Create Supabase Project
1. Go to https://supabase.com → New Project
2. Choose a region close to India (Mumbai/Singapore)
3. Save your database password

### 2.2 Run SQL Schema
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/schema.sql` from this project
3. Copy all content → Paste into SQL Editor → Run

### 2.3 Create Storage Buckets
Go to Storage → New Bucket:
- `food-photos` → Private, 10MB limit
- `body-scans` → Private, 20MB limit  
- `avatars` → Public, 5MB limit

Then run the storage RLS policies from the bottom of `schema.sql`.

### 2.4 Enable Extensions
Go to Database → Extensions:
- Enable `pg_cron` (for body photo auto-deletion)

### 2.5 Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets (NEVER put these in .env)
supabase secrets set OPENAI_API_KEY=sk-your-openai-key

# Deploy all functions
supabase functions deploy generate-workout
supabase functions deploy scan-food
supabase functions deploy ai-coach-chat
supabase functions deploy generate-diet-plan
supabase functions deploy analyze-body
```

### 2.6 Get Your Keys
From Supabase Dashboard → Settings → API:
- Copy `Project URL`
- Copy `anon public` key

---

## PART 3 — ENVIRONMENT SETUP

```bash
# Copy template
cp .env.template .env

# Edit .env and fill in all values:
nano .env
```

Required values:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
EXPO_PUBLIC_POSTHOG_KEY=phc_xxx
EXPO_PUBLIC_REVENUECAT_KEY_ANDROID=appl_xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## PART 4 — REVENUCAT SETUP (Subscriptions)

1. Create account at https://app.revenuecat.com
2. Create a new project "APEX Fitness"
3. Add Android app with package `com.apexfitness.app`
4. Create products in Google Play Console:
   - `apex_pro_monthly` — ₹299/month
   - `apex_pro_yearly` — ₹2,499/year
   - `apex_elite_monthly` — ₹699/month
   - `apex_elite_yearly` — ₹5,999/year
5. Create entitlements in RevenueCat: `pro`, `elite`
6. Copy Android SDK key → add to `.env`

---

## PART 5 — FONTS SETUP

Download and place these fonts in `assets/fonts/`:

**Space Grotesk** (for headings):
https://fonts.google.com/specimen/Space+Grotesk
- `SpaceGrotesk-Medium.ttf`
- `SpaceGrotesk-Bold.ttf`

**Inter** (for body text):
https://fonts.google.com/specimen/Inter
- `Inter-Regular.ttf`
- `Inter-Medium.ttf`
- `Inter-SemiBold.ttf`
- `Inter-Bold.ttf`

```bash
mkdir -p assets/fonts
# Place all .ttf files in assets/fonts/
```

---

## PART 6 — APP ASSETS

Create these in `assets/`:
- `icon.png` — 1024×1024px app icon
- `adaptive-icon.png` — 1024×1024px (Android adaptive icon foreground)
- `splash.png` — 1284×2778px splash screen
- `splash-icon.png` — 200×200px (center graphic for splash)
- `favicon.png` — 32×32px
- `notification-icon.png` — 96×96px white icon on transparent background

Quick placeholder (for testing):
```bash
# Install ImageMagick and create placeholder icons
brew install imagemagick  # macOS
convert -size 1024x1024 xc:#7C3AED assets/icon.png
convert -size 1024x1024 xc:#7C3AED assets/adaptive-icon.png
convert -size 200x200 xc:#7C3AED assets/splash-icon.png
```

---

## PART 7 — EAS BUILD SETUP

```bash
# Login to Expo
eas login

# Configure project (creates project ID)
eas build:configure

# Copy the project ID shown → paste into eas.json and app.config.ts
```

---

## PART 8 — RUNNING THE APP

### Development (Expo Go)
```bash
npx expo start
# Scan QR code with Expo Go app on your Android phone
```

### Development APK (for testing on device)
```bash
eas build -p android --profile development
# Download APK and install on device
```

### Production APK
```bash
eas build -p android --profile production-apk
# Downloads as .apk — sideload or upload to Play Console
```

### Production AAB (for Google Play Store)
```bash
eas build -p android --profile production
# Downloads as .aab — upload to Google Play Console
```

---

## PART 9 — GOOGLE PLAY SETUP

1. Create Google Play Developer account ($25 one-time fee)
2. Create new app → "APEX: AI Fitness Coach"
3. Package name: `com.apexfitness.app`
4. Fill in store listing:
   - **Title**: APEX: AI Fitness Coach & Trainer
   - **Short description**: AI personal trainer, food scanner & diet planner. ₹299/month.
   - **Category**: Health & Fitness
5. Upload APK/AAB to internal testing track first
6. Complete Data Safety form (see section below)
7. Add Privacy Policy URL: `https://apexfitness.in/privacy`

### Data Safety Form
Declare the following:
- ✅ Health and fitness data collected
- ✅ App activity data collected
- ✅ Photos (user-submitted for food/body analysis)
- ❌ Location NOT collected
- Data is encrypted in transit and at rest: ✅
- Users can request data deletion: ✅

---

## PROJECT STRUCTURE

```
apex-fitness/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (fonts, auth guard)
│   ├── (auth)/                   # Login, signup, forgot password
│   ├── (onboarding)/             # 7-step onboarding flow
│   ├── (tabs)/                   # Main app: home, workout, nutrition, coach, progress
│   └── (modals)/                 # Paywall, privacy, terms
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── home/                 # CaloriesRing, WorkoutStreakCard, etc.
│   │   ├── motivation/           # DailyMotivationSplash
│   │   └── onboarding/           # OnboardingStep wrapper
│   ├── constants/                # Design tokens, quotes
│   ├── services/                 # Supabase client
│   ├── stores/                   # Zustand stores (auth, subscription, onboarding)
│   └── types/                    # TypeScript types
├── supabase/
│   ├── functions/                # Edge Functions (OpenAI calls)
│   │   ├── generate-workout/
│   │   ├── scan-food/
│   │   ├── ai-coach-chat/
│   │   ├── generate-diet-plan/
│   │   └── analyze-body/
│   └── schema.sql                # Complete database schema + RLS
├── assets/
│   └── fonts/                    # SpaceGrotesk + Inter fonts
├── .env.template                 # Environment variables template
├── app.config.ts                 # Expo config with Android permissions
├── babel.config.js               # Path aliases
├── eas.json                      # EAS Build profiles
├── metro.config.js               # Metro + Supabase workaround
└── tsconfig.json                 # Strict TypeScript config
```

---

## SECURITY CHECKLIST

Before going live:

- [ ] `.env` file is in `.gitignore` (never committed)
- [ ] `OPENAI_API_KEY` is ONLY in Supabase Edge Function secrets
- [ ] All Supabase tables have RLS enabled (`schema.sql` handles this)
- [ ] Storage buckets are set to Private (food-photos, body-scans)
- [ ] `EXPO_PUBLIC_` prefix NOT used on any secret keys
- [ ] Rate limiting working: test free user hitting 5 scan limit
- [ ] Auth rate limiting: test 3 failed logins → 30s lockout

---

## TROUBLESHOOTING

**"supabase-js ws error" on Metro**
→ Already fixed in `metro.config.js` via `unstable_enablePackageExports: false`

**"Cannot find module '@stores/authStore'"**
→ Run `npm install` then restart with `npx expo start --clear`

**"Font not loaded" warning**
→ Ensure all font files are in `assets/fonts/` matching the names in `_layout.tsx`

**Edge Function returns 500**
→ Check Supabase Dashboard → Functions → Logs
→ Ensure `OPENAI_API_KEY` is set in Function Secrets

**"User not found" after signup**
→ Check email confirmation is disabled in Supabase Auth settings (for testing)
→ Or verify your email before signing in

---

## V2 FEATURES (TODO COMMENTS IN CODE)

The codebase includes TODO comments for future features:
- `// TODO V2: Video form correction using MediaPipe pose estimation`
- `// TODO V2: Apple Watch / Garmin / WHOOP wearable integration`  
- `// TODO V2: Recovery score based on HRV and sleep data`
- `// TODO V2: Body transformation simulator`
- `// TODO V2: Real-time rep counter using phone camera + pose estimation`
- `// TODO V3: Custom LLM fine-tuned on Indian fitness and nutrition data`
- `// TODO V3: B2B gym partner API`
- `// TODO V3: Corporate wellness dashboard`

---

## SUPPORT

- Technical issues: Check Supabase logs and Sentry dashboard
- OpenAI issues: Check Edge Function logs in Supabase Dashboard
- Build issues: Check EAS build logs at expo.dev
