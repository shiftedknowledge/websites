#!/usr/bin/env node
//
// buttondown.mjs — a thin, dependency-free CLI over the Buttondown API.
//
//   scripts/buttondown.mjs whoami
//   scripts/buttondown.mjs subscribers
//   scripts/buttondown.mjs list [--status draft]
//   scripts/buttondown.mjs show <id>
//   scripts/buttondown.mjs push <file.md>
//   scripts/buttondown.mjs send <id> --yes
//
// Site-agnostic on purpose: it knows nothing about Moment Hill. Point it at a
// different key and it drives a different newsletter, which is what keeps the
// n+1 scheme intact.
//
// Safety, deliberately:
//   * X-API-Version is pinned to 2026-04-01, whose default status is `draft`.
//     Older versions defaulted to `about_to_send` — i.e. straight to the whole
//     list. The pin is the difference between a mistake and an incident.
//   * `push` always writes a draft. It has no path to sending, ever.
//   * `send` is the only command that mails anyone, and it refuses without
//     --yes. It is the button, and it stays under a human thumb.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

const API = "https://api.buttondown.com/v1";
const API_VERSION = "2026-04-01";

// ---------------------------------------------------------------- environment

// Prefer a real env var; otherwise read ~/.env directly so the script works
// whether or not the shell happened to source it.
function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const text = readFileSync(join(homedir(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === name) return m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no ~/.env; fall through */
  }
  return undefined;
}

function apiKey() {
  const key = env("BUTTONDOWN_API_KEY");
  if (!key) {
    die(
      "BUTTONDOWN_API_KEY is empty.\n" +
        "Create a key at buttondown.com > Settings > API > Keys, pinned to API\n" +
        "version 2026-04-01, with Emails=Read & write, Subscribers=Read,\n" +
        "Styling=Read & write, Sending=Disabled, everything else None.\n" +
        "Then paste it into ~/.env. See docs/newsletter.md.",
    );
  }
  return key;
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

// ------------------------------------------------------------------- requests

// `soft: true` returns {ok, status, code, detail, data} instead of exiting, for
// callers that need to survive a partial failure — chiefly `design push`, where
// one field being locked behind a paid plan must not discard the others.
async function api(path, { method = "GET", body, dangerously = false, soft = false } = {}) {
  const headers = {
    Authorization: `Token ${apiKey()}`,
    "X-API-Version": API_VERSION,
  };
  if (body) headers["Content-Type"] = "application/json";
  if (dangerously) headers["X-Buttondown-Live-Dangerously"] = "true";

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok && soft) {
    return {
      ok: false,
      status: res.status,
      code: data?.code,
      detail: data?.detail ?? (typeof data === "string" ? data : JSON.stringify(data)),
    };
  }

  if (!res.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    if (res.status === 401 || res.status === 403) {
      die(
        `Buttondown says ${res.status}. Either the key is wrong, or it lacks the\n` +
          `permission this call needs. Check Settings > API > Keys.\n\n${detail}`,
      );
    }
    die(`Buttondown ${method} ${path} failed (${res.status}):\n${detail}`);
  }
  return data;
}

// ---------------------------------------------------------------- frontmatter

// A minimal YAML-subset parser. It handles exactly the flat `key: value` shape
// our newsletter frontmatter uses and nothing more, on the grounds that a
// dependency-free script beats a general one we do not need.
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };

  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim().replace(/\s+#.*$/, "");
    value = value.replace(/^["']|["']$/g, "");
    data[kv[1]] = value;
  }
  return { data, body: m[2] };
}

// Rewrite one frontmatter key in place, preserving everything else byte for
// byte. Used only to stamp buttondown_id back onto the file.
function stampFrontmatter(raw, key, value) {
  const re = new RegExp(`^(${key}\\s*:).*$`, "m");
  if (re.test(raw)) return raw.replace(re, `$1 ${value}`);
  return raw.replace(/^---\r?\n/, `---\n${key}: ${value}\n`);
}

// ------------------------------------------------------------------- commands

async function cmdWhoami() {
  const data = await api("/newsletters", { soft: true });
  if (data?.ok === false) {
    die(
      `Cannot read the newsletter (${data.status}).\n\n` +
        "`whoami`, `settings` and `design` all read /v1/newsletters, which needs\n" +
        "Settings permission. The key is likely scoped without it — that is a\n" +
        "deliberate posture, not a fault. `push`, `send`, `list` and\n" +
        "`subscribers` are unaffected.",
    );
  }
  const list = data.results ?? [];
  if (!list.length) die("The key is valid but no newsletters came back.");

  console.log(`API works on this plan. ${list.length} newsletter(s):\n`);
  for (const n of list) {
    console.log(`  username : ${n.username}`);
    console.log(`  name     : ${n.name ?? "(unnamed)"}`);
    console.log(`  id       : ${n.id}`);
    console.log(`  archive  : https://buttondown.com/${n.username}`);
    console.log("");
  }
  const configured = env("BUTTONDOWN_NEWSLETTER");
  const actual = list[0].username;
  if (configured && configured !== actual) {
    console.log(
      `NOTE: ~/.env has BUTTONDOWN_NEWSLETTER=${configured} but the API says` +
        ` "${actual}".\n      Fix ~/.env and configs/user.config.ts — the signup` +
        ` form 404s silently on a wrong slug.`,
    );
  }
}

async function cmdSubscribers() {
  const data = await api("/subscribers?type=regular");
  console.log(`${data.count} confirmed subscriber(s).`);
  for (const s of (data.results ?? []).slice(0, 25)) {
    console.log(`  ${s.email_address ?? s.email}  (${s.type})`);
  }
}

async function cmdList(args) {
  const i = args.indexOf("--status");
  const q = i !== -1 && args[i + 1] ? `?status=${encodeURIComponent(args[i + 1])}` : "";
  const data = await api(`/emails${q}`);
  const rows = data.results ?? [];
  if (!rows.length) return console.log("No emails.");
  for (const e of rows) {
    console.log(`${e.status.padEnd(14)} ${e.id}  ${e.subject}`);
  }
}

async function cmdShow(id) {
  if (!id) die("usage: buttondown.mjs show <id>");
  console.log(JSON.stringify(await api(`/emails/${id}`), null, 2));
}

async function cmdPush(file) {
  if (!file) die("usage: buttondown.mjs push <file.md>");

  const raw = readFileSync(file, "utf8");
  const { data, body } = parseFrontmatter(raw);

  if (!data.subject) die(`${basename(file)} has no \`subject\` in its frontmatter.`);
  if (!body.trim()) die(`${basename(file)} has no body.`);
  if (data.status && data.status !== "ready") {
    die(
      `${basename(file)} is \`status: ${data.status}\`. Only \`ready\` gets pushed.\n` +
        "That field is the editorial gate — set it when you have signed the issue off.",
    );
  }

  // The API 400s on a body that opens with `---`, reading it as stray
  // frontmatter. We strip ours above; the editor-mode comment then pins the
  // body to markdown rather than leaving detection to a heuristic.
  const payload = {
    subject: data.subject,
    body: `<!-- buttondown-editor-mode: plaintext -->\n${body.trim()}`,
    status: "draft",
  };
  if (data.description) payload.description = data.description;

  const existing = data.buttondown_id;
  const email = existing
    ? await api(`/emails/${existing}`, { method: "PATCH", body: payload })
    : await api("/emails", { method: "POST", body: payload });

  if (!existing) {
    writeFileSync(file, stampFrontmatter(raw, "buttondown_id", email.id), "utf8");
  }

  console.log(`${existing ? "Updated" : "Created"} draft ${email.id}`);
  console.log(`  subject : ${email.subject}`);
  console.log(`  status  : ${email.status}`);
  console.log(`\nReview it in Buttondown, then send with:\n  scripts/buttondown.mjs send ${email.id} --yes`);
}

// The email design lives on the newsletter object, not on any email: `header`
// and `footer` are HTML with template tags, `css` styles the sent mail. Keeping
// them as files here is the same bargain as sites.yml — the dashboard is where
// it takes effect, but git is where it is readable.
//
// (`web_css` styles the public archive and is deliberately not managed here.
// Add it if the archive ever matters.)
const DESIGN = [
  ["header", "header.html"],
  ["footer", "footer.html"],
  ["css", "email.css"],
];

async function newsletterId() {
  const data = await api("/newsletters");
  const first = (data.results ?? [])[0];
  if (!first) die("No newsletter came back from the API.");
  return first;
}

// The newsletter object carries the account's own API key. Never print the
// whole thing; this shows only what is useful for configuring the newsletter.
const SETTINGS_FIELDS = [
  "username", "name", "description", "from_name", "email_address",
  "reply_to_address", "email_domain", "sending_domain_status", "domain",
  "hosting_domain_status", "test_mode", "locale", "timezone", "tint_color",
  "archive_theme", "subscription_redirect_url",
  "subscription_confirmation_redirect_url", "sharing_networks", "socials",
  "enabled_features", "template", "custom_email_template",
];

async function cmdSettings() {
  const n = await newsletterId();
  for (const f of SETTINGS_FIELDS) {
    const v = n[f];
    const shown =
      v === undefined ? "(absent)"
      : v === null ? "(null)"
      : v === "" ? "(empty)"
      : typeof v === "object" ? JSON.stringify(v)
      : String(v);
    console.log(`${f.padEnd(40)} ${shown}`);
  }
}

async function cmdDesign(sub, dir) {
  if (!["pull", "push"].includes(sub) || !dir) {
    die("usage: buttondown.mjs design <pull|push> <dir>");
  }
  const n = await newsletterId();

  if (sub === "pull") {
    mkdirSync(dir, { recursive: true });
    for (const [field, file] of DESIGN) {
      const path = join(dir, file);
      const value = n[field] ?? "";

      // Never let an empty remote value destroy real local work. `css` is
      // empty on the server because the free plan refuses to store it, not
      // because nobody wrote any — blanking the file would throw the design
      // away and look like a successful sync.
      if (value === "" && existsSync(path) && readFileSync(path, "utf8").trim() !== "") {
        console.log(`kept     ${field} (remote empty, local not — refusing to blank ${file})`);
        continue;
      }

      writeFileSync(path, value, "utf8");
      console.log(`${value === "" ? "empty   " : "pulled  "} ${field} -> ${path}`);
    }
    return;
  }

  // One PATCH per field, not one for all three. Buttondown rejects the whole
  // request if any single field is gated by the plan — `css` is, on free — and
  // a combined call would silently discard a perfectly good header and footer
  // because of it.
  let applied = 0;
  let blocked = 0;
  for (const [field, file] of DESIGN) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      console.log(`skipped  ${field} (no ${file})`);
      continue;
    }
    const res = await api(`/newsletters/${n.id}`, {
      method: "PATCH",
      body: { [field]: readFileSync(path, "utf8") },
      soft: true,
    });

    if (res?.ok === false) {
      blocked++;
      console.log(`BLOCKED  ${field}: ${res.code ?? res.status} — ${res.detail}`);
    } else {
      applied++;
      console.log(`applied  ${field}`);
    }
  }

  if (!applied && !blocked) die(`Nothing to push: no design files in ${dir}`);
  console.log(`\n${applied} applied, ${blocked} blocked, on ${n.username}.`);
  if (blocked) {
    console.log("Blocked fields are plan restrictions, not bugs. The files stay");
    console.log("here as the intended design; see docs/newsletter.md.");
  }
  console.log("Design applies to mail sent from now on; drafts re-render on send.");
}

async function cmdSend(id, args) {
  if (!id) die("usage: buttondown.mjs send <id> --yes");

  const email = await api(`/emails/${id}`);
  if (email.status !== "draft") {
    die(`Email ${id} is "${email.status}", not a draft. Refusing.`);
  }

  if (!args.includes("--yes")) {
    const { count } = await api("/subscribers?type=regular");

    // Reading test_mode needs Settings permission, which the key may not have.
    // That must never block a send: the warning is a convenience, sending is
    // the job. Degrade to the cautious wording rather than failing.
    const res = await api("/newsletters", { soft: true });
    const testMode = res?.ok === false ? null : (res.results ?? [])[0]?.test_mode;

    die(
      testMode === true
        ? `About to send "${email.subject}".\n` +
            `TEST MODE IS ON: it goes to the account address only. The ${count} ` +
            `subscriber(s)\non the list receive nothing, and the email stays a draft.\n` +
            "Re-run with --yes."
        : testMode === false
          ? `About to send "${email.subject}" to ${count} subscriber(s).\n` +
              "TEST MODE IS OFF. This is the real list and it cannot be undone.\n" +
              "Re-run with --yes if that is what you want."
          : `About to send "${email.subject}" to ${count} subscriber(s).\n` +
              "Could not read test mode (the key lacks Settings permission), so\n" +
              "ASSUME THIS IS THE REAL LIST and cannot be undone.\n" +
              "Re-run with --yes if that is what you want.",
    );
  }

  // The empty object is load-bearing. send-draft requires a JSON body; with no
  // body at all it 422s with "field required: payload". The body IS the
  // payload, so an empty object means "send with defaults" — a nested
  // {payload: {}} is rejected as an extra input.
  await api(`/emails/${id}/send-draft`, { method: "POST", body: {}, dangerously: true });

  console.log(`Sent "${email.subject}".`);
  console.log(
    "In test mode the send goes to the account address only, and the email\n" +
      "stays a draft, so this does not consume it.",
  );
}

// ---------------------------------------------------------------------- entry

const [cmd, ...args] = process.argv.slice(2);

const commands = {
  whoami: () => cmdWhoami(),
  subscribers: () => cmdSubscribers(),
  list: () => cmdList(args),
  show: () => cmdShow(args[0]),
  push: () => cmdPush(args[0]),
  send: () => cmdSend(args[0], args),
  design: () => cmdDesign(args[0], args[1]),
  settings: () => cmdSettings(),
};

if (!commands[cmd]) {
  console.error(
    "usage: buttondown.mjs <command>\n\n" +
      "  whoami                 verify the key, print the real newsletter username\n" +
      "  subscribers            confirmed subscriber count\n" +
      "  list [--status draft]  emails, newest first\n" +
      "  show <id>              full JSON for one email\n" +
      "  push <file.md>         create/update a DRAFT from a markdown file\n" +
      "  send <id> --yes        send a draft. Irreversible.\n" +
      "  design pull <dir>      newsletter header/footer/css -> files\n" +
      "  design push <dir>      files -> newsletter header/footer/css\n" +
      "  settings               newsletter settings (key redacted)\n",
  );
  process.exit(2);
}

await commands[cmd]();
