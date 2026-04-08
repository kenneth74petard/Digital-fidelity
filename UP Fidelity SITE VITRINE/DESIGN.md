# Design System Specification: Editorial Innovation

## 1. Overview & Creative North Star
The core objective of this design system is to transform the "digital loyalty card" from a utilitarian tool into a premium lifestyle accessory. We are moving away from the cluttered, high-frequency "coupon" aesthetic toward a philosophy we call **"The Golden Curator."**

This system prioritizes breathing room, authoritative editorial typography, and a "light-first" approach that uses the warmth of amber and gold to evoke value and exclusivity. Instead of a rigid, predictable grid, we utilize intentional asymmetry—where elements like card balances or loyalty tiers may bleed off-edge or overlap—to create a sense of dynamic movement and modern sophistication.

---

## 2. Colors: Tonal Depth & The Amber Glow
Our palette is anchored in a pristine `surface` white and energized by vibrant yellows. The goal is to make the interface feel illuminated from within.

*   **Primary (`#7c5800`) & Primary Container (`#ffb800`):** These represent the "Gold Standard." Use the vibrant `primary_container` for high-impact moments (Action buttons, tier status) and the deeper `primary` for text clarity on light backgrounds.
*   **The "No-Line" Rule:** Visual separation must be achieved through tonal shifts, never 1px borders. A loyalty card (using `surface_container_lowest`) should sit on a background of `surface_container_low`. The eye should perceive the edge through the shift in value, not a stroke.
*   **Surface Hierarchy & Nesting:** Treat the UI as layers of physical paper.
    *   **Level 0:** `background` (#f9f9fc) – The canvas.
    *   **Level 1:** `surface_container_low` (#f3f3f6) – Section backing.
    *   **Level 2:** `surface_container_lowest` (#ffffff) – Individual cards or interactive nodes.
*   **The Glass & Gradient Rule:** For mobile overlays or "floating" navigation, use a 70% opacity `surface` with a 20px backdrop-blur. Apply a subtle linear gradient from `primary` to `primary_container` (at a 45-degree angle) for hero-state backgrounds to add "soul" to the digital experience.

---

## 3. Typography: The Editorial Voice
We utilize a pairing of **Plus Jakarta Sans** for characterful expression and **Manrope** for high-performance legibility.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "hero" voices. Use `display-lg` (3.5rem) with tight letter-spacing for landing moments. The wide, geometric nature of Jakarta Sans communicates innovation and confidence.
*   **Titles & Body (Manrope):** Manrope provides a technical, clean counterbalance. `body-lg` (1rem) is the workhorse for card details and loyalty descriptions.
*   **The "Authored" Look:** Always pair a `headline-md` with a `body-sm` in `on_surface_variant` (#514532). This high-contrast scale creates an editorial hierarchy that feels curated, not just "inputted."

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are largely prohibited. We define depth through environmental light and color.

*   **The Layering Principle:** To elevate a loyalty card, place a `#ffffff` (`surface-container-lowest`) card on an `#edeef1` (`surface-container`) background. The 5% difference in luminosity creates a sophisticated, clean lift.
*   **Ambient Shadows:** If a "Floating Action Button" or modal requires a shadow, it must be an "Amber Glow." Use the `primary` color at 6% opacity with a blur of 32px and an offset of Y: 12px. This mimics a soft, colored reflection rather than a generic grey shadow.
*   **The "Ghost Border" Fallback:** If accessibility requires a container definition, use `outline_variant` at 15% opacity. It should be felt, not seen.
*   **Glassmorphism:** Use for persistent headers. A background of `surface` at 80% with a `backdrop-filter: blur(12px)` ensures the gold accents of the content below create a beautiful, "frosted gold" bleed as the user scrolls.

---

## 5. Components: Refined Interaction

### Buttons
*   **Primary:** Solid `primary_container` (#ffb800) with `on_primary_container` (#6b4c00) text. Use `xl` (1.5rem) corner radius for a friendly, modern feel.
*   **Secondary:** A "Ghost" style. No background, `primary` text, and a `ghost border` (10% opacity `outline`).
*   **States:** On hover, the primary button should transition to a subtle gradient rather than a solid darker color.

### Loyalty Cards (The Hero Component)
*   **Layout:** Inspired by the reference image, cards should be vertically oriented.
*   **Content:** Use `surface_container_lowest` for the card body. Use the `primary_fixed` (#ffdea8) for a subtle "membership badge" chip in the top right.
*   **Constraint:** Forbid the use of divider lines. Separate the "Card Balance" from "Recent Activity" using 32px of vertical white space.

### Input Fields
*   **Style:** No bottom line. Use a `surface_container_high` background with a `sm` (0.25rem) radius.
*   **Focus State:** The background remains static, but the `label` transitions to the `primary` gold color.

### Progress Bars (Loyalty Trackers)
*   **Track:** `surface_container_highest`.
*   **Indicator:** A gradient from `primary` to `inverse_primary`. This "shimmer" effect denotes progress and value.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins (e.g., 24px left, 32px right) for headline elements to create an editorial feel.
*   **Do** use `primary_container` (#ffb800) sparingly as an accent to guide the eye to the "Redeem" action.
*   **Do** leverage the `xl` (1.5rem) roundedness for large containers to soften the "tech" feel.

### Don't:
*   **Don't** use black (#000000) for text. Always use `on_surface` (#1a1c1e) to maintain a premium, softer contrast.
*   **Don't** use 1px solid borders to separate list items. Use 16px of white space or a subtle `surface_variant` background shift.
*   **Don't** use standard "Material" shadows. If it looks like a default shadow, it is too heavy; reduce opacity until it is a mere suggestion of depth.
*   **Don't** crowd the interface. If you think there is enough white space, add 20% more. Premium design "breathes."