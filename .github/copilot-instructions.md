# Project Guidelines — My Own Study Tool

## Design System: Blue Bottle Minimal

This app follows a **Blue Bottle Coffee–inspired** aesthetic: clean, warm, restrained.
Think specialty coffee shop menu board — not a gamified mobile app.

### Core Principles

- **No emojis in the UI.** Use text, numbers, or simple Unicode symbols (→, ·) only.
- **Minimal and quiet.** Every element earns its space. Whitespace is a feature.
- **Warm neutrals** with one restrained accent color. No bright/saturated colors.
- **Typography does the work.** Weight, size, spacing, and case convey hierarchy — not color or decoration.

### Color Palette (`constants/Colors.ts`)

| Token           | Light           | Dark            | Usage                        |
| --------------- | --------------- | --------------- | ---------------------------- |
| `primary`       | `#6B8F9E`       | `#8BB0BF`       | Primary actions, links        |
| `primaryLight`  | `#A3BFC9`       | `#A3C5D3`       | Subtle highlights             |
| `accent`        | `#7D9E82`       | `#7D9E82`       | Success, positive states      |
| `danger`        | `#C07060`       | `#C07060`       | Errors, incorrect answers     |
| `warning`       | `#C9A06A`       | `#C9A06A`       | Caution states                |
| `text`          | `#1A1A1A`       | `#EBEBEB`       | Primary text                  |
| `textSecondary` | `#8C8C8C`       | `#858585`       | Labels, hints, metadata       |
| `background`    | `#F5F4F2`       | `#141414`       | Page background (warm paper)  |
| `surface`       | `#FFFFFF`       | `#1E1E1E`       | Cards, elevated surfaces      |
| `border`        | `#E8E6E3`       | `#2A2A2A`       | Subtle dividers, card borders |

### Typography

**Font family:** Inter (loaded weights: Light 300, Regular 400, Medium 500)

> `Inter-SemiBold` is **not loaded** — do not use it. Use `Inter-Medium` for emphasis.

| Role              | Font             | Size | Letter Spacing | Other              |
| ----------------- | ---------------- | ---- | -------------- | ------------------ |
| Page title        | `Inter-Medium`   | 22   | -0.3           |                    |
| Section label     | `Inter-Medium`   | 11   | 2              | `textTransform: 'uppercase'` |
| Card title        | `Inter-Medium`   | 15   | 0.2            |                    |
| Body text         | `Inter-Regular`  | 14   | 0.2            |                    |
| Small/meta text   | `Inter-Regular`  | 12–13| 0.2            |                    |
| Big stat number   | `Inter-Light`    | 24   | -0.5           |                    |
| Stat label        | `Inter-Medium`   | 10   | 1.2            | `textTransform: 'uppercase'` |

### Component Patterns

**Cards / Surfaces**
- `borderRadius: 10`, `borderWidth: 1`, `borderColor: colors.border`
- `backgroundColor: colors.surface`
- Padding: 16 vertical, 16–20 horizontal

**Section labels** (e.g., "TODAY IN TECH", "THIS WEEK")
- Uppercase, 11px, Inter-Medium, letterSpacing 2, `color: colors.textSecondary`

**Category markers** — use numbered text (`01`, `02`, `03`), not emojis or colored dots

**Buttons**
- Primary: `backgroundColor: colors.primary`, white text, borderRadius 8–10
- Secondary/ghost: `borderWidth: 1, borderColor: colors.primary`, primary-colored text
- No emoji in button labels — use text only (e.g., "Surprise me", "Start quiz")

**Correct/incorrect states**
- Correct background: light `#EDF5EF` / dark `#1E2D22`, text color `#7B9E87`
- Incorrect background: light `#F5EDEA` / dark `#2D1E1A`, text color `#C47D5A`
- Use text words "Correct" / "Not quite" — not ✓ or ✗ symbols

**Inline styles**
- Avoid `style={{ }}` inline objects — use StyleSheet.create entries
- Exception: one-off `backgroundColor: 'transparent'` on View wrappers is acceptable

### What NOT to Do

- No emojis anywhere in the UI (🎲 🔥 ⚡ 🚀 🧠 📚 🟢 🟡 🔴 💡 🔄 — none of these)
- No bright/saturated accent colors outside the palette
- No `Inter-SemiBold` or `Inter-Bold` (not loaded)
- No gamification chrome (badges, points, level-up animations)
- No "fun" copy that reads like a mobile game ("Level up! 🚀", "You're on fire! 🔥")
- Copy should be calm and informative, like a quality tool — not cheerful and pushy

### Copy Voice

- **Calm, competent, concise.** Like a well-designed developer tool.
- Greetings are simple: "Good morning" / "Good afternoon" / "Good evening"
- State descriptions are factual: "12 cards due", "All caught up", "3 questions to review"
- Calls to action are clear: "Review cards", "Start quiz", "Browse packs"
- No exclamation marks in UI labels. Reserve for genuine congratulations only.

## Tech Stack

- **Expo SDK 54**, React Native 0.81, React 19, TypeScript
- **SQLite** (expo-sqlite) on native, in-memory Maps on web
- **Supabase** for auth + cloud sync
- **Gemini 2.0 Flash** for LLM features (news summaries, ELI5 explanations)
- **SM-2 spaced repetition** for flashcard scheduling

## File Structure

- `app/(tabs)/` — Tab screens (index, packs, quiz, stats)
- `app/review/` — Card review flow
- `components/` — Reusable components (QuickQuiz, PackCard, etc.)
- `lib/` — Business logic (database, packs, quizSelection, summarizer, auth)
- `data/` — Static content (card packs JSON, quiz packs JSON)
- `constants/` — Colors, theme values
- `types/` — TypeScript interfaces
