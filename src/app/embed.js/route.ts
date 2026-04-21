import { NextResponse } from "next/server";

/**
 * Public loader script served from a stable URL that churches paste into
 * their own site:
 *
 *   <script src="https://doctrinally.ai/embed.js" data-church-key="dai_pk_..." async></script>
 *
 * Kept deliberately tiny (pure DOM, no frameworks) so it loads fast and
 * doesn't interfere with the host page. The loader fetches the widget
 * config, and if the widget is enabled for that key, injects a floating
 * launcher that reveals an iframe on click.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const script = LOADER_TEMPLATE.replace(/__APP_URL__/g, appUrl);

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // 1-hour cache keeps repeat visits cheap while still letting us
      // push loader changes without a forced-purge. The iframe content
      // is versioned separately and cached independently.
      "Cache-Control": "public, max-age=3600, must-revalidate",
      // Served cross-origin by definition (church.com → doctrinally.ai).
      "Access-Control-Allow-Origin": "*",
    },
  });
}

const LOADER_TEMPLATE = `(function(){
  "use strict";
  if (window.__doctrinallyEmbedLoaded) return;
  window.__doctrinallyEmbedLoaded = true;

  var APP_URL = "__APP_URL__";
  var script = document.currentScript || (function(){
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf("/embed.js") !== -1) return all[i];
    }
    return null;
  })();
  if (!script) return;

  var key = script.getAttribute("data-church-key");
  if (!key) { console.warn("[doctrinally] missing data-church-key on embed script"); return; }

  var position = (script.getAttribute("data-position") || "right").toLowerCase();
  var isLeft = position === "left";

  fetch(APP_URL + "/api/embed/config/" + encodeURIComponent(key), {
    method: "GET",
    mode: "cors",
    credentials: "omit"
  }).then(function(res){
    if (!res.ok) return null;
    return res.json();
  }).then(function(config){
    if (!config) return;
    render(config);
  }).catch(function(){ /* silent — no embed */ });

  function render(config){
    var primary = config.primaryColor || "#4A2C2A";
    var iframeUrl = APP_URL + "/embed/" + encodeURIComponent(key);
    var cornerStyle = isLeft
      ? "left: 20px; right: auto;"
      : "right: 20px; left: auto;";

    var root = document.createElement("div");
    root.id = "doctrinally-embed-root";
    root.style.cssText = "all: initial; position: fixed; bottom: 20px; " + cornerStyle + " z-index: 2147483000; font-family: inherit;";

    var panel = document.createElement("div");
    panel.id = "doctrinally-embed-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.style.cssText = [
      "position: absolute",
      "bottom: 80px",
      isLeft ? "left: 0" : "right: 0",
      "width: min(400px, calc(100vw - 40px))",
      "height: min(600px, calc(100vh - 120px))",
      "background: #ffffff",
      "border-radius: 16px",
      "box-shadow: 0 20px 48px rgba(0,0,0,0.25)",
      "overflow: hidden",
      "opacity: 0",
      "transform: translateY(16px) scale(0.98)",
      "transform-origin: " + (isLeft ? "bottom left" : "bottom right"),
      "transition: opacity 180ms ease, transform 180ms ease",
      "pointer-events: none"
    ].join(";");

    var iframe = document.createElement("iframe");
    iframe.title = (config.churchName || "Chat") + " chat";
    iframe.src = iframeUrl;
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allow", "clipboard-write");
    iframe.style.cssText = "all: initial; width: 100%; height: 100%; border: 0; display: block;";
    panel.appendChild(iframe);

    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open chat");
    launcher.setAttribute("aria-expanded", "false");
    launcher.style.cssText = [
      "all: initial",
      "box-sizing: border-box",
      "width: 60px",
      "height: 60px",
      "border-radius: 999px",
      "background: " + primary,
      "color: #ffffff",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "cursor: pointer",
      "box-shadow: 0 10px 24px rgba(0,0,0,0.22)",
      "transition: transform 150ms ease, box-shadow 150ms ease",
      "border: 0"
    ].join(";");

    var iconOpen = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    var iconClose = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    launcher.innerHTML = iconOpen;

    var open = false;
    launcher.addEventListener("mouseenter", function(){ launcher.style.transform = "scale(1.05)"; });
    launcher.addEventListener("mouseleave", function(){ launcher.style.transform = "scale(1)"; });
    launcher.addEventListener("click", function(){
      open = !open;
      if (open) {
        panel.setAttribute("aria-hidden", "false");
        panel.style.opacity = "1";
        panel.style.transform = "translateY(0) scale(1)";
        panel.style.pointerEvents = "auto";
        launcher.setAttribute("aria-expanded", "true");
        launcher.innerHTML = iconClose;
      } else {
        panel.setAttribute("aria-hidden", "true");
        panel.style.opacity = "0";
        panel.style.transform = "translateY(16px) scale(0.98)";
        panel.style.pointerEvents = "none";
        launcher.setAttribute("aria-expanded", "false");
        launcher.innerHTML = iconOpen;
      }
    });

    root.appendChild(panel);
    root.appendChild(launcher);

    if (document.body) {
      document.body.appendChild(root);
    } else {
      document.addEventListener("DOMContentLoaded", function(){
        document.body.appendChild(root);
      });
    }
  }
})();`;
