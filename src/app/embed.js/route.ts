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

  // Load the same Google Fonts the member chat uses. Fonts loaded
  // at the document level are inherited into shadow DOM, so this
  // is the right place. Idempotent — only injects once per page.
  (function loadFonts(){
    if (document.getElementById("doctrinally-fonts")) return;
    var link = document.createElement("link");
    link.id = "doctrinally-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap";
    (document.head || document.documentElement).appendChild(link);
  })();

  // ── Shared state ──────────────────────────────────────────────
  var state = {
    config: null,
    token: null,
    chatId: null,
    open: false,
    sending: false,
    outreachSent: false,
    awaitingOutreach: false,
    // Set to true when the AI's captureProspect tool fires, so we
    // know the visitor has already shared their info this session.
    prospectCaptured: false,
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
      counter: counter
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
      // Kill the outreach toast — its purpose ends the moment the
      // visitor opens the panel and sees the same message inside.
      // Use inline styles in addition to removing the class so this
      // works even if the toast had been re-shown by a stale
      // setTimeout from showToast.
      var toast = el("toast", ".dai-toast");
      if (toast) {
        toast.classList.remove("dai-toast-show");
        toast.style.opacity = "0";
        toast.style.pointerEvents = "none";
        toast.style.display = "none";
      }
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
  // Composer auto-grow: 1 line by default, expands per visual line up
  // to 3 lines, scrolls beyond. Numbers are tied to the .dai-input
  // CSS values (line-height 24px, vertical padding 8+8=16, so 1 line
  // is 40px and 3 lines is 88px).
  var INPUT_ONE_LINE_PX = 40;
  var INPUT_MAX_PX = 88;

  function onInput(){
    var textarea = el("textarea", ".dai-input");
    var counter = el("counter", ".dai-counter");
    var submit = el("submit", ".dai-submit");
    if (!textarea || !counter || !submit) return;
    var len = textarea.value.length;
    counter.textContent = len + "/" + MAX_MSG_CHARS;
    counter.classList.toggle("dai-counter-over", len >= MAX_MSG_CHARS);
    submit.disabled = state.sending || len === 0 || len > MAX_MSG_CHARS;
    // Reset to "auto" first so scrollHeight reflects content height
    // (not the previously-set height). Then clamp between 1 and 3 lines.
    textarea.style.height = "auto";
    var sh = textarea.scrollHeight;
    textarea.style.height = Math.max(INPUT_ONE_LINE_PX, Math.min(sh, INPUT_MAX_PX)) + "px";
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
        // Sentinels always come at the tail, each prefixed with a
        // newline so the next sentinel marker is what bounds the prior
        // payload. Extract in order: chatId → citations → prospect.
        //
        // Citations and prospect payloads use any-char-lazy + a
        // lookahead at the next sentinel (or end-of-string) instead of
        // a "lazy bracket until first close-bracket" form. The earlier
        // approach broke whenever a chunk's content contained a
        // markdown link like (hello)(mailto:…) — the close-bracket
        // appearing inside the JSON string value would terminate the
        // regex match early, the rest of the citations payload would
        // stay in the buffer, and that tail would then leak into the
        // visible response. The same risk applied to the prospect
        // payload if a captured name happened to contain a brace.
        var chatIdMatch = /__CHAT_ID__([^\n]*)/.exec(buffer);
        if (chatIdMatch) {
          state.chatId = chatIdMatch[1].trim();
          buffer = buffer.replace(chatIdMatch[0], "");
        }
        var citations = null;
        var citeMatch = /\n?__CITATIONS__([\s\S]*?)(?=\n__|$)/.exec(buffer);
        if (citeMatch) {
          try { citations = JSON.parse(citeMatch[1]); } catch (_) {}
          buffer = buffer.replace(citeMatch[0], "");
        }
        var prospectPayload = null;
        var prospectMatch = /\n?__PROSPECT__([\s\S]*?)(?=\n__|$)/.exec(buffer);
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

        // The AI's captureProspect tool fired — mark the session so
        // we don't pass the captureProspect tool registration on
        // future requests. The assistant's reply naturally thanks
        // the visitor, so nothing else to do here.
        if (prospectPayload) {
          state.prospectCaptured = true;
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
  // Message rendering — markdown + inline citation chips
  // ──────────────────────────────────────────────────────────────
  // Mirrors the member chat: assistant bubbles render markdown
  // (bold/italic/links/lists/code/headings/blockquotes) and replace
  // <document>UUID</document> tags with inline numbered citation
  // chips. Bible references like "John 3:16" auto-link to BibleGateway.
  function renderMessage(role, content, citations, opts){
    opts = opts || {};
    var messages = el("messages", ".dai-messages");
    if (!messages) return null;
    var wrap = document.createElement("div");
    wrap.className = "dai-msg dai-msg-" + role + (opts.streaming ? " dai-streaming" : "");
    var bubble = document.createElement("div");
    bubble.className = "dai-bubble";
    if (role === "assistant") {
      // Streaming + no content yet → bouncing-dots thinking indicator,
      // matching the member chat. Replaced by real content the moment
      // updateStreamingText fires with text.
      if (opts.streaming && !content) {
        bubble.innerHTML = thinkingDotsHtml();
      } else {
        bubble.innerHTML = renderRich(content, citations);
      }
    } else {
      bubble.textContent = content || "";
    }
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function updateStreamingText(node, text){
    var bubble = node.querySelector(".dai-bubble");
    if (!bubble) return;
    // Empty intermediate frames keep the thinking dots in place — only
    // swap to rendered content once we actually have something.
    if (text) {
      bubble.innerHTML = renderRich(text, null);
    }
    scrollToBottom();
  }

  function thinkingDotsHtml(){
    return '<span class="dai-thinking" aria-label="Thinking">' +
      '<span class="dai-thinking-dot"></span>' +
      '<span class="dai-thinking-dot"></span>' +
      '<span class="dai-thinking-dot"></span>' +
    '</span>';
  }

  function finishAssistantMessage(node, text, citations){
    node.classList.remove("dai-streaming");
    var bubble = node.querySelector(".dai-bubble");
    if (bubble) {
      bubble.innerHTML = renderRich(text, citations);
    }
    scrollToBottom();
  }

  // Build the assistant bubble's inner HTML.
  //
  // Each <document>UUID</document> tag is replaced with the actual
  // document rendered INLINE in the message:
  //   - YouTube → embedded iframe at the cited timestamp
  //   - Video   → <video> player at the cited timestamp
  //   - PDF / Word / PlateJS / website → document card with
  //     title + preview that links to the source
  //
  // During streaming, citations metadata isn't available yet, so we
  // strip the tags entirely. Once finishAssistantMessage runs with
  // the real citations array, the bubble re-renders with the rich
  // inline blocks in their proper places.
  function renderRich(content, citations){
    if (!content) return "";

    // Streaming path: no metadata yet, so just hide the document
    // tags and render the surrounding markdown.
    if (!citations || !citations.length) {
      return parseMarkdown(
        content.replace(/<document>[^<]+<\/document>/g, "")
      );
    }

    var citeByDocId = {};
    citations.forEach(function(c){ citeByDocId[c.documentId] = c; });

    // Split content into [text, citation, text, citation, …] parts.
    // Dedup: if the model cites the same documentId twice, the
    // second (and any subsequent) occurrence is dropped — we render
    // each source at most once per response.
    var parts = [];
    var seenDocIds = {};
    var lastIdx = 0;
    var re = /<document>([^<]+)<\/document>/g;
    var m;
    while ((m = re.exec(content)) !== null) {
      if (m.index > lastIdx) {
        parts.push({ kind: "text", value: content.slice(lastIdx, m.index) });
      }
      var docId = m[1];
      var cite = citeByDocId[docId];
      if (cite && !seenDocIds[docId]) {
        seenDocIds[docId] = true;
        parts.push({ kind: "cite", cite: cite });
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < content.length) {
      parts.push({ kind: "text", value: content.slice(lastIdx) });
    }

    var html = "";
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].kind === "text") html += parseMarkdown(parts[i].value);
      else html += renderCitationBlock(parts[i].cite);
    }
    return html;
  }

  // Inline citation block — full rich render of the cited document.
  function renderCitationBlock(cite){
    if (cite.documentType === "youtube") return renderYouTubeBlock(cite);
    if (cite.documentType === "video") return renderVideoBlock(cite);
    return renderDocumentBlock(cite);
  }

  function renderYouTubeBlock(cite){
    if (!cite.sourceUrl) return renderDocumentBlock(cite);
    var embedUrl = getYouTubeEmbedUrl(cite.sourceUrl, cite.startTime);
    var startMeta = (typeof cite.startTime === "number" && cite.startTime > 0)
      ? ' · Starts at ' + formatTimestamp(cite.startTime)
      : '';
    return [
      '<div class="dai-cite-block dai-cite-yt">',
        '<div class="dai-cite-yt-frame">',
          '<iframe src="' + escapeHtml(embedUrl) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="' + escapeHtml(cite.documentTitle || "") + '"></iframe>',
        '</div>',
        '<a class="dai-cite-yt-title" href="' + escapeHtml(cite.sourceUrl) + '" target="_blank" rel="noopener noreferrer">',
          svgIcon("video"),
          '<span>' + escapeHtml(cite.documentTitle || "YouTube video") + escapeHtml(startMeta) + '</span>',
        '</a>',
      '</div>'
    ].join("");
  }

  function renderVideoBlock(cite){
    if (!cite.sourceUrl) return renderDocumentBlock(cite);
    var startFrag = (typeof cite.startTime === "number" && cite.startTime > 0)
      ? '#t=' + Math.floor(cite.startTime)
      : '';
    var startMeta = (typeof cite.startTime === "number" && cite.startTime > 0)
      ? ' · Starts at ' + formatTimestamp(cite.startTime)
      : '';
    return [
      '<div class="dai-cite-block dai-cite-video">',
        '<video class="dai-cite-video-player" controls preload="metadata" src="' + escapeHtml(cite.sourceUrl + startFrag) + '"></video>',
        '<div class="dai-cite-video-title">',
          svgIcon("video"),
          '<span>' + escapeHtml(cite.documentTitle || "Video") + escapeHtml(startMeta) + '</span>',
        '</div>',
      '</div>'
    ].join("");
  }

  function renderDocumentBlock(cite){
    var iconKey = ({
      pdf: "filetext",
      word: "filetext",
      platejs: "bookopen",
      website_page: "globe",
      youtube: "video",
      video: "video"
    })[cite.documentType] || "filetext";

    var metaParts = [];
    if (cite.pageNumber != null) metaParts.push("Page " + cite.pageNumber);
    if (cite.heading) metaParts.push(cite.heading);
    var meta = metaParts.length ? metaParts.join(" · ") : "";

    var inner = [
      '<div class="dai-cite-doc-icon">' + svgIcon(iconKey) + '</div>',
      '<div class="dai-cite-doc-body">',
        '<div class="dai-cite-doc-title">' + escapeHtml(cite.documentTitle || "Source") + '</div>',
        meta ? '<div class="dai-cite-doc-meta">' + escapeHtml(meta) + '</div>' : '',
        cite.chunkContent ? '<div class="dai-cite-doc-preview">' + escapeHtml(cite.chunkContent) + '</div>' : '',
      '</div>',
      cite.sourceUrl ? '<div class="dai-cite-doc-arrow">' + svgIcon("externallink") + '</div>' : ''
    ].join("");

    if (cite.sourceUrl) {
      return '<a class="dai-cite-block dai-cite-doc" href="' + escapeHtml(cite.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
    }
    return '<div class="dai-cite-block dai-cite-doc">' + inner + '</div>';
  }

  // Tiny markdown → HTML compiler. Handles paragraphs, headings,
  // unordered/ordered lists, blockquotes, fenced code blocks,
  // inline code, bold, italic, links, hr, and Bible references.
  // (Backticks built from charCode 96 so the regexes don't terminate
  // the outer String.raw template literal in route.ts.)
  function parseMarkdown(text){
    if (!text) return "";
    var BT = String.fromCharCode(96);
    var fencedRe = new RegExp(BT + BT + BT + "([\\s\\S]*?)" + BT + BT + BT, "g");
    var inlineRe = new RegExp(BT + "([^" + BT + "\\n]+)" + BT, "g");

    // 1. Pull out fenced code blocks before anything else processes them.
    var codeBlocks = [];
    text = text.replace(fencedRe, function(_, code){
      var i = codeBlocks.push(code.replace(/^\n/, "").replace(/\n$/, "")) - 1;
      return "\u0000B" + i + "\u0000";
    });

    // 2. And inline code spans, so backticks don't get misread.
    var inlineCode = [];
    text = text.replace(inlineRe, function(_, code){
      var i = inlineCode.push(code) - 1;
      return "\u0000I" + i + "\u0000";
    });

    // 3. Escape HTML on whatever's left. Sentinels are pure ASCII
    //    digits + null bytes so they're untouched.
    text = escapeHtml(text);

    // 4. Walk lines to assemble block elements.
    var lines = text.split("\n");
    var out = [];
    var openList = null; // "ul" | "ol" | null
    var paraBuf = [];

    function flushPara(){
      if (paraBuf.length){
        out.push("<p>" + processInline(paraBuf.join(" ")) + "</p>");
        paraBuf = [];
      }
    }
    function flushList(){
      if (openList){ out.push("</" + openList + ">"); openList = null; }
    }

    for (var i = 0; i < lines.length; i++){
      var raw = lines[i];
      var line = raw.replace(/\s+$/, "");
      var trimmed = line.replace(/^\s+/, "");
      if (!trimmed){ flushPara(); flushList(); continue; }

      var h = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (h){ flushPara(); flushList(); var lvl = h[1].length; out.push("<h" + lvl + ">" + processInline(h[2]) + "</h" + lvl + ">"); continue; }

      if (/^---+$/.test(trimmed)){ flushPara(); flushList(); out.push("<hr>"); continue; }

      if (/^&gt;\s?/.test(trimmed)){ flushPara(); flushList(); out.push("<blockquote>" + processInline(trimmed.replace(/^&gt;\s?/, "")) + "</blockquote>"); continue; }

      var ul = trimmed.match(/^[-*]\s+(.+)$/);
      if (ul){ flushPara(); if (openList !== "ul"){ flushList(); out.push("<ul>"); openList = "ul"; } out.push("<li>" + processInline(ul[1]) + "</li>"); continue; }

      var ol = trimmed.match(/^\d+\.\s+(.+)$/);
      if (ol){ flushPara(); if (openList !== "ol"){ flushList(); out.push("<ol>"); openList = "ol"; } out.push("<li>" + processInline(ol[1]) + "</li>"); continue; }

      flushList();
      paraBuf.push(trimmed);
    }
    flushPara();
    flushList();

    var html = out.join("");

    // 5. Restore inline + fenced code (escaped, since they were pulled out
    //    BEFORE the global escape pass).
    html = html.replace(/\u0000I(\d+)\u0000/g, function(_, idx){
      return "<code>" + escapeHtml(inlineCode[parseInt(idx, 10)]) + "</code>";
    });
    html = html.replace(/\u0000B(\d+)\u0000/g, function(_, idx){
      return "<pre><code>" + escapeHtml(codeBlocks[parseInt(idx, 10)]) + "</code></pre>";
    });

    return html;
  }

  // Inline markdown: bold, italic, links, then Bible references.
  function processInline(s){
    s = s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(_, txt, url){
      return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
    });
    s = linkBibleRefs(s);
    return s;
  }

  // Auto-link Bible references like "John 3:16", "1 Cor 13:4-7", "Psalm 23".
  function linkBibleRefs(s){
    var bookList = "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation";
    var re = new RegExp("\\b(" + bookList + ")\\s+(\\d+)(?::(\\d+)(?:-(\\d+))?)?\\b", "g");
    return s.replace(re, function(match){
      var url = "https://www.biblegateway.com/passage/?search=" + encodeURIComponent(match) + "&version=NIV";
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + match + '</a>';
    });
  }

  // YouTube embed URL helper — extracts the video ID from any of the
  // common YouTube URL forms and appends ?autoplay=0&start=N when a
  // start time is present.
  function getYouTubeEmbedUrl(sourceUrl, startTime){
    var patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/,
      /youtube\.com\/shorts\/([^&?#]+)/
    ];
    var videoId = "";
    for (var i = 0; i < patterns.length; i++) {
      var m = sourceUrl.match(patterns[i]);
      if (m) { videoId = m[1]; break; }
    }
    if (!videoId) return sourceUrl;
    var start = (typeof startTime === "number" && startTime > 0) ? "&start=" + Math.floor(startTime) : "";
    return "https://www.youtube.com/embed/" + videoId + "?autoplay=0" + start;
  }

  // Member chat uses m:ss (no hours), matching exactly.
  function formatTimestamp(seconds){
    var total = Math.floor(seconds || 0);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" + s : "" + s);
  }

  // Lucide-style stroked SVG icons (24×24 viewBox, stroke=currentColor)
  // — matches the icons used by CitationCard.
  function svgIcon(name){
    var head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    var tail = '</svg>';
    var body = "";
    switch (name) {
      case "filetext":
        body = '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>';
        break;
      case "video":
        body = '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>';
        break;
      case "bookopen":
        body = '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>';
        break;
      case "globe":
        body = '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>';
        break;
      case "x":
        body = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
        break;
      case "externallink":
        body = '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>';
        break;
      case "play":
        body = '<polygon points="5 3 19 12 5 21 5 3"/>';
        break;
    }
    return head + body + tail;
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
  // CSS
  // ──────────────────────────────────────────────────────────────
  function widgetCss(primary, isLeft){
    // Color tokens approximating member chat's OKLCH palette in sRGB.
    var bg = "#fbf9f5";          // panel background (warm off-white)
    var card = "#ffffff";        // assistant bubble background
    var fg = "#3a302a";          // body text
    var muted = "#7c6e62";       // secondary text
    var border = "#e8e2d8";      // dividers
    return [
      ":host { all: initial; }",
      ":host, * { box-sizing: border-box; font-family: 'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif; }",
      ".dai-root { position: fixed; bottom: 20px; z-index: 2147483000; " + (isLeft ? "left: 20px;" : "right: 20px;") + " }",
      ".dai-launcher { all: initial; box-sizing: border-box; width: 60px; height: 60px; border-radius: 999px; background: " + primary + "; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,0.22); border: 0; position: relative; transition: transform 150ms ease; }",
      ".dai-launcher:hover { transform: scale(1.05); }",
      ".dai-launcher svg { width: 28px; height: 28px; display: block; color: #fff; }",
      ".dai-unread { position: absolute; top: 4px; right: 4px; width: 12px; height: 12px; border-radius: 999px; background: #ef4444; border: 2px solid #fff; }",
      ".dai-panel { position: absolute; bottom: 80px; " + (isLeft ? "left: 0;" : "right: 0;") + " width: min(400px, calc(100vw - 40px)); height: min(600px, calc(100vh - 120px)); background: " + bg + "; border-radius: 16px; box-shadow: 0 20px 48px rgba(0,0,0,0.25); overflow: hidden; opacity: 0; transform: translateY(16px) scale(0.98); transform-origin: bottom " + (isLeft ? "left" : "right") + "; transition: opacity 180ms ease, transform 180ms ease; pointer-events: none; display: flex; flex-direction: column; color: " + fg + "; }",
      ".dai-panel.dai-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }",
      ".dai-header { background: " + primary + "; color: #fff; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }",
      ".dai-title { font-family: 'Playfair Display', ui-serif, Georgia, serif; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }",
      ".dai-close { all: initial; cursor: pointer; color: #fff; padding: 4px; display: flex; }",
      ".dai-close svg { width: 18px; height: 18px; }",
      ".dai-messages { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; background: " + bg + "; }",
      ".dai-msg { display: flex; }",
      ".dai-msg-user { justify-content: flex-end; }",
      ".dai-msg-assistant { justify-content: flex-start; }",
      ".dai-bubble { max-width: 92%; padding: 14px 18px; border-radius: 18px; font-size: 16px; line-height: 1.6; word-wrap: break-word; color: " + fg + "; background: " + card + "; box-shadow: 0 1px 2px rgba(0,0,0,0.04); border: 1px solid " + border + "; }",
      ".dai-msg-user .dai-bubble { background: " + primary + "; color: #fff; border-color: transparent; }",
      // Three-dot thinking indicator (matches member chat).
      ".dai-thinking { display: inline-flex; align-items: center; gap: 5px; padding: 2px 0; }",
      ".dai-thinking-dot { width: 7px; height: 7px; border-radius: 999px; background: " + muted + "; opacity: 0.4; animation: dai-thinking-bounce 1.2s ease-in-out infinite; }",
      ".dai-thinking-dot:nth-child(2) { animation-delay: 0.15s; }",
      ".dai-thinking-dot:nth-child(3) { animation-delay: 0.3s; }",
      "@keyframes dai-thinking-bounce { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-4px); } }",
      // Markdown elements within bubbles (assistant only — user msgs stay plain).
      ".dai-bubble p { margin: 0 0 10px 0; }",
      ".dai-bubble p:last-child { margin-bottom: 0; }",
      ".dai-bubble strong { font-weight: 600; }",
      ".dai-bubble em { font-style: italic; }",
      ".dai-bubble ul, .dai-bubble ol { margin: 0 0 10px 0; padding-left: 22px; }",
      ".dai-bubble li { margin-bottom: 4px; }",
      ".dai-bubble blockquote { margin: 0 0 10px 0; padding-left: 12px; border-left: 2px solid " + primary + "55; color: " + muted + "; font-style: italic; }",
      ".dai-bubble code { font-family: ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, monospace; background: " + bg + "; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }",
      ".dai-bubble pre { margin: 0 0 10px 0; padding: 10px 12px; background: " + bg + "; border: 1px solid " + border + "; border-radius: 8px; overflow-x: auto; font-size: 13px; }",
      ".dai-bubble pre code { background: transparent; padding: 0; }",
      ".dai-bubble a { color: " + primary + "; text-decoration: underline; text-decoration-color: " + primary + "55; text-underline-offset: 2px; }",
      ".dai-bubble a:hover { text-decoration-color: " + primary + "; }",
      ".dai-bubble h1, .dai-bubble h2, .dai-bubble h3 { font-family: 'Playfair Display', ui-serif, Georgia, serif; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3; }",
      ".dai-bubble h1 { font-size: 18px; }",
      ".dai-bubble h2 { font-size: 17px; }",
      ".dai-bubble h3 { font-size: 16px; }",
      ".dai-bubble hr { margin: 12px 0; border: 0; border-top: 1px solid " + border + "; }",
      // ── Inline citation blocks ──────────────────────────────
      // Each cited <document> renders as a self-contained block here:
      // YouTube → 16:9 iframe, video → <video> player, doc → card.
      ".dai-cite-block { margin: 12px 0; max-width: 100%; }",
      ".dai-cite-block:last-child { margin-bottom: 0; }",
      // YouTube embed — 16:9 iframe + caption row underneath.
      ".dai-cite-yt-frame { aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: #000; border: 1px solid " + border + "; }",
      ".dai-cite-yt-frame iframe { width: 100%; height: 100%; border: 0; display: block; }",
      ".dai-cite-yt-title { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 0 2px; font-size: 12px; line-height: 1.4; color: " + muted + "; text-decoration: none; }",
      ".dai-cite-yt-title svg { width: 14px; height: 14px; color: " + primary + "; flex-shrink: 0; }",
      ".dai-cite-yt-title:hover { color: " + fg + "; }",
      ".dai-cite-yt-title:hover span { text-decoration: underline; }",
      // Native video player — same shape as YouTube block.
      ".dai-cite-video-player { width: 100%; max-height: 360px; border-radius: 8px; background: #000; border: 1px solid " + border + "; display: block; }",
      ".dai-cite-video-title { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 0 2px; font-size: 12px; line-height: 1.4; color: " + muted + "; }",
      ".dai-cite-video-title svg { width: 14px; height: 14px; color: " + primary + "; flex-shrink: 0; }",
      // Document card — PDF / Word / PlateJS / website. Whole tile is
      // a clickable link to the source URL when one is available.
      ".dai-cite-doc { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid " + border + "; background: " + bg + "; color: inherit; text-decoration: none; transition: background 120ms, border-color 120ms; }",
      "a.dai-cite-doc:hover { background: " + card + "; border-color: " + primary + "55; }",
      ".dai-cite-doc-icon { flex-shrink: 0; width: 18px; height: 18px; padding-top: 1px; color: " + primary + "; }",
      ".dai-cite-doc-icon svg { width: 18px; height: 18px; }",
      ".dai-cite-doc-body { flex: 1; min-width: 0; }",
      ".dai-cite-doc-title { font-size: 13px; font-weight: 600; line-height: 1.4; color: " + fg + "; }",
      ".dai-cite-doc-meta { margin-top: 2px; font-size: 11px; color: " + muted + "; }",
      ".dai-cite-doc-preview { margin-top: 4px; font-size: 12px; line-height: 1.5; color: " + muted + "; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }",
      ".dai-cite-doc-arrow { flex-shrink: 0; color: " + muted + "; padding-top: 2px; }",
      ".dai-cite-doc-arrow svg { width: 12px; height: 12px; }",
      ".dai-composer { display: flex; gap: 8px; padding: 12px 14px 6px 14px; background: " + card + "; border-top: 1px solid " + border + "; }",
      // Composer textarea: line-height pinned to 24px and vertical
      // padding to 8px so 1 line == 40px and 3 lines == 88px exactly.
      // The auto-grow JS in onInput keeps the height between those.
      ".dai-input { all: initial; flex: 1; box-sizing: border-box; background: " + card + "; border: 1px solid " + border + "; border-radius: 10px; padding: 8px 14px; font-family: 'Source Serif 4', ui-serif, Georgia, serif; font-size: 15px; line-height: 24px; height: 40px; min-height: 40px; max-height: 88px; overflow-y: auto; resize: none; color: " + fg + "; display: block; width: 100%; }",
      ".dai-input:focus { outline: 2px solid " + primary + "33; border-color: " + primary + "; }",
      ".dai-submit { all: initial; cursor: pointer; background: " + primary + "; color: #fff; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; align-self: flex-end; }",
      ".dai-submit:disabled { opacity: 0.4; cursor: default; }",
      ".dai-submit svg { width: 16px; height: 16px; }",
      ".dai-counter { padding: 0 18px 10px 18px; font-size: 11px; color: " + muted + "; text-align: right; background: " + card + "; }",
      ".dai-counter-over { color: #dc2626; font-weight: 600; }",
      ".dai-toast { position: absolute; bottom: 80px; " + (isLeft ? "left: 0;" : "right: 0;") + " width: min(360px, calc(100vw - 40px)); background: " + card + "; color: " + fg + "; padding: 16px 20px; border-radius: 16px; box-shadow: 0 10px 28px rgba(0,0,0,0.18); border: 1px solid " + border + "; font-size: 15px; line-height: 1.55; cursor: pointer; opacity: 0; transform: translateY(8px); transition: opacity 200ms ease, transform 200ms ease; pointer-events: none; }",
      ".dai-toast-show { opacity: 1; transform: translateY(0); pointer-events: auto; }"
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
