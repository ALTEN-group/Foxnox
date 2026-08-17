"use strict";

// Stamp forms with a client-side render time (same anti-bot idea as the
// DW Technologies contact form). No-JS bots keep the default "0".
for (const field of document.querySelectorAll("#renderedAt")) {
  field.value = String(Date.now());
}

const MIN_FILL_TIME_MS = 1500;

for (const form of document.querySelectorAll("form.form")) {
  form.addEventListener("submit", (event) => {
    const renderedAtField = form.querySelector("#renderedAt");
    const renderedAt = Number(renderedAtField?.value || 0);
    if (!renderedAt || Date.now() - renderedAt < MIN_FILL_TIME_MS) {
      event.preventDefault();
    }
  });
}
