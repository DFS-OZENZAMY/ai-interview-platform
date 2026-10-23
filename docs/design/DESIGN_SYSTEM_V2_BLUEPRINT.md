# AI Interview Platform — Design System V2 / Vibrant Human AI

Status: Proposed art direction baseline (visual system frozen for implementation; detailed screens subject to user approval)
Scope: entire application, candidate first; admin and coach future-ready.
Goal: warm, friendly, vibrant, educational, premium and accessible — not a generic management dashboard.

## 1. Art direction
Two coordinated contexts:
- **Light Experience**: landing, auth, onboarding, welcome, dashboard, preparation, post-interview analysis, feedback, history, profile.
- **Focus Experience**: immersive interview intro and live interview, deep navy / midnight with restrained luminous AI orb.

Do not impose dark mode on all screens or place glows behind body text.

## 2. Tokens
Core colors:
- electric-blue #5365FF
- vibrant-violet #884DFF
- dynamic-pink #F34CD4
- fresh-aqua #33D5D1
- deep-navy #111B3B
- midnight #0A1028
- cloud-white #F8F9FF
- soft-lilac #EEE9FF
- primary gradient linear-gradient(95deg,#5365FF,#884DFF,#F34CD4)

Typography: Geist or Inter; clear levels, regular body, strong headlines; no Arial as final typography.
Surfaces: radius 20-28px for cards, 12-16px for controls, diffuse drop shadows, sparing frosted translucency.
Buttons: high-contrast primary with subtle light gradient, transparent glass secondary, clear pressed/focus/disabled states.
Effects: glow is ambient behind containers, never beneath low-contrast copy. Avoid expensive fullscreen backdrop blurs.
Motion: microinteraction 180-350ms, route transition 400-650ms; opacity + transforms first; coordinated timing, interruption-safe. Respect prefers-reduced-motion, keyboard, focus visibility, color contrast.
Icons: Lucide in consistent stroke.
Voice: speaking/listening/thinking/error states distinguishable without color only.

## 3. Global navigation / structural principles
Public landing to sign-in to onboarding (first visit) to dashboard; existing users to dashboard, never label first-use sign-in 'welcome back'.
Candidate hub always has a single clear primary CTA; no duplicate navigation. Mobile responsive, no horizontal scroll.
Preserve app route semantics and Supabase auth/roles: user, coach, admin.
Personalization: goal and coaching preferences are stored in profile, prefilled per session, editable for session without overwriting profile.
CV import not part of onboarding. Job posting optional during preparation only.

## 4. Screen-by-screen specifications
| Priority | Screen / route | Desired user emotion | Core design / animation | Guardrails |
|---|---|---|---|---|
| P0 | Landing `/` | curiosity and confidence | vivid welcoming hero, preview orb, benefits, strong trial CTA | clear contrast and first-use messaging |
| P0 | Login `/login` | reassurance | airy card, contextual copy first/return visit, informative error states | preserve Supabase authentication |
| P0 | Password recovery `/auth/update-password` | safety | neutral friendly form, clear validation and success | no misleading success |
| P0 | Auth callback `/auth/callback` | continuity | gentle transitional state, no jarring jump | handle expiry/errors |
| P0 | Onboarding `/onboarding` | ownership | responsive selection cards, progressive steps, light vivid accent | preserve validated content, no CV |
| P0 | Post-onboarding welcome (part of onboarding/dashboard) | accomplishment | continuity of palette, short elevated intro | avoid abrupt light/dark break |
| P0 | Dashboard `/dashboard` | motivation | personalized hero, next-step coach nudge, progress, recents | do not invent scores before results |
| P0 | Preparation `/preparation` | readiness | progressive configurator, sticky summary, playful choices | job posting optional, profile defaults |
| P0 | Pre-interview intro `/interview` | calm focus | dark Focus Experience, living orb, voice-first | no fake audio text sync |
| P0 | Interview speaking/listening/thinking/paused/error/done `/interview` | safety and presence | clear voice states, mic affordance, contextual helper | true STT status, interruption, hands-free fallback |
| P0 | Analysis/loading (new flow) | anticipation | luminous elevated central card, ambient glow, real processing stages | no fabricated % or fake 94% accuracy |
| P0 | Debrief/result (planned) | constructive growth | performance summary, evidence, next actions, charts | no unsupported scores or diagnostics |
| P1 | History/progression (planned) | achievement | sortable timeline, skill trends, filters | empty state before first interview |
| P1 | Practice plan / coaching (planned) | companionship | suggested exercises, milestones, adaptive guidance | no misleading personalization |
| P1 | Profile/settings (planned) | control | clear profile preferences, audio, accessibility and privacy | secure preferences, explicit save |
| P1 | Role preview `/role-preview` | clarity | role-specific preview using same tokens | don't confuse candidate and admin views |
| P2 | Coach view (planned) | usefulness | structured dashboards, candidate insights with role rights | RBAC, privacy minimization |
| P2 | Admin view (planned) | oversight | operational monitoring, tables, filters, light mode | audit and access controls |
| Cross-cutting | Loading/empty/error/offline/toasts | trust | consistent copy, shimmer, recovery CTA | real states, no misleading success |

## 5. Component library
AppShell, AmbientBackground, GlowPanel, GlassCard, GradientButton, SecondaryGlassButton, ProgressIndicator, StatusPill, CoachMessage, GoalCard, VoiceOrb, InterviewQuestion, TranscriptPanel, InterviewProcessingCard, SkillScoreCard, InsightCard, ResultSummary, EmptyState, ErrorState, StepTransition.

Variants for light / focus contexts; tokens shared. Avoid creating visually similar duplicate components.

## 6. Behavior and tone
French-first, conversational but professional, confidence-building and non-patronizing. Feedback with evidence and actionable next steps; no invented progress, fake status, or false claims of AI insight.
Use warm phrases ('On prépare votre retour personnalisé') over mechanical phrases ('Traitement en cours 94.54% accuracy').

## 7. Execution sequence
0. Inventory screenshots and route flows, record baseline.
1. Tokens / typography / primitives and accessibility checks.
2. Reference screen: post-interview processing card (static design -> functioning loader).
3. Dashboard refresh and shared shell.
4. Auth + onboarding + continuity at landing/dashboard.
5. Preparation and pre-interview.
6. Immersive interview visual polish; voice/STT/TTS correctness is a separate functional track.
7. Debrief, history, coaching.
8. Admin and coach as their functionality is built.
9. Responsive, accessibility, performance review.

## 8. Definition of done per screen
- visual parity with approved design reference
- responsive at desktop/tablet/phone; no horizontal overflow
- meaningful empty/loading/error/success states
- WCAG-oriented contrast / keyboard focus / reduced motion
- animations performant and purposeful
- wording appropriate for first-time and returning users
- builds with eslint, TypeScript and Next.js
- no loss of existing business flows, role protection, or backend connectivity
- screenshots and acceptance review with project owner

Not yet done: visual implementation. This file is an architectural/design specification only.
