# 🔨 BUILD & RUN - Regen Browser OS

**Status:** Development Guide  
**Purpose:** Instructions for building and running Regen

---

## PREREQUISITES

### Required

- **Rust** (latest stable) - `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** 18+ - `node --version`
- **npm** or **yarn** - `npm --version`

### Optional (for full features)

- **Ollama** - For offline AI (`ollama pull phi3:mini`)
- **TOR** - For privacy mode (`apt install tor` or download from torproject.org)

---

## DEVELOPMENT SETUP

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Rust dependencies (automatically installed on first build)
cd src-tauri
cargo build
```

### 2. Run Development Server

**IMPORTANT:** Use `npm run dev:tauri` NOT `npm run dev` or `vite dev`

```bash
# Correct command (runs Tauri + Vite together)
npm run dev:tauri

# OR from src-tauri directory
cd src-tauri
cargo tauri dev
```

**Common Mistakes:**

- ❌ `npm run dev` - Runs Vite only (no Tauri backend)
- ❌ `npm run dev:web` - Runs Vite only (no Tauri backend)
- ✅ `npm run dev:tauri` - Runs Tauri + Vite together

---

## BUILD COMMANDS

### Development Build

```bash
npm run dev:tauri
```

### Production Build

```bash
# Build frontend
npm run build

# Build Tauri app
cd src-tauri
cargo tauri build
```

### Type Check (Frontend)

```bash
npm run typecheck
```

### Lint (Frontend)

```bash
npm run lint
```

---

## VERIFICATION

### Verify Offline Mode Works

1. **Disconnect from internet**
2. **Start app:** `npm run dev:tauri`
3. **Create tab** - Should work (no network needed)
4. **Search offline** - Use `db:search` command
5. **Save page** - Use `db:save_page` command
6. **Retrieve page** - Use `db:get_page` command

### Verify Ghost Mode Works

1. **Enable Ghost mode** - Call `privacy:set_mode` with "ghost"
2. **Try to save page** - Should fail with "Disk writes blocked"
3. **Check privacy enforcement** - Rust should block, not UI

### Verify Language Setting

1. **Set language** - Call `settings:set_language` with "hi" (Hindi)
2. **Get language** - Call `settings:get_language` - should return "hi"
3. **Restart app** - Language should persist (stored in Rust state)

### Verify Tab Management

1. **Create tab** - Call `tabs:create` with URL
2. **List tabs** - Call `tabs:list` - should see created tab
3. **Set active** - Call `tabs:set_active` with tab ID
4. **Delete tab** - Call `tabs:delete` with tab ID

---

## TROUBLESHOOTING

### Error: "Failed to initialize database"

**Cause:** SQLite file permission issue or path doesn't exist  
**Fix:** Check file permissions, ensure parent directory exists

### Error: "Ollama not found"

**Cause:** Ollama binary not in PATH  
**Fix:** Install Ollama from https://ollama.com/download

### Error: "TOR is not installed"

**Cause:** TOR binary not available  
**Fix:** Install TOR (optional feature, app works without it)

### Error: "Module not found" in Rust

**Cause:** Missing module in `lib.rs`  
**Fix:** Add `pub mod <module_name>;` to `src-tauri/src/lib.rs`

### Error: Type mismatch in IPC

**Cause:** Frontend and Rust types don't match  
**Fix:** Ensure serde Serialize/Deserialize on Rust structs, match JSON schema

---

## FILE LOCATIONS

### Rust Backend

- **Main entry:** `src-tauri/src/main.rs`
- **Commands:** `src-tauri/src/commands.rs`
- **Modules:** `src-tauri/src/*.rs`

### Frontend

- **Entry:** `src/main.tsx`
- **State (cache):** `src/state/*.ts`
- **IPC client:** `src/lib/ipc-typed.ts`

### Database

- **Location:** `./regen.db` (default, in app root)
- **Schema:** Defined in `src-tauri/src/db.rs` → `init_schema()`

---

## TESTING

### Run Tests (Frontend)

```bash
npm run test:unit
npm run test:integration
```

### Run Tests (Rust)

```bash
cd src-tauri
cargo test
```

### Manual Testing Checklist

- [ ] App starts without errors
- [ ] Database initializes
- [ ] Tabs can be created
- [ ] Language setting persists
- [ ] Privacy mode enforcement works
- [ ] Offline search works
- [ ] Page caching works
- [ ] AI service detects Ollama (if installed)
- [ ] IPC commands return correct data

---

## NEXT STEPS AFTER BUILD

1. **Update frontend** to call Rust commands instead of Zustand actions
2. **Implement WebView** native rendering (replace iframes)
3. **Add error handling** for IPC failures
4. **Add logging** for debugging
5. **Write tests** for critical paths

---

**END OF BUILD GUIDE**
