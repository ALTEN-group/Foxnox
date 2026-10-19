"use strict";

// Stamp forms with a client-side render time (same anti-bot idea as the
// ALTEN contact form). No-JS bots keep the default "0".
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

// Show/hide toggle on password fields. Buttons ship `hidden` so no-JS users
// never see a dead control.
for (const button of document.querySelectorAll("[data-password-toggle]")) {
  const input = document.getElementById(button.dataset.passwordToggle);
  if (!input) continue;
  button.hidden = false;
  button.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute(
      "aria-label",
      show ? button.dataset.hideLabel : button.dataset.showLabel,
    );
    button.classList.toggle("is-active", show);
  });
}

// Live password policy checklist. Rules mirror the server-side validator
// (passken/checkard); the server stays the source of truth.
const policyInput = document.querySelector("input[data-min-length]");
if (policyInput) {
  const minLength = Number(policyInput.dataset.minLength);
  const rules = {
    length: (v) => v.length >= minLength,
    lower: (v) => /[a-z]/.test(v),
    upper: (v) => /[A-Z]/.test(v),
    number: (v) => /\d/.test(v),
    symbol: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?°`€£§]/.test(v),
  };
  const items = document.querySelectorAll(".pwd-policy [data-rule]");
  const update = () => {
    for (const item of items) {
      item.classList.toggle(
        "is-met",
        rules[item.dataset.rule]?.(policyInput.value) ?? false,
      );
    }
  };
  policyInput.addEventListener("input", update);
  update();
}
