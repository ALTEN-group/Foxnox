<script setup>
import { withBase } from "vitepress";
import { onBeforeUnmount, onMounted, ref } from "vue";

const demos = [
  {
    name: "admin-login",
    eyebrow: "Sign in",
    title: "Secure sign-in through your BFF",
    details:
      'Administrators authenticate through your BFF. Once signed in, they manage passwords, policies, tokens, trusted devices, security questions, branding and the audit log from one panel.',
    link: "/guide/overview",
  },
  {
    name: "admin-edit-form",
    eyebrow: "Manage",
    title: "Every entity, fully manageable",
    details:
      "Create, edit, archive and restore any record from ready-made CRUD screens. Forms follow the API schema, so each field shows a clear error message when a value is missing or out of range.",
    link: "/guide/frontend#calling-the-admin-api",
  },
  {
    name: "admin-table-preferences",
    eyebrow: "Organize",
    title: "Tables shaped to each administrator",
    details:
      "Pick the columns that matter, save them as a named view, and find it again on the next visit: views are stored server side, per user and per table.",
    link: "/guide/overview",
  },
];

const videos = ref([]);
let observer = null;

// Each video plays only while on screen, and never for users who asked for less motion.
onMounted(() => {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) target.play().catch(() => undefined);
        else target.pause();
      }
    },
    { threshold: 0.4 },
  );
  for (const video of videos.value) observer.observe(video);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section class="admin-demos">
    <header class="intro">
      <p class="eyebrow">Admin panel</p>
      <h2>See it in action</h2>
      <p class="lead">
        Everything Foxnox stores can be inspected and managed from its Angular admin, without a
        line of SQL.
      </p>
    </header>

    <article v-for="(demo, index) in demos" :key="demo.name" class="demo" :class="{ reversed: index % 2 }">
      <div class="frame">
        <video
          ref="videos"
          :src="withBase(`/videos/${demo.name}.mp4`)"
          :poster="withBase(`/videos/${demo.name}.jpg`)"
          :aria-label="demo.title"
          muted
          loop
          playsinline
          controls
          preload="none"
        ></video>
      </div>
      <div class="text">
        <p class="eyebrow">{{ demo.eyebrow }}</p>
        <h3>{{ demo.title }}</h3>
        <p v-html="demo.details"></p>
        <a :href="withBase(demo.link)" class="more">Learn more →</a>
      </div>
    </article>
  </section>
</template>

<style scoped>
.admin-demos {
  max-width: 1152px;
  margin: 0 auto;
  padding: 64px 24px 96px;
}

.intro {
  max-width: 640px;
  margin: 0 auto 56px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

h2 {
  margin: 0;
  font-size: 32px;
  line-height: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.lead {
  margin: 16px 0 0;
  font-size: 18px;
  line-height: 28px;
  color: var(--vp-c-text-2);
}

.demo {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: center;
}

.demo + .demo {
  margin-top: 72px;
}

.frame {
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 24px 48px -24px rgba(0, 0, 0, 0.35);
}

video {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  background: var(--vp-c-bg-alt);
}

h3 {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
}

.text p:not(.eyebrow) {
  margin: 0;
  line-height: 26px;
  color: var(--vp-c-text-2);
}

.text p :deep(a) {
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.more {
  display: inline-block;
  margin-top: 16px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.more:hover {
  text-decoration: underline;
}

@media (min-width: 960px) {
  .demo {
    grid-template-columns: 3fr 2fr;
    gap: 48px;
  }

  .demo.reversed {
    grid-template-columns: 2fr 3fr;
  }

  .demo.reversed .frame {
    order: 2;
  }

  h2 {
    font-size: 40px;
    line-height: 48px;
  }
}
</style>
