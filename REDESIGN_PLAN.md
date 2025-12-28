# CareTaker AI: UI/UX Redesign & Psychological Safety Plan

## 1. Design Philosophy Shift
We are moving from a **Legacy Military Dashboard** to a **Premium Personal Wellness Pod**.

| Current Element | New Element | Psychology |
| :--- | :--- | :--- |
| **Font:** JetBrains Mono | **Font:** Inter / Outfit | Mono is robotic; Sans is human/approachable. |
| **Colors:** Neon Green/Red | **Colors:** Teal/Amber/Soft White | Neon signals danger; Soft colors signal calm. |
| **Shapes:** Sharp Corners | **Shapes:** 24px/32px Rounded | Soft shapes reduce cognitive tension. |
| **Texture:** Scanlines | **Texture:** Glassmorphism | Scanlines feel "old tech"; Glass feels "future tech". |
| **Tone:** "System Failure" | **Tone:** "Balance Required" | Shift from machine metrics to human needs. |

---

## 2. Color Palette (Tailwind Config)

```css
:root {
  /* BACKGROUND: Deep Void with subtle gradient */
  --background: 240 10% 4%; 
  
  /* PRIMARY: Calm Teal (Growth/Health) */
  --primary: 170 70% 50%;
  --primary-glow: 170 70% 50%;

  /* WARNING: Soft Amber (Review Needed) */
  --warning: 40 90% 60%;
  
  /* DESTRUCTIVE/RECOVERY: Soft Coral (Urgent Care) */
  --destructive: 0 70% 60%; /* Less aggressive than pure red */
  
  /* ACCENTS */
  --glass-border: 255 255 255 / 0.08;
  --glass-surface: 0 0% 100% / 0.03;
}
```

---

## 3. UI Component Redesign

### A. The "Halo" Header (`SystemHeader.tsx`)
*   **Remove:** Text-heavy "Mode: Caretaker" labels.
*   **Add:** A subtle, breathing "Halo" ring around the user avatar/icon that changes color based on state (Green = Good, Amber = Tired).
*   **Interaction:** Tapping the Halo reveals detailed stats (progressive disclosure).

### B. Bento Grid Layout (`Index.tsx`)
*   Replace linear lists with a **Bento Grid** (Masonry-style) layout.
*   **Cards:**
    *   **Focus Card (Large):** The single most important task (e.g., "Drink Water").
    *   **Status Cards (Small):** Quick glance metrics.
    *   **Insight Card (Wide):** AI Summary.

### C. "Rest Focus" Overlay (`RecoveryLock.tsx`)
*   **Old:** Black screen, countdown, "Type to dismiss."
*   **New:**
    *   **Visual:** Blur effect + Slow breathing animation circle.
    *   **Text:** "Let's take a moment. Deep breath."
    *   **Action:** "I'm ready" button appears after 5s breathable pause (not 30s lock).
    *   **Choice:** "I need 5 more mins" (Positivity) vs "Unlock now" (Neutral).

---

## 4. Implementation Steps

### Phase 1: Foundation (CSS & Config)
1.  [ ] Update `index.css` with new variables (remove scanlines, add glass utilities).
2.  [ ] Install `Outfit` font for headings, keep `Inter` for body.
3.  [ ] Update Tailwind config.

### Phase 2: Core Components
4.  [ ] Refactor `SystemHeader` to be minimal and fluid.
5.  [ ] Create `BentoCard` component for the new grid layout.
6.  [ ] Redesign `RecoveryLock` to be `RestFocusOverlay`.

### Phase 3: Main Dashboard (`Index.tsx`)
7.  [ ] Implement Bento Grid layout.
8.  [ ] Update health logging buttons to be large, touch-friendly "Squaryles" (Square + Circle).
9.  [ ] Integrated AI Insight card with "Persona" (friendly tone).

### Phase 4: Psychological Mechanics
10. [ ] Update `aiService.js` prompts to use supportive language.
11. [ ] Rewrite notification copy in `use-notifications.ts`.
