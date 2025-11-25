# Regen Mobile Shell

Mobile companion app for Regen desktop browser.

## Architecture

- **Framework**: React Native (Expo) or Flutter
- **Communication**: WebSocket connection to desktop API server
- **Features**:
  - Remote tab management
  - Mobile browsing via desktop proxy
  - Agent console access
  - Workspace synchronization

## Directory Structure

```
apps/mobile/
├── src/
│   ├── screens/
│   │   ├── Home.tsx
│   │   ├── Tabs.tsx
│   │   ├── Agent.tsx
│   │   └── Settings.tsx
│   ├── components/
│   ├── services/
│   │   ├── api.ts
│   │   └── websocket.ts
│   └── App.tsx
├── package.json
└── README.md
```

## Setup

### React Native (Expo)

```bash
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript
npm install
```

### Flutter

```bash
cd apps/mobile
flutter create .
```

## Connection

Connect to desktop API server:

- Default endpoint: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws`
- Authentication: JWT token from desktop auth

## Features

1. **Remote Tab Control**
   - View open tabs
   - Open new tabs
   - Close tabs
   - Switch active tab

2. **Mobile Browsing**
   - Browse via desktop proxy
   - Sync history
   - Bookmarks

3. **Agent Console**
   - Execute agent tasks
   - View agent logs
   - Control agent execution

4. **Workspace Sync**
   - View workspaces
   - Sync workspace data
   - Create/edit workspaces

## Development

```bash
# Start mobile app
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android
```

## API Integration

See `apps/api/` for API documentation.

Main endpoints:

- `GET /api/tabs` - List tabs
- `POST /api/tabs` - Create tab
- `DELETE /api/tabs/:id` - Close tab
- `WS /ws` - Real-time updates
