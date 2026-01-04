# AGENT.md
## IPTV Media Player – Coding Contract for AI Agent

This document is **MANDATORY**. All rules must be followed strictly.
If something is unclear, **DO NOT GUESS** – ask for clarification.

---

## 1. Project Overview

**Project name:** IPTV Media Player  
**Platform:** Android TV only (Expo Router TV template)  
**Language:** English (code, comments, UI)  
**Internationalization (i18n):** Mandatory from v1  

**Primary Goal (v1):**
Build a Netflix-like IPTV media player with:
- Perfectly fluid TV focus navigation
- Support for very large catalogs (30,000+ items)
- Live TV with EPG grid
- VOD & Series browsing
- Integrated VLC-based video player (codec compatibility)

---

## 2. Locked Technology Stack (NON-NEGOTIABLE)

### Architecture
- **Feature-first architecture**
- Must respect existing Expo Router structure

### Core Stack
- Expo + Expo Router (TV)
- NativeWind (Tailwind for React Native)
- React Native VLC Media Player
- SQLite (local persistence)
- @tanstack/react-query
- expo-image
- Zustand
- ESLint + Prettier
- Zod + React Hook Form
- i18n enabled from v1

❌ Redux  
❌ AsyncStorage for catalog/EPG  
❌ Inline styles  
❌ Hardcoded colors (HEX, RGB, etc.)  

---

## 3. Project Structure (MUST MATCH CURRENT REPO)

You **MUST** respect this base structure:

```
app/
  (tabs)/
    _layout.tsx
    index.tsx
    live.tsx
    vod.tsx
    series.tsx
    search.tsx
    settings.tsx
  _layout.tsx
  +html.tsx
  +not-found.tsx

components/
constants/
hooks/
layouts/
storage/
types/
assets/
scripts/
```

### Feature Rule
- Feature logic MUST live in dedicated subfolders:
```
components/home/
components/live/
components/vod/
components/series/
components/player/
components/epg/
```

OR equivalent grouping inside `components/`.

❌ Do NOT create a new global `/src` folder  
❌ Do NOT break Expo Router conventions  

---

## 4. Design System Rules (CRITICAL)

### Colors
- **NO HEX COLORS IN CODE – EVER**
- Colors defined ONLY in `tailwind.config.js`

Mandatory palette:
- `primary` = `#ed0341`
- `black`
- `white`
- Opacity variants only (`white/80`, `white/10`, etc.)

Inspired by **myCANAL UI style**.

❌ `style={{ color: '#ed0341' }}`  
❌ `#000`, `#fff` anywhere  

✅ `text-primary`  
✅ `bg-white/10`  

---

## 5. TV Focus Navigation (ABSOLUTE PRIORITY)

⚠️ **FOCUS MUST BE PERFECTLY FLUID**

### Rules
- No lag
- No jumps
- No re-render on focus
- No layout shift on focus

### Mandatory
- Native TV focus system only
- `hasTVPreferredFocus` on entry elements
- Virtualized lists/grids
- No heavy logic in `onFocus`

❌ State updates on focus (sauf si je le demande explicitement)
❌ Fetch calls triggered by focus  

### TV Focus System (MANDATORY)
- Use the shared TV focus system components/hooks:
  - `components/focus/TVFocusProvider.tsx`
  - `components/focus/useTVFocus.ts`
  - `components/focus/TVFocusable.tsx`
  - `components/focus/TVFocusPressable.tsx`
  - `components/focus/TVFocusTextInput.tsx`
  - `components/focus/TVFocusRing.tsx`
- Every interactive element must be focusable and show a visible focus state:
  - Tabs, buttons, cards, rails, list items, modals, player controls.
- Focus styles must be applied via `className` + `focus:` utilities.
- Prefer `TVFocusProvider` for initial focus control.
- Ensure focus visuals include a clear highlight (border/overlay/scale).

---

## 6. Home UX Contract (Netflix-like)

### Tabs
- Home
- Live
- VOD
- Series
- Search
- Settings

### Home Rails
1. Continue Watching
2. Favorites
3. Recently Viewed
4. Recently Added VOD
5. Recently Added Series
6. Recently Added Live

### Rules
- Max **10 items per rail**
- Always include **See more** card
- See more opens a dedicated list screen

### Cards
- VOD / Series: Vertical posters
- Live: Landscape thumbnail + EPG progress bar

---

## 7. VOD & Series Navigation

- "All Categories" screen
- Netflix-style grid
- Filters:
  - A–Z
  - Recently Added

### Data Rules
- Lightweight item cards
- Full details loaded only on details screen

---

## 8. Live & EPG Grid

### Grid
- Vertical scroll: channels
- Horizontal scroll: timeline
- Full API range loaded
- Virtualization required

### Interaction
- Live program → play immediately
- Non-live program → modal details screen

---

## 9. Player Contract (VLC)

### Controls (Netflix-style)
- Play / Pause
- Seek (VOD)
- Jump to Live
- Audio tracks
- Subtitles
- Quality (if available)
- Retry
- Favorite / Unfavorite

### Rules
- VLC-based player only
- Integrated player
- Retry on error
- Track preferences saved per item

---

## 10. Continue Watching Rules

- Appears after **60 seconds**
- Removed at **95% watched**
- Stored per portal

---

## 11. Search

- Global (Live + VOD + Series)
- Native TV keyboard
- Focus-friendly results

---

## 12. Network & Errors

### No Network
- Fullscreen blocking screen
- Retry button
- Auto retry when network returns

### Errors
- Friendly messages
- Never crash
- Retry when possible

---

## 13. Performance Rules (30k+ Items)

- SQLite for catalog & EPG
- TanStack Query for networking
- expo-image mandatory

❌ Non-virtualized lists

---

## 14. Internationalization (MANDATORY)

- i18n enabled from v1
- No hardcoded strings
- English default language

---

## 15. Forbidden Patterns

❌ Business logic in screens  
❌ Inline styles  
❌ Hardcoded colors  
❌ Focus-driven re-renders  
❌ Direct API calls in UI  
❌ `StyleSheet.create` anywhere  
❌ `style=` props for styling (only allowed when passing through to a child without adding styles, with a short comment explaining why)  
❌ Interactive elements without TV focus feedback  

---

## 16. Definition of Done

A feature is DONE only if:
- Focus is perfectly fluid
- No FPS drop
- ESLint & Prettier pass
- i18n compliant
- Errors handled

---

**Any violation of this file invalidates the implementation.**
