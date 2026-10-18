# AGENTS.md — Antigravity Engineering Guidelines

## 🛑 STRICT PLANNING & USER APPROVAL PROTOCOL
Before modifying, replacing, or creating ANY source code or configuration files, the agent MUST:
1. Formulate and present a clear, step-by-step implementation plan.
2. Outline the exact files to be created or modified.
3. Explicitly request the USER's review and approval.
4. WAIT for the USER's confirmation ("Proceed", "Approved", etc.) before making file changes.
5. NEVER execute file-modifying tools during pure analysis or exploratory inquiries.

## ⚡ MANDATORY SESSION START
At the start of EVERY new conversation on this project:
1. Read `AI_DIARY.md` at the project root FIRST — this is your memory.
2. Follow `.agent/workflows/session_start.md` for the full protocol.
3. At the END of every session with meaningful code changes, UPDATE `AI_DIARY.md` changelog.

## 🎨 Design System
Always respect `apps/client/app/style.json` for color tokens, typography, and spacing.
Never inject dummy fallback data or mock subject cards anywhere in the application.
