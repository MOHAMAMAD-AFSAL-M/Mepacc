# MEPac — Design Tokens

This file defines the design system tokens for the MEPac PWA.  
All values are wired into `tailwind.config.js` so components use semantic class names, not raw values.

---

## Colors

### Brand
| Token            | Hex       | Usage                              |
|------------------|-----------|-------------------------------------|
| `primary`        | `#1E3A5F` | Primary buttons, active nav, headers |
| `primary-light`  | `#2D5A8E` | Hover states, secondary emphasis     |
| `primary-dark`   | `#152B47` | Pressed states                       |
| `accent`         | `#FF6B35` | CTAs, badges, highlights             |
| `accent-light`   | `#FF8F66` | Accent hover                         |

### Semantic
| Token      | Hex       | Usage              |
|------------|-----------|---------------------|
| `success`  | `#22C55E` | Completed, online   |
| `warning`  | `#F59E0B` | Pending, caution    |
| `error`    | `#EF4444` | Failed, destructive |
| `info`     | `#3B82F6` | Informational       |

### Surfaces
| Token            | Hex       | Usage                     |
|------------------|-----------|----------------------------|
| `surface`        | `#F8FAFC` | Page background            |
| `surface-card`   | `#FFFFFF` | Card backgrounds           |
| `surface-dark`   | `#1E293B` | Dark mode background       |
| `surface-darker` | `#0F172A` | Dark mode card/nav         |

### Text
| Token            | Hex       | Usage                   |
|------------------|-----------|--------------------------|
| `text-primary`   | `#0F172A` | Headings, body text      |
| `text-secondary` | `#64748B` | Captions, helper text    |
| `text-muted`     | `#94A3B8` | Disabled, placeholders   |
| `text-inverse`   | `#F8FAFC` | Text on dark backgrounds |

### Border
| Token     | Hex       |
|-----------|-----------|
| `default` | `#E2E8F0` |
| `strong`  | `#CBD5E1` |

---

## Typography

| Token     | Value                            |
|-----------|----------------------------------|
| `sans`    | `'Inter', system-ui, sans-serif` |
| `heading` | `'Inter', system-ui, sans-serif` |
| `mono`    | `'JetBrains Mono', ui-monospace, monospace` |

### Scale
| Name  | Size   | Weight | Line Height |
|-------|--------|--------|-------------|
| `xs`  | 12px   | 400    | 16px        |
| `sm`  | 14px   | 400    | 20px        |
| `base`| 16px   | 400    | 24px        |
| `lg`  | 18px   | 500    | 28px        |
| `xl`  | 20px   | 600    | 28px        |
| `2xl` | 24px   | 700    | 32px        |
| `3xl` | 30px   | 700    | 36px        |

---

## Spacing

Uses Tailwind defaults (4px grid) with these semantic additions:

| Token       | Value | Usage                    |
|-------------|-------|---------------------------|
| `nav-h`     | 64px  | Bottom navigation height  |
| `header-h`  | 56px  | Top header bar height     |
| `page-px`   | 16px  | Page horizontal padding   |
| `card-p`    | 16px  | Card internal padding     |
| `section-gap` | 24px | Gap between page sections |

---

## Border Radius

| Token  | Value   |
|--------|---------|
| `sm`   | 8px     |
| `md`   | 12px    |
| `lg`   | 16px    |
| `xl`   | 20px    |
| `full` | 9999px  |

---

## Shadows

| Token  | Value                                            |
|--------|--------------------------------------------------|
| `sm`   | `0 1px 2px rgba(0,0,0,0.05)`                    |
| `md`   | `0 4px 6px -1px rgba(0,0,0,0.1)`                |
| `lg`   | `0 10px 15px -3px rgba(0,0,0,0.1)`              |
| `card` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` |

---

## Transitions

| Token     | Value                          |
|-----------|--------------------------------|
| `fast`    | `150ms ease`                   |
| `default` | `200ms ease`                   |
| `slow`    | `300ms ease`                   |
