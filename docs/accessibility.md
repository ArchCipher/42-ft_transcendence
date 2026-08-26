# Accessibility Statement — synctext

**Last updated:** [TODO: date]

## Our commitment

synctext is committed to ensuring digital accessibility for all users, including people with disabilities. We aim to conform to the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA**.

## What we have done

- **Semantic HTML**: we use proper heading hierarchy, landmark regions (`<header>`, `<nav>`, `<main>`, `<footer>`), and semantic elements (`<section>`, `<article>`).
- **Keyboard navigation**: all interactive elements (links, buttons, form inputs) are reachable and operable via keyboard. Focus states are visible.
- **Color contrast**: text and interactive elements meet WCAG 2.1 AA contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text).
- **Form labels**: all form inputs have associated labels. Error messages are programmatically associated with their fields.
- **Screen reader support**: decorative elements are marked with `aria-hidden="true"`. Meaningful images and icons have appropriate alternative text. The collaborative editor uses ARIA live regions to announce real-time changes.
- **Skip link**: a "Skip to content" link allows keyboard users to bypass the navigation.
- **Responsive design**: the interface adapts to different screen sizes and supports zoom up to 200% without loss of content or functionality.
- **Reduced motion**: we respect the `prefers-reduced-motion` media query — animations are disabled for users who have requested reduced motion in their operating system settings.

## Known limitations

- The real-time collaborative editor relies on WebSocket connections. If JavaScript is disabled, the editing functionality will not work. The application requires JavaScript to function.
- Third-party embedded content (if any is added in the future) may not fully conform to WCAG 2.1 AA.

## Feedback

We welcome your feedback on the accessibility of synctext. If you encounter accessibility barriers or have suggestions for improvement, please contact us at **[TODO: privacy contact email]**
