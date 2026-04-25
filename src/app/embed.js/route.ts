import { NextResponse } from "next/server";

/**
 * Public loader served from a stable URL. Churches paste one line into
 * their site:
 *
 *   <script src="https://doctrinally.ai/embed.js"
 *           data-church-key="dai_pk_..." async></script>
 *
 * Optional attributes:
 *   data-position="left" | "right"   — default "right"
 *   data-preview-mode="true"         — launcher only, no outreach /
 *                                       prospect capture. Useful for
 *                                       Squarespace/Webflow editor
 *                                       previews whose origins aren't
 *                                       in the church's allowlist.
 *
 * This loader is a single vanilla-JS IIFE. No frameworks, no eval.
 * All UI lives in an attached Shadow DOM (mode: open — closed is
 * defeatable via host monkey-patching and just costs us
 * debuggability). Styles can't bleed in either direction.
 *
 * Transport — plain `fetch` for config / session / outreach / prospect
 * endpoints; streaming chat uses `fetch` + `response.body.getReader()`
 * + `TextDecoder`, parsing the same wire protocol the member chat
 * client uses (zero-width-space chunk delimiters + `__CHAT_ID__` /
 * `__CITATIONS__` trailing sentinels).
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const script = LOADER_TEMPLATE.replace(/__APP_URL__/g, appUrl);

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // 5-minute cache. The loader is small (~20KB), so re-fetching
      // every few minutes on repeat visits is cheap, and we want the
      // window between "ship a security fix" and "every browser has
      // it" to be short. The per-church config lives at
      // /api/embed/config/[key] with a 60 s TTL — the loader's
      // refresh cycle is the upper bound on patch propagation.
      "Cache-Control": "public, max-age=300, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ──────────────────────────────────────────────────────────────────
// Loader template (sent verbatim to the browser).
// Template hole: __APP_URL__
// ──────────────────────────────────────────────────────────────────

const LOADER_TEMPLATE = String.raw`(function(){
  "use strict";
  if (window.__doctrinallyEmbedLoaded) return;
  window.__doctrinallyEmbedLoaded = true;

  var APP_URL = "__APP_URL__";
  var CHUNK_BOUNDARY = "\u200B\u200B";
  var CHAT_ID_SENTINEL = "\n__CHAT_ID__";
  var CITATION_SENTINEL = "\n__CITATIONS__";
  var PROSPECT_SENTINEL = "\n__PROSPECT__";
  var MAX_MSG_CHARS = 1000;
  var CONFIG_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  var PAGEVIEW_DEDUPE_MS = 30 * 60 * 1000;  // 30 minutes

  var scriptEl = document.currentScript || (function(){
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf("/embed.js") !== -1) return all[i];
    }
    return null;
  })();
  if (!scriptEl) return;

  var KEY = scriptEl.getAttribute("data-church-key");
  if (!KEY) {
    console.warn("[doctrinally] missing data-church-key on embed script");
    return;
  }
  var POSITION = (scriptEl.getAttribute("data-position") || "right").toLowerCase();
  var IS_LEFT = POSITION === "left";
  var PREVIEW_MODE = scriptEl.getAttribute("data-preview-mode") === "true";

  var STORAGE_KEY = "doctrinally_widget_" + KEY;
  var OUTREACH_KEY = "doctrinally_widget_outreach_" + KEY;
  var CONFIG_KEY = "doctrinally_widget_config_" + KEY;
  var PAGEVIEWS_KEY = "doctrinally_widget_pageviews_" + KEY;
  var EMAIL_PROMPT_KEY = "doctrinally_widget_email_prompted_" + KEY;

  // ── Shared state ──────────────────────────────────────────────
  var state = {
    config: null,
    token: null,
    chatId: null,
    open: false,
    sending: false,
    outreachSent: false,
    awaitingOutreach: false,
    prospectCaptured: false,
    // Tracks whether at least one full assistant reply to a user
    // message has completed this page visit. Drives the "show email
    // form after the first reply" trigger (concern #5).
    firstReplyCompleted: false,
    // True if the visitor already got the inline email prompt at
    // some point — we don't want to re-prompt them every page visit.
    emailPrompted: false,
    // Count of user messages sent from this page load only (reset
    // every page). The server holds the full history via summary.
    userMessagesThisVisit: 0,
    // Populated from localStorage. Used by the trigger logic to
    // decide which outreach path (entry page vs. second page) applies.
    pageViews: 1
  };

  // ── localStorage warm-up ──────────────────────────────────────
  // Read whatever we previously saved so the first paint can
  // happen without any network call if we have a cached config.
  try {
    state.token = localStorage.getItem(STORAGE_KEY) || null;
    state.outreachSent = localStorage.getItem(OUTREACH_KEY) === "1";
    state.emailPrompted = localStorage.getItem(EMAIL_PROMPT_KEY) === "1";
  } catch (_) {}

  var cachedConfig = readCachedConfig();

  // Pageview tracking — used by the trigger logic to know whether
  // this is the visitor's entry page or a subsequent navigation.
  updatePageviewCounter();

  // ── Bootstrap ────────────────────────────────────────────────
  // If we have a fresh-enough cached config, render immediately
  // (no network blocking first paint) and refresh config in the
  // background. If no cache, fetch config before rendering.
  if (cachedConfig) {
    state.config = cachedConfig;
    renderWidget();
    handshake();
    // Background refresh — keeps cache warm, updates visible colors
    // and church name if the admin changed them.
    fetchConfig(function(fresh){
      if (fresh) {
        state.config = fresh;
        saveCachedConfig(fresh);
      }
    });
  } else {
    fetchConfig(function(config){
      if (!config) return;
      state.config = config;
      saveCachedConfig(config);
      renderWidget();
      handshake();
    });
  }

  function readCachedConfig(){
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.fetchedAt || !parsed.config) return null;
      if (Date.now() - parsed.fetchedAt > CONFIG_CACHE_TTL_MS) return null;
      return parsed.config;
    } catch (_) { return null; }
  }

  function saveCachedConfig(config){
    try {
      localStorage.setItem(
        CONFIG_KEY,
        JSON.stringify({ config: config, fetchedAt: Date.now() })
      );
    } catch (_) {}
  }

  function fetchConfig(done){
    fetch(APP_URL + "/api/embed/config/" + encodeURIComponent(KEY), {
      method: "GET",
      mode: "cors",
      credentials: "omit"
    }).then(function(res){
      return res.ok ? res.json() : null;
    }).then(done).catch(function(){ done(null); });
  }

  function updatePageviewCounter(){
    try {
      var raw = localStorage.getItem(PAGEVIEWS_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      var now = Date.now();
      if (parsed && parsed.lastPath === location.pathname &&
          now - (parsed.lastVisitAt || 0) < PAGEVIEW_DEDUPE_MS) {
        // Same-page reload within 30 min — don't increment.
        state.pageViews = parsed.count || 1;
        parsed.lastVisitAt = now;
        localStorage.setItem(PAGEVIEWS_KEY, JSON.stringify(parsed));
        return;
      }
      var count = (parsed && parsed.count ? parsed.count : 0) + 1;
      state.pageViews = count;
      localStorage.setItem(
        PAGEVIEWS_KEY,
        JSON.stringify({
          count: count,
          lastPath: location.pathname,
          lastVisitAt: now
        })
      );
    } catch (_) {
      state.pageViews = 1;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────

  var ui = {}; // filled by renderWidget

  // Resolve a UI element by class. Falls back to a fresh shadow-DOM
  // query if ui[key] is missing — defensive against edge cases where
  // the bulk ui assignment in renderWidget doesn't take or gets clobbered.
  function el(key, selector){
    if (ui[key]) return ui[key];
    var host = document.getElementById("doctrinally-embed-host");
    var shadow = host && host.shadowRoot;
    return shadow ? shadow.querySelector(selector) : null;
  }

  function renderWidget(){
    var primary = (state.config && state.config.primaryColor) || "#4A2C2A";
    var host = document.createElement("div");
    host.id = "doctrinally-embed-host";
    host.style.cssText = "all: revert;";
    var shadow = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent = widgetCss(primary, IS_LEFT);
    shadow.appendChild(style);

    var root = document.createElement("div");
    root.className = "dai-root " + (IS_LEFT ? "dai-left" : "dai-right");
    shadow.appendChild(root);

    // --- Panel --------------------------------------------------
    var panel = document.createElement("div");
    panel.className = "dai-panel";
    panel.setAttribute("aria-hidden", "true");
    root.appendChild(panel);

    // Header
    var header = document.createElement("div");
    header.className = "dai-header";
    var title = document.createElement("div");
    title.className = "dai-title";
    title.textContent = (state.config && state.config.churchName) || "Chat";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "dai-close";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.innerHTML = closeIcon();
    closeBtn.addEventListener("click", function(){ togglePanel(false); });
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Messages
    var messages = document.createElement("div");
    messages.className = "dai-messages";
    panel.appendChild(messages);

    // Prospect form (hidden until shown)
    var prospectForm = document.createElement("div");
    prospectForm.className = "dai-prospect";
    prospectForm.style.display = "none";
    prospectForm.innerHTML =
      '<div class="dai-prospect-intro">Want ' + escapeHtml(state.config ? state.config.churchName : "us") + ' to follow up?<br>Leave your name and email.</div>' +
      '<input class="dai-prospect-name" type="text" placeholder="Your name" autocomplete="name" maxlength="120">' +
      '<input class="dai-prospect-email" type="email" placeholder="you@example.com" autocomplete="email" maxlength="254">' +
      '<div class="dai-prospect-actions">' +
        '<button type="button" class="dai-prospect-skip">Not now</button>' +
        '<button type="button" class="dai-prospect-submit" disabled>Share my info</button>' +
      '</div>' +
      '<div class="dai-prospect-error"></div>';
    panel.appendChild(prospectForm);

    // Composer
    var composer = document.createElement("form");
    composer.className = "dai-composer";
    composer.setAttribute("novalidate", "");
    var textarea = document.createElement("textarea");
    textarea.className = "dai-input";
    textarea.placeholder = "Ask a question";
    textarea.rows = 1;
    textarea.setAttribute("maxlength", String(MAX_MSG_CHARS));
    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "dai-submit";
    submit.innerHTML = arrowIcon();
    submit.setAttribute("aria-label", "Send message");
    var counter = document.createElement("div");
    counter.className = "dai-counter";
    counter.textContent = "0/" + MAX_MSG_CHARS;

    composer.appendChild(textarea);
    composer.appendChild(submit);
    panel.appendChild(composer);
    panel.appendChild(counter);

    // --- Launcher ----------------------------------------------
    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "dai-launcher";
    launcher.setAttribute("aria-label", "Open chat");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = chatIcon();
    var unread = document.createElement("span");
    unread.className = "dai-unread";
    unread.style.display = "none";
    launcher.appendChild(unread);
    root.appendChild(launcher);

    // Toast
    var toast = document.createElement("div");
    toast.className = "dai-toast";
    toast.setAttribute("aria-hidden", "true");
    root.appendChild(toast);

    // Attach to body
    if (document.body) document.body.appendChild(host);
    else document.addEventListener("DOMContentLoaded", function(){
      document.body.appendChild(host);
    });

    ui = {
      root: root,
      panel: panel,
      launcher: launcher,
      unread: unread,
      toast: toast,
      messages: messages,
      textarea: textarea,
      submit: submit,
      counter: counter,
      prospectForm: prospectForm
    };

    // Wire events
    launcher.addEventListener("click", function(){ togglePanel(!state.open); });
    textarea.addEventListener("input", onInput);
    textarea.addEventListener("keydown", function(ev){
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        composer.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
    composer.addEventListener("submit", function(ev){
      ev.preventDefault();
      sendMessage();
    });

    prospectForm.querySelector(".dai-prospect-skip").addEventListener("click", hideProspectForm);
    prospectForm.querySelector(".dai-prospect-submit").addEventListener("click", submitProspect);
    prospectForm.querySelector(".dai-prospect-name").addEventListener("input", maybeEnableProspect);
    prospectForm.querySelector(".dai-prospect-email").addEventListener("input", maybeEnableProspect);

    setupEngagementTracking();
  }

  // ──────────────────────────────────────────────────────────────
  // Panel open/close
  // ──────────────────────────────────────────────────────────────
  function togglePanel(open){
    var panel = el("panel", ".dai-panel");
    var launcher = el("launcher", ".dai-launcher");
    if (!panel || !launcher) return;
    state.open = open;
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    panel.classList.toggle("dai-open", open);
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    var existingSvg = launcher.querySelector("svg");
    if (existingSvg) existingSvg.remove();
    launcher.insertAdjacentHTML("afterbegin", open ? closeIcon() : chatIcon());
    if (open) {
      var unread = el("unread", ".dai-unread");
      if (unread) unread.style.display = "none";
      var textarea = el("textarea", ".dai-input");
      if (textarea) textarea.focus();
      scrollToBottom();
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Session handshake
  // ──────────────────────────────────────────────────────────────
  // No message rehydration — if the visitor has talked to us before,
  // the server holds a conversation summary and will inject it into
  // the LLM's prompt on the next turn. The UI starts empty every
  // page load (cleaner, faster, no stale context confusing visitors).
  function handshake(){
    var payload = {
      token: state.token,
      pageUrl: location.href,
      pageTitle: document.title
    };
    fetch(APP_URL + "/api/embed/session?k=" + encodeURIComponent(KEY), {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function(res){
      return res.ok ? res.json() : null;
    }).then(function(data){
      if (!data) return;
      state.token = data.token || state.token;
      state.chatId = data.chatId;
      state.outreachSent = !!data.outreachSent;
      state.prospectCaptured = state.prospectCaptured || !!data.prospectCaptured;
      try { localStorage.setItem(STORAGE_KEY, state.token); } catch (_) {}
      if (state.outreachSent) {
        try { localStorage.setItem(OUTREACH_KEY, "1"); } catch (_) {}
      }
      if (data.config) {
        saveCachedConfig(data.config);
      }
    }).catch(function(){ /* silent */ });
  }

  // ──────────────────────────────────────────────────────────────
  // Input + send
  // ──────────────────────────────────────────────────────────────
  function onInput(){
    var textarea = el("textarea", ".dai-input");
    var counter = el("counter", ".dai-counter");
    var submit = el("submit", ".dai-submit");
    if (!textarea || !counter || !submit) return;
    var len = textarea.value.length;
    counter.textContent = len + "/" + MAX_MSG_CHARS;
    counter.classList.toggle("dai-counter-over", len >= MAX_MSG_CHARS);
    submit.disabled = state.sending || len === 0 || len > MAX_MSG_CHARS;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 140) + "px";
  }

  // Only this-visit messages are sent over the wire. The server
  // reconstructs prior context from the stored conversation summary;
  // no client-side history is mirrored. This keeps every request
  // small and makes it impossible for a tampered client to feed
  // arbitrary "prior assistant messages" into the model.
  var thisVisitMessages = [];

  function sendMessage(){
    var textarea = el("textarea", ".dai-input");
    var submit = el("submit", ".dai-submit");
    if (!textarea || !submit) return;
    var content = textarea.value.trim();
    if (!content || state.sending || content.length > MAX_MSG_CHARS) return;
    if (!state.token) return; // handshake hasn't landed yet

    state.sending = true;
    submit.disabled = true;
    textarea.value = "";
    onInput();

    renderMessage("user", content, null);

    var assistantNode = renderMessage("assistant", "", null, { streaming: true });

    thisVisitMessages.push({ role: "user", content: content });
    state.userMessagesThisVisit++;

    fetch(APP_URL + "/api/embed/chat?k=" + encodeURIComponent(KEY), {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-Doctrinally-Session": state.token
      },
      body: JSON.stringify({ messages: thisVisitMessages })
    }).then(function(res){
      if (!res.ok || !res.body) throw new Error("stream_failed_" + res.status);
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var responseText = "";
      return (function pump(){
        return reader.read().then(function(step){
          if (step.done) return;
          buffer += decoder.decode(step.value, { stream: true });
          var parts = buffer.split(CHUNK_BOUNDARY);
          buffer = parts.pop() || "";
          for (var i = 0; i < parts.length; i++) {
            var piece = parts[i];
            if (!piece) continue;
            responseText += piece;
            updateStreamingText(assistantNode, responseText);
          }
          return pump();
        });
      })().then(function(){
        buffer = buffer || "";
        // Sentinels always come at the tail, each on its own newline-
        // prefixed marker. Extract in order: chatId → citations → prospect.
        var chatIdMatch = /__CHAT_ID__([^\n]*)/.exec(buffer);
        if (chatIdMatch) {
          state.chatId = chatIdMatch[1].trim();
          buffer = buffer.replace(chatIdMatch[0], "");
        }
        var citations = null;
        var citeMatch = /__CITATIONS__(\[.*?\])/.exec(buffer);
        if (citeMatch) {
          try { citations = JSON.parse(citeMatch[1]); } catch (_) {}
          buffer = buffer.replace(citeMatch[0], "");
        }
        var prospectPayload = null;
        var prospectMatch = /__PROSPECT__(\{.*?\})/.exec(buffer);
        if (prospectMatch) {
          try { prospectPayload = JSON.parse(prospectMatch[1]); } catch (_) {}
          buffer = buffer.replace(prospectMatch[0], "");
        }
        if (buffer.trim().length) {
          responseText += buffer;
          updateStreamingText(assistantNode, responseText);
        }
        finishAssistantMessage(assistantNode, responseText, citations);
        thisVisitMessages.push({
          role: "assistant",
          content: stripDocumentTags(responseText)
        });

        // Tool-captured prospect — suppress the inline form and mark
        // the session captured. The assistant's own reply will
        // naturally thank the visitor, so no extra system message.
        if (prospectPayload) {
          state.prospectCaptured = true;
          hideProspectForm();
        }

        // Concern #5: after the FIRST assistant reply to the
        // visitor's first message this visit, surface the email
        // capture form (unless already captured or previously
        // prompted across visits).
        if (!state.firstReplyCompleted) {
          state.firstReplyCompleted = true;
          maybeShowProspectForm();
        }
      });
    }).catch(function(err){
      finishAssistantMessage(
        assistantNode,
        "Sorry — something went wrong reaching the server. Please try again in a moment.",
        null
      );
      console.error("[doctrinally]", err);
    }).finally(function(){
      state.sending = false;
      onInput();
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Message rendering
  // ──────────────────────────────────────────────────────────────
  function renderMessage(role, content, citations, opts){
    opts = opts || {};
    var messages = el("messages", ".dai-messages");
    if (!messages) return null;
    var wrap = document.createElement("div");
    wrap.className = "dai-msg dai-msg-" + role + (opts.streaming ? " dai-streaming" : "");
    var bubble = document.createElement("div");
    bubble.className = "dai-bubble";
    bubble.textContent = stripDocumentTags(content);
    wrap.appendChild(bubble);
    if (citations && citations.length) {
      bubble.appendChild(renderCitations(citations));
    }
    messages.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function updateStreamingText(node, text){
    var bubble = node.querySelector(".dai-bubble");
    if (bubble) bubble.textContent = stripDocumentTags(text);
    scrollToBottom();
  }

  function finishAssistantMessage(node, text, citations){
    node.classList.remove("dai-streaming");
    var bubble = node.querySelector(".dai-bubble");
    if (bubble) bubble.textContent = stripDocumentTags(text);
    if (citations && citations.length && bubble) {
      bubble.appendChild(renderCitations(citations));
    }
    scrollToBottom();
  }

  function renderCitations(citations){
    var list = document.createElement("div");
    list.className = "dai-cites";
    list.appendChild(document.createTextNode("Sources: "));
    citations.forEach(function(c, i){
      var item;
      if (c.sourceUrl) {
        item = document.createElement("a");
        item.href = c.sourceUrl;
        item.target = "_blank";
        item.rel = "noopener noreferrer";
      } else {
        item = document.createElement("span");
      }
      item.className = "dai-cite";
      item.textContent = c.documentTitle || ("Source " + (i + 1));
      list.appendChild(item);
      if (i < citations.length - 1) {
        list.appendChild(document.createTextNode(", "));
      }
    });
    return list;
  }

  function scrollToBottom(){
    var messages = el("messages", ".dai-messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function stripDocumentTags(text){
    return (text || "").replace(/<document>[^<]*<\/document>/g, "").trim();
  }

  // ──────────────────────────────────────────────────────────────
  // Proactive outreach — two trigger paths
  // ──────────────────────────────────────────────────────────────
  // The widget reaches out first only ONCE per session (server
  // enforces via outreach_sent_at).
  //
  //   Path A (entry / cold page): any scroll + idle ≥ 750 ms.
  //     A reader who's scrolled even slightly and then stopped is
  //     reading. That's enough.
  //
  //   Path B (in-site navigation): fire immediately on load.
  //     If document.referrer is a different page on this same
  //     origin, the visitor just clicked through from another page
  //     on the church's site — that click IS the engagement signal,
  //     no scroll required.
  //
  // Note: a localStorage page-view counter is NOT used here because
  // it persists across visits/sessions and would fire on a "cold"
  // entry-page just because the visitor was here days ago.
  function isInSiteNavigation(){
    try {
      if (!document.referrer) return false;
      var ref = new URL(document.referrer);
      return ref.origin === location.origin && ref.pathname !== location.pathname;
    } catch (_) { return false; }
  }

  function setupEngagementTracking(){
    if (PREVIEW_MODE) return;

    var lastScrollAt = Date.now();
    var everScrolled = false;
    var triggered = false;
    var inSiteNav = isInSiteNavigation();

    window.addEventListener("scroll", function(){
      lastScrollAt = Date.now();
      everScrolled = true;
    }, { passive: true });

    var intervalId = setInterval(function(){
      if (triggered || state.outreachSent) return;
      if (!state.token) return;

      // Path B — visitor came from another page on this site.
      if (inSiteNav) {
        triggered = true;
        fireOutreach();
        return;
      }

      // Path A — entry page, any scroll + brief idle.
      var idleSinceScroll = Date.now() - lastScrollAt;
      if (everScrolled && idleSinceScroll >= 750) {
        triggered = true;
        fireOutreach();
        return;
      }
    }, 250);

    // Stop polling after 10 min to avoid background work on long
    // dwells where the visitor clearly isn't engaging.
    setTimeout(function(){ clearInterval(intervalId); }, 10 * 60 * 1000);
  }

  function fireOutreach(){
    state.awaitingOutreach = true;
    var visibleText = extractVisibleText();
    fetch(APP_URL + "/api/embed/outreach?k=" + encodeURIComponent(KEY), {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-Doctrinally-Session": state.token
      },
      body: JSON.stringify({
        visibleText: visibleText,
        pageUrl: location.href,
        pageTitle: document.title
      })
    }).then(function(res){
      if (res.status === 409) { // already_sent — mark local state
        state.outreachSent = true;
        try { localStorage.setItem(OUTREACH_KEY, "1"); } catch (_) {}
        return null;
      }
      return res.ok ? res.json() : null;
    }).then(function(data){
      state.awaitingOutreach = false;
      if (!data || !data.opener) return;
      state.outreachSent = true;
      try { localStorage.setItem(OUTREACH_KEY, "1"); } catch (_) {}
      renderMessage("assistant", data.opener, null);
      // The outreach opener is a proactive message, not a reply — it
      // does NOT count toward firstReplyCompleted. The email form
      // shows only after the visitor sends a message and gets a
      // genuine reply.
      if (!state.open) {
        var unread = el("unread", ".dai-unread");
        if (unread) unread.style.display = "block";
        showToast(data.opener);
      }
    }).catch(function(){ state.awaitingOutreach = false; });
  }

  function extractVisibleText(){
    var sel = "h1, h2, h3, p, li, article, blockquote";
    var all = document.querySelectorAll(sel);
    var winH = window.innerHeight || 0;
    var collected = [];
    var totalLen = 0;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!el || !el.offsetParent) continue;
      if (el.closest && el.closest("[data-doctrinally-ignore]")) continue;
      if (el.closest && el.closest("#doctrinally-embed-host")) continue;
      var rect = el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= winH) continue;
      var visibleTop = Math.max(0, rect.top);
      var visibleBot = Math.min(winH, rect.bottom);
      var vis = visibleBot - visibleTop;
      if (vis <= 0) continue;
      var ratio = rect.height > 0 ? vis / rect.height : 0;
      if (ratio < 0.5) continue;
      var t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!t) continue;
      collected.push(t);
      totalLen += t.length;
      if (totalLen > 2000) break;
    }
    var joined = collected.join("\n");
    return joined.slice(0, 2000);
  }

  function showToast(text){
    var toast = el("toast", ".dai-toast");
    if (!toast) return;
    toast.textContent = text.length > 120 ? text.slice(0, 120) + "…" : text;
    toast.classList.add("dai-toast-show");
    setTimeout(function(){
      toast.classList.remove("dai-toast-show");
    }, 6000);
    toast.addEventListener("click", function once(){
      toast.removeEventListener("click", once);
      togglePanel(true);
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Prospect capture — UI form
  // ──────────────────────────────────────────────────────────────
  // Show the inline form right after the first assistant reply
  // completes (concern #5). Skip if already captured, already shown
  // this visit, or already prompted in a prior visit. The LLM can
  // also capture via the captureProspect tool — when that fires we
  // set prospectCaptured = true from the __PROSPECT__ sentinel and
  // this function short-circuits.
  function maybeShowProspectForm(){
    if (PREVIEW_MODE) return;
    if (state.prospectCaptured) return;
    if (state.emailPrompted) return; // don't re-prompt across visits
    var prospectForm = el("prospectForm", ".dai-prospect");
    if (!prospectForm) return;
    if (prospectForm.style.display !== "none") return;
    prospectForm.style.display = "block";
    state.emailPrompted = true;
    try { localStorage.setItem(EMAIL_PROMPT_KEY, "1"); } catch (_) {}
    scrollToBottom();
    maybeEnableProspect();
  }

  function hideProspectForm(){
    var prospectForm = el("prospectForm", ".dai-prospect");
    if (!prospectForm) return;
    prospectForm.style.display = "none";
    // Treat "hidden" as "don't re-prompt this visitor" — whether
    // they captured, dismissed, or the tool preempted the form.
    state.emailPrompted = true;
    try { localStorage.setItem(EMAIL_PROMPT_KEY, "1"); } catch (_) {}
  }

  function maybeEnableProspect(){
    var prospectForm = el("prospectForm", ".dai-prospect");
    if (!prospectForm) return;
    var name = prospectForm.querySelector(".dai-prospect-name").value.trim();
    var email = prospectForm.querySelector(".dai-prospect-email").value.trim();
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    var submit = prospectForm.querySelector(".dai-prospect-submit");
    submit.disabled = !(name.length >= 2 && emailOk);
  }

  function submitProspect(){
    var prospectForm = el("prospectForm", ".dai-prospect");
    if (!prospectForm) return;
    var name = prospectForm.querySelector(".dai-prospect-name").value.trim();
    var email = prospectForm.querySelector(".dai-prospect-email").value.trim();
    var errorEl = prospectForm.querySelector(".dai-prospect-error");
    errorEl.textContent = "";
    var submit = prospectForm.querySelector(".dai-prospect-submit");
    submit.disabled = true;

    fetch(APP_URL + "/api/embed/prospects?k=" + encodeURIComponent(KEY), {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-Doctrinally-Session": state.token
      },
      body: JSON.stringify({
        name: name,
        email: email,
        pageUrl: location.href
      })
    }).then(function(res){
      return res.json().then(function(body){
        return { ok: res.ok, status: res.status, body: body };
      });
    }).then(function(r){
      if (!r.ok) {
        errorEl.textContent = (r.body && r.body.message) || "Couldn't save that — please try again.";
        submit.disabled = false;
        return;
      }
      state.prospectCaptured = true;
      prospectForm.style.display = "none";
      renderMessage("assistant", "Thanks! Someone from " + ((state.config && state.config.churchName) || "the church") + " will reach out soon.", null);
    }).catch(function(){
      errorEl.textContent = "Network error — please try again.";
      submit.disabled = false;
    });
  }

  // ──────────────────────────────────────────────────────────────
  // CSS
  // ──────────────────────────────────────────────────────────────
  function widgetCss(primary, isLeft){
    return [
      ":host { all: initial; }",
      ":host, * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }",
      ".dai-root { position: fixed; bottom: 20px; z-index: 2147483000; " + (isLeft ? "left: 20px;" : "right: 20px;") + " }",
      ".dai-launcher { all: initial; box-sizing: border-box; width: 60px; height: 60px; border-radius: 999px; background: " + primary + "; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,0.22); border: 0; position: relative; transition: transform 150ms ease; }",
      ".dai-launcher:hover { transform: scale(1.05); }",
      ".dai-launcher svg { width: 28px; height: 28px; display: block; color: #fff; }",
      ".dai-unread { position: absolute; top: 4px; right: 4px; width: 12px; height: 12px; border-radius: 999px; background: #ef4444; border: 2px solid #fff; }",
      ".dai-panel { position: absolute; bottom: 80px; " + (isLeft ? "left: 0;" : "right: 0;") + " width: min(400px, calc(100vw - 40px)); height: min(600px, calc(100vh - 120px)); background: #fff; border-radius: 16px; box-shadow: 0 20px 48px rgba(0,0,0,0.25); overflow: hidden; opacity: 0; transform: translateY(16px) scale(0.98); transform-origin: bottom " + (isLeft ? "left" : "right") + "; transition: opacity 180ms ease, transform 180ms ease; pointer-events: none; display: flex; flex-direction: column; }",
      ".dai-panel.dai-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }",
      ".dai-header { background: " + primary + "; color: #fff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }",
      ".dai-title { font-size: 15px; font-weight: 600; }",
      ".dai-close { all: initial; cursor: pointer; color: #fff; padding: 4px; display: flex; }",
      ".dai-close svg { width: 18px; height: 18px; }",
      ".dai-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #fafafa; }",
      ".dai-msg { display: flex; }",
      ".dai-msg-user { justify-content: flex-end; }",
      ".dai-msg-assistant { justify-content: flex-start; }",
      ".dai-bubble { max-width: 92%; padding: 16px 20px; border-radius: 18px; font-size: 16px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: #111; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }",
      ".dai-msg-user .dai-bubble { background: " + primary + "; color: #fff; }",
      ".dai-streaming .dai-bubble::after { content: '▊'; opacity: 0.6; margin-left: 2px; animation: dai-blink 1s steps(2) infinite; }",
      "@keyframes dai-blink { 50% { opacity: 0; } }",
      ".dai-cites { margin-top: 8px; font-size: 12px; color: #555; }",
      ".dai-cite { color: " + primary + "; text-decoration: underline; margin-right: 4px; }",
      ".dai-composer { display: flex; gap: 8px; padding: 10px 12px 4px 12px; background: #fff; border-top: 1px solid #eee; }",
      ".dai-input { all: initial; flex: 1; background: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 8px 12px; font-size: 14px; line-height: 1.4; min-height: 36px; max-height: 140px; resize: none; color: #111; }",
      ".dai-input:focus { outline: 2px solid " + primary + "33; border-color: " + primary + "; }",
      ".dai-submit { all: initial; cursor: pointer; background: " + primary + "; color: #fff; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; align-self: flex-end; }",
      ".dai-submit:disabled { opacity: 0.4; cursor: default; }",
      ".dai-submit svg { width: 16px; height: 16px; }",
      ".dai-counter { padding: 0 16px 8px 16px; font-size: 11px; color: #888; text-align: right; background: #fff; }",
      ".dai-counter-over { color: #dc2626; font-weight: 600; }",
      ".dai-toast { position: absolute; bottom: 80px; " + (isLeft ? "left: 0;" : "right: 0;") + " width: min(360px, calc(100vw - 40px)); background: #fff; color: #111; padding: 16px 20px; border-radius: 16px; box-shadow: 0 10px 28px rgba(0,0,0,0.18); font-size: 15px; line-height: 1.55; cursor: pointer; opacity: 0; transform: translateY(8px); transition: opacity 200ms ease, transform 200ms ease; pointer-events: none; }",
      ".dai-toast-show { opacity: 1; transform: translateY(0); pointer-events: auto; }",
      ".dai-prospect { padding: 12px 16px; background: #f7f4ef; border-top: 1px solid #e8e1d6; display: flex; flex-direction: column; gap: 8px; }",
      ".dai-prospect-intro { font-size: 13px; color: #333; line-height: 1.4; }",
      ".dai-prospect input { all: initial; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; font-size: 13px; color: #111; }",
      ".dai-prospect-actions { display: flex; gap: 8px; justify-content: flex-end; }",
      ".dai-prospect-skip { all: initial; cursor: pointer; padding: 6px 10px; font-size: 12px; color: #666; }",
      ".dai-prospect-submit { all: initial; cursor: pointer; background: " + primary + "; color: #fff; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; }",
      ".dai-prospect-submit:disabled { opacity: 0.4; cursor: default; }",
      ".dai-prospect-error { font-size: 12px; color: #dc2626; }"
    ].join(" ");
  }

  function chatIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff" stroke="none" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.83a2 2 0 0 0-1.42.59L4 22V5a2 2 0 0 1 2-2z"/></svg>';
  }
  function closeIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }
  function arrowIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  }

  function escapeHtml(s){
    return (s || "").replace(/[&<>"']/g, function(c){
      return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c];
    });
  }
})();`;
