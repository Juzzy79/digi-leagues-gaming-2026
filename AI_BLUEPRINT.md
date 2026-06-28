# AI_BLUEPRINT.md - Digi Leagues Gaming 2026

## 🎯 CORE OBJECTIVE
Transform Digi Leagues from a feature-rich prototype into a world-class, stable, and scalable competitive gaming ecosystem. Prioritize "System Stability" and "Process Refinement" to ensure the complex interdependencies of the league operate seamlessly.

## 🛠️ TECHNICAL STACK
- **Frontend**: React + Vite + TypeScript
- **Backend/Database**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Context API + Custom Hooks (`usePolling`, `usePartySession`)
- **Specialized Logic**: Custom SoundEngine, Fightflow logic, Career Layering

---

## 🚀 PRIORITY 1: STABILITY & PROCESS REFINEMENT (THE "FOUNDATION")
The project has a massive amount of services and SQL migrations. We must ensure the foundation is rock-solid before adding new features.

**REQUIREMENTS:**
1. **Build Pipeline Fix**: Resolve the issues identified in `build_error.txt`. The goal is a "one-command" build process (`npm run build`) with zero errors.
2. **Supabase Schema Audit**: 
   - Review the migration history (from `evolution.sql` to `admin_ultimate_powers.sql`).
   - Ensure all SQL constraints and RPCs are optimized for the current version of the app.
   - Verify that `supabase_mvp_fix.sql` has been fully integrated and tested.
3. **Service Layer Optimization**: 
   - Audit the 20+ services in `src/services/`. 
   - Implement a standardized error-handling pattern across all services to prevent "silent failures" during API calls.
   - Optimize `usePolling.ts` to prevent excessive database hits and potential rate-limiting.

---

## 📈 PRIORITY 2: COMPETITIVE ENGINE & CAREER DEPTH
Refining the "Game Loop" to make the progression feel rewarding and the competition feel intense.

**REQUIREMENTS:**
1. **Fightflow Integration**: Ensure the `fightflow.ts` types are perfectly aligned with the `20260429000000_fightflow.sql` migration. The logic for match resolution must be deterministic and transparent.
2. **Career Progression**: Refine the `careerService.ts` and `CareerTimeline.tsx` to ensure "Phase" transitions (e.g., moving from a Rookie to a Pro) are triggered by clear, validated milestones.
3. **Rivalry & Crew Dynamics**: Enhance the `rivalryService.ts` to create "Dynamic Rivalries"—where the system automatically flags users with similar rankings or frequent match-ups as rivals.

---

## 🎨 PRIORITY 3: UI/UX COHESION & "GAMING" FEEL
Moving from a "Web App" feel to a "Gaming Console" feel.

**REQUIREMENTS:**
1. **Consistent Visual Language**: Align the styling of the `Dashboard`, `Circuit`, and `Leaderboard` pages so they feel like parts of the same world.
2. **Sound Integration**: Fully integrate the `SoundEngine.ts` into key UX events (e.g., promotion alerts, match start, achievement unlocked).
3. **Real-time Feedback**: Enhance the `ActivityFeed.tsx` and `NotificationBell.tsx` to provide instant, high-signal updates on league changes.

---

## 📝 ARCHITECTURAL GUIDELINES FOR AI AGENTS
When modifying this project, the agent must:
- **Map the Dependency**: Before changing a service (e.g., `matchService.ts`), check which components (`Versus.tsx`, `Tournaments.tsx`) and which SQL tables it affects.
- **Type-First Development**: Update `src/types/` before changing logic to ensure TypeScript catches errors early.
- **Atomic Commits**: Use a strict commit convention: `feat:`, `fix:`, `refactor:`, `sql:`.
- **Stability over Speed**: No new features are to be added until the `build_error.txt` issues are resolved.
