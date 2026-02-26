# Architecture

**Status**: Always on.

**Regel**: 
- Strikte Trennung von UI und Logik. 
- Verbot von Inline-Styles. 
- **UI-Stack**: Nutze ausschließlich shadcn/ui für Komponenten. Falls eine Komponente fehlt, schlage die Installation via `npx shadcn@latest add <component>` vor.
- **UX-Stack**: Nutze Framer Motion für alle Animationen (Transitions, Hover-Effekte, Layout-Animationen).
