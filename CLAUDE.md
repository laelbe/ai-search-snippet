# CLAUDE.md - AI Assistant Guide

## Project Overview

**nlweb-cl-snippet** is a production-ready, zero-dependency TypeScript Web Component library providing search and chat interfaces with streaming support for AI-powered search APIs.

- **Version:** 0.0.3
- **Key Features:** Zero dependencies, framework-agnostic, Shadow DOM encapsulation, streaming support, WCAG 2.1 AA compliant

## Quick Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Build both app and library
npm run build:lib        # Build library only
npm run build:app        # Build demo app for Cloudflare Workers

# Code Quality
npm run lint             # Run Biome linter
npm run lint:fix         # Auto-fix lint issues
npm run format           # Format code with Biome
npm run format:check     # Check formatting
npm run check            # Full Biome check with fixes

# Type Checking
npx tsc --noEmit         # Type check without emitting

# Preview/Deploy
npm run preview          # Preview production build
npx wrangler deploy      # Deploy to Cloudflare Workers (requires auth)
```

## Project Structure

```
src/
├── api/
│   ├── index.ts              # Base Client abstract class
│   └── ai-search.ts          # AISearchClient - main API client with streaming
├── components/
│   ├── search-bar-snippet.ts # <search-bar-snippet> - search input with results
│   ├── chat-bubble-snippet.ts # <chat-bubble-snippet> - floating chat bubble
│   ├── chat-page-snippet.ts  # <chat-page-snippet> - full-page chat with history
│   └── chat-view.ts          # Shared ChatView class (not a web component)
├── styles/
│   ├── theme.ts              # Base CSS variables and common styles
│   ├── chat.ts               # Chat-specific styles
│   └── search.ts             # Search-specific styles
├── types/
│   └── index.ts              # TypeScript interfaces and types
├── utils/
│   ├── index.ts              # Utility functions (debounce, sanitize, etc.)
│   └── markdown.ts           # Markdown-to-HTML converter
└── main.ts                   # Library entry point and exports
```

## Architecture

### Web Components (3 exported)

| Component | Tag | Purpose |
|-----------|-----|---------|
| `SearchBarSnippet` | `<search-bar-snippet>` | Search input with results dropdown |
| `ChatBubbleSnippet` | `<chat-bubble-snippet>` | Floating chat bubble overlay |
| `ChatPageSnippet` | `<chat-page-snippet>` | Full-page chat with session history |

### Build Output

| Format | Location | Use Case |
|--------|----------|----------|
| ESM | `dist/search-snippet.es.js` | Modern bundlers (Vite, Webpack, etc.) |
| UMD | `dist/search-snippet.umd.js` | CDN/script tag usage |
| Types | `dist/main.d.ts` | TypeScript definitions |

## Code Style & Conventions

### Biome Configuration (biome.json)

- **Indent:** 2 spaces
- **Quotes:** Single quotes
- **Semicolons:** Always required
- **Trailing commas:** ES5 style
- **Line width:** 100 characters

### TypeScript (tsconfig.json)

- **Target:** ES2022
- **Module:** ESNext with bundler resolution
- **Strict mode:** Enabled with all strict flags
- **Key flags:** `useDefineForClassFields`, `verbatimModuleSyntax`, `erasableSyntaxOnly`

## Key Patterns

### Web Component Registration

Always guard against duplicate registration:

```typescript
const COMPONENT_NAME = 'my-component';

if (!customElements.get(COMPONENT_NAME)) {
  customElements.define(COMPONENT_NAME, MyComponent);
}
```

### Event Handler Cleanup

Store handler references for proper cleanup:

```typescript
private handleClick: ((e: Event) => void) | null = null;

private attachEventListeners(): void {
  this.handleClick = (e: Event) => { /* ... */ };
  this.element.addEventListener('click', this.handleClick);
}

private cleanup(): void {
  if (this.handleClick) {
    this.element.removeEventListener('click', this.handleClick);
  }
  this.handleClick = null;
}
```

### Custom Events (Cross Shadow DOM)

```typescript
import { createCustomEvent } from '../utils';

this.dispatchEvent(createCustomEvent('search-complete', { results }));
```

Events use `composed: true` to cross Shadow DOM boundaries.

### CSS-in-JS Pattern

Styles are exported as template literals and injected into Shadow DOM:

```typescript
import { baseStyles } from '../styles/theme';
import { chatStyles } from '../styles/chat';

const style = document.createElement('style');
style.textContent = `${baseStyles}\n${chatStyles}`;
this.shadow.appendChild(style);
```

### Streaming with Async Generators

```typescript
async *chat(query: string): AsyncGenerator<ChatTypes, void, undefined> {
  const response = await this.request(/* ... */);
  // Process and yield streaming results
  yield { type: 'text', message: content };
}
```

### Security

Always sanitize user content:

```typescript
import { escapeHTML } from '../utils';

element.innerHTML = escapeHTML(userContent);
```

## API Endpoints Expected

The components expect a backend API with these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/search` | POST | Standard search (non-streaming) |
| `/ai-search` | POST | AI-powered search (streaming SSE) |
| `/chat/completions` | POST | Chat completions (OpenAI-compatible) |

## Component Attributes

### Common Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `api-url` | string | `http://localhost:3000` | API endpoint URL |
| `placeholder` | string | Mode-specific | Input placeholder text |
| `theme` | `light\|dark\|auto` | `auto` | Color scheme |
| `max-results` | number | 10 | Maximum search results |
| `debounce-ms` | number | 300 | Search debounce delay |

## CSS Custom Properties

Components expose 50+ CSS variables for theming. Key prefixes:

- `--search-snippet-*` - Search bar styling
- `--chat-bubble-*` - Chat bubble styling

Example categories: colors, typography, spacing, shadows, z-index.

## CI/CD Pipeline

1. **PR Checks** - Lint + type check on all PRs
2. **Create Release** - Triggered on `v*` tag push
3. **Deploy Workers** - Auto-deploys demo after release
4. **Upload R2** - Uploads to CDN after release
5. **Publish NPM** - Publishes to NPM after release

## Important Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Library entry point - exports all components |
| `src/api/ai-search.ts` | Main API client with streaming support |
| `src/types/index.ts` | All TypeScript interfaces |
| `vite.build.config.ts` | Library build configuration |
| `vite.config.ts` | Demo app build configuration |
| `wrangler.jsonc` | Cloudflare Workers configuration |

## Testing

- **Framework:** Vitest (configured but no tests present)
- **Run:** `npx vitest`
- **Pattern:** `*.test.ts` or `*.spec.ts` files

## Bundle Size Target

- Target: < 50KB gzipped
- Current: ~10KB gzipped (80% under target)

## Documentation

- `README.md` - User documentation (installation, API, examples)
- `IMPLEMENTATION.md` - Technical implementation details
- `COLLAPSIBLE_SEARCH.md` - Collapsible search feature docs
