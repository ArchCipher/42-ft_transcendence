export default async function AccessibilityPage() {
  return (
  <>
	<h1>Accessibility Statement</h1>
      <p><strong>Last updated:</strong> 2026-09-17</p>

      <h2>Our commitment</h2>
      <p>
        synctext is committed to ensuring digital accessibility for all users, including people
        with disabilities. We aim to conform to the{' '}
        <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>.
      </p>

      <h2>What we have done</h2>
      <ul>
        <li>
          <strong>Semantic HTML</strong>: we use proper heading hierarchy, landmark regions (
          <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>,{' '}
          <code>&lt;footer&gt;</code>), and semantic elements (<code>&lt;section&gt;</code>,{' '}
          <code>&lt;article&gt;</code>).
        </li>
        <li>
          <strong>Keyboard navigation</strong>: all interactive elements (links, buttons, form
          inputs) are reachable and operable via keyboard. Focus states are visible.
        </li>
        <li>
          <strong>Color contrast</strong>: text and interactive elements meet WCAG 2.1 AA contrast
          ratios (minimum 4.5:1 for normal text, 3:1 for large text).
        </li>
        <li>
          <strong>Form labels</strong>: all form inputs have associated labels. Error messages are
          programmatically associated with their fields.
        </li>
        <li>
          <strong>Screen reader support</strong>: decorative elements are marked with{' '}
          <code>aria-hidden=&quot;true&quot;</code>. Meaningful images and icons have appropriate
          alternative text. The collaborative editor uses ARIA live regions to announce real-time
          changes.
        </li>
        <li>
          <strong>Skip link</strong>: a &ldquo;Skip to content&rdquo; link allows keyboard users to
          bypass the navigation.
        </li>
        <li>
          <strong>Responsive design</strong>: the interface adapts to different screen sizes and
          supports zoom up to 200% without loss of content or functionality.
        </li>
        <li>
          <strong>Reduced motion</strong>: we respect the <code>prefers-reduced-motion</code> media
          query &mdash; animations are disabled for users who have requested reduced motion in
          their operating system settings.
        </li>
      </ul>

      <h2>Known limitations</h2>
      <ul>
        <li>
          The real-time collaborative editor relies on WebSocket connections. If JavaScript is
          disabled, the editing functionality will not work. The application requires JavaScript to
          function.
        </li>
        <li>
          Third-party embedded content (if any is added in the future) may not fully conform to
          WCAG 2.1 AA.
        </li>
      </ul>

      <h2>Feedback</h2>
      <p>
        We welcome your feedback on the accessibility of synctext. If you encounter accessibility
        barriers or have suggestions for improvement, please contact us at [TODO: privacy contact email].
      </p>
  </>
  );
}
