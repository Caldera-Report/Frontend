<template>
  <footer class="site-footer" aria-label="Site Footer">
    <div class="site-footer__inner">
      <p class="site-footer__credit">
        Built by
        <router-link
          to="/player/4611686018463095984"
          target="_blank"
          class="site-footer__link"
          aria-label="ChopstickLeg on Twitter (opens in a new tab)"
          >ChopstickLeg</router-link
        >
        • Open Source on
        <a
          href="https://github.com/Caldera-Report"
          target="_blank"
          rel="noopener noreferrer"
          class="site-footer__link"
          aria-label="Caldera Report GitHub Organization (opens in a new tab)"
          >GitHub</a
        >
      </p>
      <p class="site-footer__meta">
        Found a bug? Got a feature request?
        <span class="nowrap"
          >Reach out on
          <a
            href="https://twitter.com/ChopstickLeg"
            target="_blank"
            rel="noopener noreferrer"
            class="site-footer__link"
            aria-label="Contact ChopstickLeg on Twitter (opens in a new tab)"
            >Twitter</a
          ></span
        >
        or open an issue on
        <a
          href="https://github.com/Caldera-Report/Frontend/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="site-footer__link"
          aria-label="Open an issue on the Caldera Report Frontend GitHub repo (opens in a new tab)"
          >GitHub</a
        >.
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts"></script>

<style scoped>
.site-footer {
  margin-top: var(--space-16);
  padding: var(--space-10) var(--space-6) var(--space-16);
  color: var(--color-text-dim, #b7b7c2);
  font-size: 0.875rem;
  line-height: 1.5;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.55) 40%,
    rgba(0, 0, 0, 0.85) 100%
  );
  border-top: 1px solid var(--color-border, #222);
}
.site-footer__inner {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-8);
  box-sizing: border-box;
}
.site-footer__credit,
.site-footer__meta {
  margin: 0;
}
.site-footer__link {
  color: var(--color-accent, #5dade2);
  text-decoration: none;
  font-weight: 500;
}
.site-footer__link:hover,
.site-footer__link:focus-visible {
  text-decoration: underline;
}
.nowrap {
  white-space: nowrap;
}
@media (min-width: 680px) {
  .site-footer__inner {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--space-12);
  }
  .site-footer__meta {
    text-align: right;
    max-width: 520px;
  }
}
</style>
