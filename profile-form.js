// Form helpers shared by the three edit profile pages.
import { escapeHtml } from "./profile-utils.js";

export const $ = (id) => document.getElementById(id);

export function value(key) {
  const el = $("f_" + key);
  return el ? String(el.value || "").trim() : "";
}

export function setValue(key, v) {
  const el = $("f_" + key);
  if (!el) return;
  if (el.tagName === "SELECT" && v && ![...el.options].some((o) => o.value === v)) {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    el.appendChild(opt);
  }
  el.value = v === undefined || v === null ? "" : v;
}

export function setError(key, message) {
  const err = $("e_" + key), wrap = $("w_" + key), input = $("f_" + key);
  if (err) err.textContent = message || "";
  if (wrap) wrap.classList.toggle("invalid", !!message);
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

export function clearErrors(keys) { keys.forEach((k) => setError(k, "")); }

export function focusFirstError(keys) {
  for (const k of keys) {
    const wrap = $("w_" + k);
    if (wrap && wrap.classList.contains("invalid")) {
      const input = $("f_" + k);
      if (input) { input.focus(); input.scrollIntoView({ block: "center", behavior: "smooth" }); }
      return;
    }
  }
}

export function fixedRows(rows) {
  const box = $("fixedInfo");
  if (!box) return;
  box.innerHTML = rows
    .map(([label, val]) => '<div class="ep-readonly-row"><span>' + escapeHtml(label) + "</span><span>" + escapeHtml(val || "-") + "</span></div>")
    .join("");
}

export function showForm() {
  const loading = $("pageLoading");
  if (loading) loading.hidden = true;
  const form = $("editForm");
  if (form) form.hidden = false;
}

export function showLoadError(message) {
  const loading = $("pageLoading");
  if (loading) loading.textContent = message;
}
