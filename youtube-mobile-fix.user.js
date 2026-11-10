// ==UserScript==
// @name         YouTube Mobile Fix
// @namespace    youtube-mobile-fix
// @version      2.0.2
// @description  Выключает субтитры, даёт раздел «Для тебя» с рекомендациями, таймер сна, просмотр на весь экран и с поворотом, убирает «Открыть в приложении».
// @match        https://m.youtube.com/*
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @run-at       document-start
// @inject-into  auto
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Daxxverr/youtube-mobile-fix/main/youtube-mobile-fix.user.js
// @downloadURL  https://raw.githubusercontent.com/Daxxverr/youtube-mobile-fix/main/youtube-mobile-fix.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ---------- НАСТРОЙКИ ----------
  const SETTINGS = {
    // Выключать субтитры на каждом видео
    disableCaptions: true,
    // Дополнительно прятать субтитры через CSS (на случай, если YouTube всё равно их включит)
    hideCaptionsWithCss: true,

    // Круглая кнопка меню в правом нижнем углу
    showMenuButton: true,

    // Раздел «Для тебя»: пропускать видео, которые ты уже начинал смотреть
    recsSkipWatched: true,
    // Фильтр длины по умолчанию: 0 — любые, 10 — от 10 минут, 30 — от 30 минут
    recsDefaultMinMinutes: 0,

    // Варианты таймера сна (в минутах)
    sleepOptions: [15, 30, 45, 60, 90],

    // Пытаться убрать полоску Safari «Открыть в приложении YouTube»
    removeAppBanner: true,

    // Тёмно-зелёный фон вместо чёрного (false — обычная чёрная тема YouTube)
    greenTheme: false,
    greenBackground: '#0d2b1e',
    greenSurface: '#16402d',

    // Чинить «съехавшую» вбок страницу
    fixLayout: true,

    // Android: ориентация в полноэкранном режиме YouTube: 'landscape', 'portrait' или null
    fullscreenOrientation: 'landscape',
  };
  // --------------------------------

  const log = (...a) => console.debug('[YT Mobile Fix]', ...a);

  // ================= ИКОНКИ =================
  // Рисуем SVG через createElementNS: YouTube запрещает innerHTML (Trusted Types).
  const STROKE = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const FILL = { fill: 'currentColor' };
  const ICONS = {
    // Своя метка: кадр с кнопкой play и «искрой»
    logo: [
      ['rect', { x: '3', y: '5', width: '15', height: '14', rx: '3.5', ...STROKE }],
      ['path', { d: 'M9 9.3v5.4l4.3-2.7z', ...FILL }],
      ['path', { d: 'M20.5 3.5v3M19 5h3', ...STROKE, 'stroke-width': '1.6' }],
    ],
    // «Для тебя»: стопка кадров
    recs: [
      ['rect', { x: '3', y: '8', width: '14', height: '12', rx: '2.5', ...STROKE }],
      ['path', { d: 'M7 4.5h11A2.5 2.5 0 0 1 20.5 7v9', ...STROKE }],
      ['path', { d: 'M8.5 11.2v5.6l4.4-2.8z', ...FILL }],
    ],
    moon: [['path', { d: 'M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z', ...STROKE }]],
    fill: [['path', { d: 'M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15', ...STROKE }]],
    rotl: [
      ['rect', { x: '9', y: '9', width: '11', height: '11', rx: '2', ...STROKE }],
      ['path', { d: 'M4 13V8a4 4 0 0 1 4-4h5M10.5 1.5 13 4l-2.5 2.5', ...STROKE }],
    ],
    rotr: [
      ['rect', { x: '4', y: '9', width: '11', height: '11', rx: '2', ...STROKE }],
      ['path', { d: 'M20 13V8a4 4 0 0 0-4-4h-5M13.5 1.5 11 4l2.5 2.5', ...STROKE }],
    ],
    close: [['path', { d: 'M6 6l12 12M18 6 6 18', ...STROKE }]],
    play: [['path', { d: 'M8 5.5v13l10.5-6.5z', ...FILL }]],
    pause: [['path', { d: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z', ...FILL }]],
    back: [['path', { d: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5', ...STROKE }]],
    fwd: [['path', { d: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5', ...STROKE }]],
    refresh: [['path', { d: 'M20 11a8 8 0 0 0-14.5-4.5M4 4v3.5h3.5M4 13a8 8 0 0 0 14.5 4.5M20 20v-3.5h-3.5', ...STROKE }]],
  };

  function icon(name, size = 24) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    for (const [tag, attrs] of ICONS[name]) {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      svg.appendChild(node);
    }
    return svg;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function tapButton(cls, label, child, onClick) {
    const b = el('button', cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    if (child) b.append(child);
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(e); });
    return b;
  }

  // ================= СТИЛИ =================
  function buildCss() {
    let css = '';

    if (SETTINGS.disableCaptions && SETTINGS.hideCaptionsWithCss) {
      css += `
        .ytp-caption-window-container, .caption-window,
        .ytp-caption-segment, .captions-text { display: none !important; }
      `;
    }

    if (SETTINGS.fixLayout) {
      css += `
        html, body { overflow-x: hidden !important; max-width: 100vw !important; }
        @media (orientation: landscape) and (max-height: 560px) {
          #masthead-container, ytm-mobile-topbar-renderer, .mobile-topbar-header {
            position: absolute !important;
          }
        }
      `;
    }

    if (SETTINGS.greenTheme) {
      const G = SETTINGS.greenBackground;
      const S = SETTINGS.greenSurface;
      const vars = `
        --yt-spec-base-background: ${G} !important;
        --yt-spec-general-background-a: ${G} !important;
        --yt-spec-general-background-b: ${G} !important;
        --yt-spec-general-background-c: ${S} !important;
        --yt-spec-raised-background: ${S} !important;
        --yt-spec-menu-background: ${S} !important;
        --yt-spec-brand-background-solid: ${G} !important;
        --yt-spec-brand-background-primary: ${G} !important;
        --yt-spec-frosted-glass-desktop: ${G} !important;
      `;
      const targets = [
        'body', 'ytd-app', 'ytm-app', '#masthead-container', '#masthead', 'ytd-masthead',
        '#background.ytd-masthead', 'ytm-mobile-topbar-renderer', '.mobile-topbar-header',
        'ytd-browse', 'ytd-watch-flexy', '#page-manager', '#frosted-glass',
        'ytd-feed-filter-chip-bar-renderer', '#chips-wrapper', 'ytm-feed-filter-chip-bar-renderer',
      ];
      const bgFor = (root) =>
        [root, ...targets.map((t) => `${root} ${t}`)].join(', ') + ` { background-color: ${G} !important; }`;
      css += `
        html[dark], html[darker-dark-theme], html.dark { ${vars} }
        ${bgFor('html[dark]')}
        ${bgFor('html[darker-dark-theme]')}
        ${bgFor('html.dark')}
      `;
    }

    css += `
      .ymf, .ymf * { box-sizing: border-box; font-family: "YouTube Sans", Roboto, -apple-system, system-ui, sans-serif; }
      .ymf button { -webkit-tap-highlight-color: transparent; cursor: pointer; font: inherit; }

      /* --- Кнопка меню --- */
      #ymf-fab {
        position: fixed; right: 14px; bottom: calc(96px + env(safe-area-inset-bottom, 0px));
        z-index: 2147483600; width: 46px; height: 46px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; padding: 0;
        color: #f1f1f1; background: rgba(33, 33, 33, 0.86);
        border: 1px solid rgba(255, 255, 255, 0.10);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
        transition: opacity .35s, transform .15s;
      }
      #ymf-fab.ymf-idle { opacity: 0.45; }
      #ymf-fab:active { transform: scale(0.92); }
      #ymf-fab .ymf-badge {
        position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 5px;
        border-radius: 10px; background: #3ea6ff; color: #0f0f0f; font-size: 11px; font-weight: 700;
        line-height: 20px; text-align: center; display: none;
      }
      #ymf-fab.ymf-has-badge .ymf-badge { display: block; }
      html.ymf-sheet-open #ymf-fab, html.ymf-overlay-open #ymf-fab { display: none; }

      /* --- Нижняя шторка (как у YouTube) --- */
      #ymf-backdrop {
        position: fixed; inset: 0; z-index: 2147483640; background: rgba(0, 0, 0, 0.55);
        opacity: 0; transition: opacity .2s;
      }
      #ymf-backdrop.ymf-show { opacity: 1; }
      #ymf-sheet {
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483641;
        max-height: 88vh; max-height: 88dvh; display: flex; flex-direction: column;
        background: #212121; color: #f1f1f1; border-radius: 16px 16px 0 0;
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
        transform: translateY(100%); transition: transform .25s cubic-bezier(.2,.8,.2,1);
      }
      #ymf-sheet.ymf-show { transform: translateY(0); }
      #ymf-sheet .ymf-grab { width: 40px; height: 4px; border-radius: 2px; background: #5a5a5a; margin: 10px auto 6px; flex: none; }
      #ymf-sheet .ymf-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1; }
      .ymf-row {
        display: flex; align-items: center; gap: 16px; width: 100%; min-height: 52px;
        padding: 0 20px; border: 0; background: none; color: inherit; text-align: left; font-size: 16px;
      }
      .ymf-row:active { background: rgba(255, 255, 255, 0.08); }
      .ymf-row svg { flex: none; }
      .ymf-row .ymf-sub { margin-left: auto; color: #aaa; font-size: 14px; }
      .ymf-sep { height: 1px; background: rgba(255, 255, 255, 0.10); margin: 6px 0; }
      .ymf-chips { display: flex; gap: 8px; padding: 4px 20px 10px 60px; flex-wrap: wrap; }
      .ymf-chip {
        height: 32px; padding: 0 12px; border-radius: 8px; border: 0; font-size: 14px; font-weight: 500;
        background: rgba(255, 255, 255, 0.10); color: #f1f1f1;
      }
      .ymf-chip.ymf-on { background: #f1f1f1; color: #0f0f0f; }

      /* --- Раздел «Для тебя» --- */
      .ymf-head { display: flex; align-items: center; gap: 12px; padding: 4px 12px 8px 20px; flex: none; }
      .ymf-head h2 { margin: 0; font-size: 20px; font-weight: 700; flex: 1; color: #f1f1f1; }
      .ymf-icon-btn {
        width: 40px; height: 40px; border-radius: 50%; border: 0; padding: 0; background: none; color: #f1f1f1;
        display: flex; align-items: center; justify-content: center;
      }
      .ymf-icon-btn:active { background: rgba(255, 255, 255, 0.10); }
      .ymf-head + .ymf-chips { padding-left: 20px; flex: none; }
      .ymf-video {
        display: flex; gap: 12px; width: 100%; padding: 8px 20px; border: 0; background: none;
        color: inherit; text-align: left;
      }
      .ymf-video:active { background: rgba(255, 255, 255, 0.06); }
      .ymf-thumb {
        position: relative; flex: none; width: 160px; height: 90px; border-radius: 8px; overflow: hidden;
        background: #3a3a3a;
      }
      .ymf-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ymf-dur {
        position: absolute; right: 4px; bottom: 4px; padding: 1px 4px; border-radius: 4px;
        background: rgba(0, 0, 0, 0.8); color: #fff; font-size: 12px; font-weight: 500;
      }
      .ymf-meta { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .ymf-title {
        font-size: 15px; line-height: 1.3; font-weight: 500; color: #f1f1f1;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
      }
      .ymf-chan { font-size: 13px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ymf-empty { padding: 28px 24px; color: #aaa; text-align: center; font-size: 15px; line-height: 1.4; }

      /* --- Просмотр на весь экран / с поворотом --- */
      html.ymf-overlay-open, html.ymf-overlay-open body { overflow: hidden !important; }
      #ymf-overlay { position: fixed; inset: 0; z-index: 2147483620; background: #000; touch-action: none; }
      #ymf-stage { position: absolute; top: 50%; left: 50%; overflow: hidden; background: #000; }
      #ymf-overlay.ymf-mode-fill #ymf-stage {
        width: 100vw; height: 100vh; height: 100dvh; transform: translate(-50%, -50%);
      }
      #ymf-overlay.ymf-mode-rotl #ymf-stage, #ymf-overlay.ymf-mode-rotr #ymf-stage {
        width: 100vh; width: 100dvh; height: 100vw;
      }
      #ymf-overlay.ymf-mode-rotl #ymf-stage { transform: translate(-50%, -50%) rotate(-90deg); }
      #ymf-overlay.ymf-mode-rotr #ymf-stage { transform: translate(-50%, -50%) rotate(90deg); }
      #ymf-stage video {
        position: absolute !important; inset: 0 !important; left: 0 !important; top: 0 !important;
        width: 100% !important; height: 100% !important; object-fit: contain !important;
        transform: none !important; margin: 0 !important; max-width: none !important;
      }
      .ymf-ctrl {
        position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between;
        background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,.65));
        transition: opacity .25s; color: #fff;
      }
      .ymf-ctrl.ymf-hidden { opacity: 0; }
      .ymf-ctrl.ymf-hidden * { pointer-events: none; }
      .ymf-top { display: flex; justify-content: flex-end; gap: 4px; padding: 10px 12px 0; }
      .ymf-mid { display: flex; align-items: center; justify-content: center; gap: 48px; }
      .ymf-round {
        width: 48px; height: 48px; border-radius: 50%; border: 0; padding: 0; color: #fff;
        background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center;
        position: relative;
      }
      .ymf-round.ymf-big { width: 68px; height: 68px; background: rgba(0, 0, 0, 0.45); }
      .ymf-round small { position: absolute; font-size: 10px; font-weight: 700; top: 50%; left: 50%; transform: translate(-50%, -42%); }
      .ymf-bottom { padding: 0 16px 14px; }
      .ymf-time { font-size: 13px; font-variant-numeric: tabular-nums; margin-bottom: 6px; opacity: .9; }
      .ymf-bar { position: relative; height: 24px; display: flex; align-items: center; }
      .ymf-track { position: relative; width: 100%; height: 4px; border-radius: 2px; background: rgba(255,255,255,.3); }
      .ymf-fillbar { position: absolute; left: 0; top: 0; bottom: 0; background: #f00; border-radius: 2px; }
      .ymf-knob { position: absolute; top: 50%; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: #f00; }

      /* --- Подсказка --- */
      #ymf-toast {
        position: fixed; left: 50%; bottom: calc(160px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%); z-index: 2147483647; padding: 10px 16px; border-radius: 8px;
        background: #f1f1f1; color: #0f0f0f; font-size: 14px; font-weight: 500; pointer-events: none;
        transition: opacity .25s; opacity: 0; white-space: nowrap;
      }
      #ymf-toast.ymf-show { opacity: 1; }
    `;
    return css;
  }

  function injectCss() {
    const root = document.head || document.documentElement;
    if (!root || document.getElementById('yt-mobile-fix-style')) return;
    const style = document.createElement('style');
    style.id = 'yt-mobile-fix-style';
    style.textContent = buildCss();
    root.appendChild(style);
  }

  function toast(text) {
    let t = document.getElementById('ymf-toast');
    if (!t) { t = el('div', 'ymf'); t.id = 'ymf-toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('ymf-show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('ymf-show'), 2200);
  }

  // ================= СУБТИТРЫ =================
  function setStickyCaptionsOff() {
    try {
      const now = Date.now();
      localStorage.setItem('yt-player-sticky-caption',
        JSON.stringify({ data: 'false', expiration: now + 365 * 864e5, creation: now }));
    } catch (e) { /* localStorage может быть недоступен */ }
  }

  let captionsDoneFor = null;
  function turnOffCaptions() {
    const player = document.getElementById('movie_player');
    if (!player) return;
    const vid = new URLSearchParams(location.search).get('v') || location.pathname;
    if (captionsDoneFor === vid) return;
    const video = player.querySelector('video');
    if (!video || video.paused) return; // трогаем плеер только когда видео уже играет
    captionsDoneFor = vid;
    try {
      if (typeof player.setOption === 'function') player.setOption('captions', 'track', {});
      if (typeof player.unloadModule === 'function') { player.unloadModule('captions'); player.unloadModule('cc'); }
    } catch (e) { log('не удалось выключить субтитры', e); }
  }

  // ================= ТАЙМЕР СНА =================
  const SLEEP_KEY = 'ymf-sleep-end';
  function getSleepEnd() { try { return Number(localStorage.getItem(SLEEP_KEY)) || 0; } catch (e) { return 0; } }
  function setSleepEnd(ts) {
    try { if (ts) localStorage.setItem(SLEEP_KEY, String(ts)); else localStorage.removeItem(SLEEP_KEY); } catch (e) {}
  }
  function sleepLeft() {
    const end = getSleepEnd();
    return end > Date.now() ? Math.ceil((end - Date.now()) / 60000) : 0;
  }
  function setSleep(minutes) {
    if (minutes) { setSleepEnd(Date.now() + minutes * 60000); toast(`Таймер сна: ${minutes} мин`); }
    else { setSleepEnd(0); toast('Таймер сна выключен'); }
    updateFab();
  }
  function checkSleep() {
    const end = getSleepEnd();
    if (end && Date.now() >= end) {
      setSleepEnd(0);
      // Если таймер закончился давно (Safari был свёрнут, телефон спал) — просто сбрасываем,
      // чтобы не ставить на паузу видео, которое ты включаешь сейчас.
      if (Date.now() - end > 2 * 60000) { updateFab(); return; }
      document.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch (e) {} });
      const p = document.getElementById('movie_player');
      try { if (p && typeof p.pauseVideo === 'function') p.pauseVideo(); } catch (e) {}
      toast('Спокойной ночи — видео на паузе');
    }
    updateFab();
  }

  // ================= РЕКОМЕНДАЦИИ =================
  const DUR_RE = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;
  const WATCHED_RE = /ResumePlayback|percentDurationWatched|WatchedProgress|startPercent/;

  function parseDuration(str) {
    const p = str.trim().split(':').map(Number);
    return p.length === 3 ? p[0] * 60 + p[1] + p[2] / 60 : p[0] + p[1] / 60;
  }

  function textOf(x) {
    if (!x) return '';
    if (typeof x === 'string') return x;
    if (typeof x.simpleText === 'string') return x.simpleText;
    if (Array.isArray(x.runs)) return x.runs.map((r) => r.text || '').join('');
    if (typeof x.content === 'string') return x.content;
    return '';
  }

  function findDeep(o, test, depth = 0) {
    if (!o || typeof o !== 'object' || depth > 14) return undefined;
    for (const [k, v] of Object.entries(o)) {
      if (test(k, v)) return v;
      if (v && typeof v === 'object') {
        const r = findDeep(v, test, depth + 1);
        if (r !== undefined) return r;
      }
    }
    return undefined;
  }

  // Достаём видео из данных страницы YouTube (ytInitialData), не завися от конкретной разметки
  function extractVideos(data) {
    const out = new Map();
    (function walk(o, key) {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { for (const x of o) walk(x, key); return; }
      const id = typeof o.videoId === 'string' && o.videoId.length === 11 ? o.videoId
        : (o.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' && typeof o.contentId === 'string' ? o.contentId : null);
      if (id && !/reel|short/i.test(key || '') && !o.playlistId && !out.has(id)) {
        const title = textOf(o.title) || textOf(o.headline) ||
          textOf(findDeep(o, (k, v) => (k === 'title' || k === 'headline') && !!textOf(v)));
        if (title) {
          const dur = findDeep(o, (k, v) => typeof v === 'string' && DUR_RE.test(v.trim()));
          let channel = textOf(o.shortBylineText) || textOf(o.longBylineText) || textOf(o.ownerText);
          if (!channel) {
            const parts = findDeep(o, (k, v) => k === 'metadataParts' && Array.isArray(v));
            if (parts && parts[0]) channel = textOf(parts[0].text);
          }
          let watched = false;
          try { watched = WATCHED_RE.test(JSON.stringify(o)); } catch (e) {}
          out.set(id, { id, title, channel: channel || '', duration: dur ? dur.trim() : '', minutes: dur ? parseDuration(dur) : null, watched });
        }
      }
      for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, k);
    })(data, '');
    return [...out.values()];
  }

  function decodeJsString(raw) {
    const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
    return raw.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[\s\S])/g, (m, e) => {
      if (e.length === 3 && e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
      if (e.length === 5 && e[0] === 'u') return String.fromCharCode(parseInt(e.slice(1), 16));
      return simple[e] !== undefined ? simple[e] : e;
    });
  }

  function parseInitialData(html) {
    const m = html.match(/ytInitialData\s*=\s*(['{])/);
    if (!m) return null;
    const start = m.index + m[0].length - 1;
    let json;
    if (m[1] === "'") {
      // Мобильная версия: данные записаны строкой с экранированием
      let i = start + 1;
      for (;;) {
        i = html.indexOf("'", i);
        if (i < 0) return null;
        let bs = 0;
        for (let j = i - 1; html[j] === '\\'; j--) bs++;
        if (bs % 2 === 0) break;
        i++;
      }
      json = decodeJsString(html.slice(start + 1, i));
    } else {
      const end = html.indexOf(';</script>', start);
      if (end < 0) return null;
      json = html.slice(start, end);
    }
    try { return JSON.parse(json); } catch (e) { log('не удалось разобрать ytInitialData', e); return null; }
  }

  // Запасной вариант — видео, которые уже видны на текущей странице
  function scrapePage() {
    const out = [];
    const seen = new Set();
    document.querySelectorAll('a[href*="/watch?v="]').forEach((a) => {
      if (a.closest('.ymf')) return;
      let url;
      try { url = new URL(a.href, location.origin); } catch (e) { return; }
      const id = url.searchParams.get('v');
      if (!id || seen.has(id) || url.searchParams.has('list')) return;
      const card = a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytm-video-with-context-renderer, ytm-rich-item-renderer, ytm-compact-video-renderer, ytm-media-item') || a.parentElement;
      const titleEl = card && card.querySelector('#video-title, h3, .media-item-headline, [title]');
      const title = (titleEl && (titleEl.getAttribute('title') || titleEl.textContent) || '').trim();
      if (!title) return;
      seen.add(id);
      const m = (card.innerText || '').match(/(?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s|$)/);
      out.push({
        id, title, channel: '', duration: m ? m[1] : '', minutes: m ? parseDuration(m[1]) : null,
        watched: !!card.querySelector('ytd-thumbnail-overlay-resume-playback-renderer, .thumbnail-overlay-resume-playback-progress, yt-thumbnail-overlay-progress-bar-view-model'),
      });
    });
    return out;
  }

  async function loadRecommendations() {
    let list = [];
    try {
      const res = await fetch('/', { credentials: 'include' });
      const data = parseInitialData(await res.text());
      if (data) list = extractVideos(data);
    } catch (e) { log('не удалось загрузить главную', e); }
    const seen = new Set(list.map((v) => v.id));
    for (const v of scrapePage()) if (!seen.has(v.id)) { seen.add(v.id); list.push(v); }
    const current = new URLSearchParams(location.search).get('v');
    return list.filter((v) => v.id !== current);
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ================= ШТОРКА =================
  let sheetEls = null;

  function closeSheet() {
    if (!sheetEls) return;
    const { backdrop, sheet } = sheetEls;
    sheetEls = null;
    backdrop.classList.remove('ymf-show');
    sheet.classList.remove('ymf-show');
    document.documentElement.classList.remove('ymf-sheet-open');
    setTimeout(() => { backdrop.remove(); sheet.remove(); }, 260);
  }

  function openSheet(build) {
    closeSheet();
    const backdrop = el('div', 'ymf'); backdrop.id = 'ymf-backdrop';
    const sheet = el('div', 'ymf'); sheet.id = 'ymf-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.append(el('div', 'ymf-grab'));
    backdrop.addEventListener('click', closeSheet);
    build(sheet);
    document.body.append(backdrop, sheet);
    document.documentElement.classList.add('ymf-sheet-open');
    sheetEls = { backdrop, sheet };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      backdrop.classList.add('ymf-show'); sheet.classList.add('ymf-show');
    }));
  }

  function menuRow(iconName, label, sub, onClick) {
    const r = tapButton('ymf-row', label, icon(iconName), onClick);
    r.append(el('span', '', label));
    if (sub) r.append(el('span', 'ymf-sub', sub));
    return r;
  }

  function openMenu() {
    openSheet((sheet) => {
      const scroll = el('div', 'ymf-scroll');
      scroll.append(menuRow('recs', 'Для тебя', '', () => openRecs()));

      const left = sleepLeft();
      scroll.append(menuRow('moon', 'Таймер сна', left ? `осталось ${left} мин` : 'выключен', () => {}));
      const chips = el('div', 'ymf-chips');
      const addChip = (label, minutes, on) => {
        chips.append(tapButton('ymf-chip' + (on ? ' ymf-on' : ''), label, document.createTextNode(label), () => {
          setSleep(minutes); closeSheet();
        }));
      };
      addChip('Выкл', 0, !left);
      for (const m of SETTINGS.sleepOptions) addChip(`${m} мин`, m, false);
      scroll.append(chips);

      if (isWatchPage() && findVideo()) {
        scroll.append(el('div', 'ymf-sep'));
        scroll.append(menuRow('fill', 'На весь экран', '', () => { closeSheet(); openOverlay('fill'); }));
        scroll.append(menuRow('rotl', 'Повернуть влево', '', () => { closeSheet(); openOverlay('rotl'); }));
        scroll.append(menuRow('rotr', 'Повернуть вправо', '', () => { closeSheet(); openOverlay('rotr'); }));
      }
      sheet.append(scroll);
    });
  }

  let recsCache = null;
  let recsMin = SETTINGS.recsDefaultMinMinutes;

  function openRecs(forceReload) {
    openSheet((sheet) => {
      const head = el('div', 'ymf-head');
      head.append(el('h2', '', 'Для тебя'));
      head.append(tapButton('ymf-icon-btn', 'Обновить', icon('refresh'), () => openRecs(true)));
      head.append(tapButton('ymf-icon-btn', 'Закрыть', icon('close'), closeSheet));
      const chips = el('div', 'ymf-chips');
      const list = el('div', 'ymf-scroll');
      sheet.append(head, chips, list);

      const render = () => {
        chips.textContent = '';
        for (const [label, m] of [['Любые', 0], ['От 10 мин', 10], ['От 30 мин', 30]]) {
          chips.append(tapButton('ymf-chip' + (recsMin === m ? ' ymf-on' : ''), label, document.createTextNode(label), () => {
            recsMin = m; render();
          }));
        }
        list.textContent = '';
        if (!recsCache) { list.append(el('div', 'ymf-empty', 'Загружаю рекомендации…')); return; }
        const items = recsCache.filter((v) =>
          !(SETTINGS.recsSkipWatched && v.watched) && (!recsMin || (v.minutes !== null && v.minutes >= recsMin)));
        if (!items.length) {
          list.append(el('div', 'ymf-empty', recsCache.length
            ? 'Под этот фильтр ничего не нашлось. Попробуй «Любые» или нажми «Обновить».'
            : 'Не получилось загрузить рекомендации. Проверь, что ты вошёл в аккаунт, и нажми «Обновить».'));
          return;
        }
        for (const v of items) list.append(videoRow(v));
      };

      if (forceReload || !recsCache) {
        recsCache = null;
        loadRecommendations().then((l) => { recsCache = shuffle(l); render(); });
      }
      render();
    });
  }

  function videoRow(v) {
    const b = tapButton('ymf-video', v.title, null, () => { location.href = '/watch?v=' + encodeURIComponent(v.id); });
    const thumb = el('div', 'ymf-thumb');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
    thumb.append(img);
    if (v.duration) thumb.append(el('span', 'ymf-dur', v.duration));
    const meta = el('div', 'ymf-meta');
    meta.append(el('div', 'ymf-title', v.title));
    if (v.channel) meta.append(el('div', 'ymf-chan', v.channel));
    b.append(thumb, meta);
    return b;
  }

  // ================= ВЕСЬ ЭКРАН / ПОВОРОТ =================
  // Переносим само <video> в свой слой поверх страницы — так разметка YouTube не мешает.
  // На iPhone сайт не может поворачивать экран, поэтому поворачиваем видео сами:
  // включи блокировку поворота (замочек) и выбери «Повернуть влево/вправо».
  let overlay = null;

  function findVideo() {
    return document.querySelector('#movie_player video, video.html5-main-video, video');
  }

  function fmtTime(s) {
    if (!isFinite(s)) return '0:00';
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mm = h ? String(m).padStart(2, '0') : String(m);
    return (h ? h + ':' : '') + mm + ':' + String(sec).padStart(2, '0');
  }

  function openOverlay(mode) {
    const video = findVideo();
    if (!video) { toast('Видео не найдено'); return; }
    if (overlay) { setOverlayMode(mode); return; }

    const home = { parent: video.parentNode, next: video.nextSibling, scrollY: window.scrollY };
    // Полоска Safari «Открыть в приложении» уезжает, если страницу прокрутить вниз
    if (window.scrollY < 200) window.scrollTo(0, 200);
    const root = el('div', 'ymf'); root.id = 'ymf-overlay';
    const stage = el('div'); stage.id = 'ymf-stage';
    const ctrl = el('div', 'ymf-ctrl');
    let dragging = false;
    let hideTimer = null;

    const poke = () => {
      ctrl.classList.remove('ymf-hidden');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { if (!video.paused && !dragging) ctrl.classList.add('ymf-hidden'); }, 3000);
    };

    const top = el('div', 'ymf-top');
    top.append(
      tapButton('ymf-round', 'Повернуть влево', icon('rotl'), () => { setOverlayMode('rotl'); poke(); }),
      tapButton('ymf-round', 'Повернуть вправо', icon('rotr'), () => { setOverlayMode('rotr'); poke(); }),
      tapButton('ymf-round', 'Без поворота', icon('fill'), () => { setOverlayMode('fill'); poke(); }),
      tapButton('ymf-round', 'Закрыть', icon('close'), closeOverlay)
    );

    const playBtn = tapButton('ymf-round ymf-big', 'Пауза', icon('pause', 34), () => {
      if (video.paused) video.play().catch(() => {}); else video.pause();
      poke();
    });
    const seekBy = (d) => { video.currentTime = Math.max(0, Math.min((video.duration || 0), video.currentTime + d)); poke(); };
    const backBtn = tapButton('ymf-round', 'Назад на 10 секунд', icon('back', 30), () => seekBy(-10));
    backBtn.append(el('small', '', '10'));
    const fwdBtn = tapButton('ymf-round', 'Вперёд на 10 секунд', icon('fwd', 30), () => seekBy(10));
    fwdBtn.append(el('small', '', '10'));
    const mid = el('div', 'ymf-mid');
    mid.append(backBtn, playBtn, fwdBtn);

    const bottom = el('div', 'ymf-bottom');
    const time = el('div', 'ymf-time', '0:00 / 0:00');
    const bar = el('div', 'ymf-bar');
    const track = el('div', 'ymf-track');
    const fillbar = el('div', 'ymf-fillbar');
    const knob = el('div', 'ymf-knob');
    track.append(fillbar, knob);
    bar.append(track);
    bottom.append(time, bar);
    ctrl.append(top, mid, bottom);

    const update = () => {
      const d = video.duration || 0;
      const p = d ? (video.currentTime / d) * 100 : 0;
      fillbar.style.width = p + '%';
      knob.style.left = p + '%';
      time.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(d)}`;
      const paused = video.paused;
      playBtn.textContent = '';
      playBtn.append(icon(paused ? 'play' : 'pause', 34));
      playBtn.setAttribute('aria-label', paused ? 'Смотреть' : 'Пауза');
    };

    // Перемотка по полоске с учётом поворота
    const fractionAt = (e) => {
      const r = track.getBoundingClientRect();
      const m = overlay && overlay.mode;
      let f;
      if (m === 'rotr') f = (e.clientY - r.top) / r.height;
      else if (m === 'rotl') f = (r.bottom - e.clientY) / r.height;
      else f = (e.clientX - r.left) / r.width;
      return Math.max(0, Math.min(1, f));
    };
    const seekTo = (e) => { if (video.duration) { video.currentTime = fractionAt(e) * video.duration; update(); } };
    bar.addEventListener('pointerdown', (e) => {
      dragging = true;
      try { bar.setPointerCapture(e.pointerId); } catch (err) {}
      seekTo(e); poke(); e.stopPropagation();
    });
    bar.addEventListener('pointermove', (e) => { if (dragging) { seekTo(e); poke(); } });
    bar.addEventListener('pointerup', () => { dragging = false; poke(); });
    bar.addEventListener('pointercancel', () => { dragging = false; });
    bar.addEventListener('click', (e) => e.stopPropagation());

    // Касание по видео показывает/прячет кнопки
    stage.addEventListener('click', () => {
      if (ctrl.classList.contains('ymf-hidden')) poke(); else ctrl.classList.add('ymf-hidden');
    });

    const events = ['timeupdate', 'play', 'pause', 'durationchange', 'loadedmetadata'];
    events.forEach((ev) => video.addEventListener(ev, update));

    stage.append(video, ctrl);
    root.append(stage);
    document.body.append(root);
    document.documentElement.classList.add('ymf-overlay-open');
    overlay = { root, video, home, update, events, mode: null };
    setOverlayMode(mode);
    update();
    poke();
    if (video.paused) video.play().catch(() => {});
  }

  function setOverlayMode(mode) {
    if (!overlay) return;
    overlay.root.classList.remove('ymf-mode-fill', 'ymf-mode-rotl', 'ymf-mode-rotr');
    overlay.root.classList.add('ymf-mode-' + mode);
    overlay.mode = mode;
  }

  function closeOverlay() {
    if (!overlay) return;
    const { root, video, home, update, events } = overlay;
    overlay = null;
    events.forEach((ev) => video.removeEventListener(ev, update));
    const wasPlaying = !video.paused;
    if (home.parent && home.parent.isConnected) {
      if (home.next && home.next.parentNode === home.parent) home.parent.insertBefore(video, home.next);
      else home.parent.appendChild(video);
    } else {
      const player = document.getElementById('movie_player');
      const box = player && player.querySelector('.html5-video-container');
      (box || player || document.body).appendChild(video);
    }
    root.remove();
    document.documentElement.classList.remove('ymf-overlay-open');
    window.scrollTo(0, home.scrollY || 0);
    window.dispatchEvent(new Event('resize'));
    if (wasPlaying && video.paused) video.play().catch(() => {});
  }

  // ================= КНОПКА МЕНЮ =================
  let fab = null;
  let idleTimer = null;

  function wakeFab() {
    if (!fab) return;
    fab.classList.remove('ymf-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => fab && fab.classList.add('ymf-idle'), 3000);
  }

  function addFab() {
    if (!SETTINGS.showMenuButton || !document.body) return;
    if (fab && fab.isConnected) return;
    fab = tapButton('ymf', 'Меню YouTube Mobile Fix', icon('logo', 24), openMenu);
    fab.id = 'ymf-fab';
    fab.append(el('span', 'ymf-badge'));
    document.body.appendChild(fab);
    updateFab();
    wakeFab();
  }

  function updateFab() {
    if (!fab) return;
    const left = sleepLeft();
    fab.classList.toggle('ymf-has-badge', !!left);
    const badge = fab.querySelector('.ymf-badge');
    if (badge) badge.textContent = left ? String(left) : '';
  }

  // ================= ПОЛОСКА «ОТКРЫТЬ В ПРИЛОЖЕНИИ» =================
  // Safari показывает её по тегу <meta name="apple-itunes-app">. Удаляем его как можно раньше.
  function removeAppBannerMeta() {
    document.querySelectorAll('meta[name="apple-itunes-app"]').forEach((m) => m.remove());
  }
  function watchAppBanner() {
    if (!SETTINGS.removeAppBanner) return;
    removeAppBannerMeta();
    const mo = new MutationObserver(removeAppBannerMeta);
    const start = () => document.documentElement && mo.observe(document.documentElement, { childList: true, subtree: true });
    if (document.documentElement) start();
    else document.addEventListener('readystatechange', start, { once: true });
    window.addEventListener('load', () => {
      mo.disconnect();
      if (document.head) mo.observe(document.head, { childList: true });
    }, { once: true });
  }

  // ================= ANDROID: ориентация в полноэкранном режиме =================
  async function onFullscreenChange() {
    const so = screen.orientation;
    if (!SETTINGS.fullscreenOrientation || !so || typeof so.lock !== 'function') return;
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    try {
      if (isFs) await so.lock(SETTINGS.fullscreenOrientation);
      else if (typeof so.unlock === 'function') so.unlock();
    } catch (e) { log('браузер не дал зафиксировать ориентацию', e); }
  }

  // ================= СТРАНИЦЫ =================
  function isWatchPage() {
    return location.pathname === '/watch' || location.pathname.startsWith('/shorts/');
  }

  function onPageChange() {
    if (!isWatchPage() && overlay) closeOverlay();
    addFab();
  }

  // ================= ЗАПУСК =================
  watchAppBanner();
  if (SETTINGS.disableCaptions) setStickyCaptionsOff();
  injectCss();

  const onReady = () => { injectCss(); onPageChange(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();

  window.addEventListener('yt-navigate-finish', onPageChange);
  window.addEventListener('state-navigateend', onPageChange);
  window.addEventListener('popstate', onPageChange);
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; onPageChange(); }
    addFab(); // если YouTube перерисовал страницу
    checkSleep();
  }, 1000);

  if (SETTINGS.disableCaptions) {
    document.addEventListener('playing', () => setTimeout(turnOffCaptions, 1000), true);
  }

  document.addEventListener('scroll', wakeFab, { passive: true, capture: true });
  document.addEventListener('touchstart', wakeFab, { passive: true, capture: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => { if (SETTINGS.fixLayout && window.scrollX) window.scrollTo(0, window.scrollY); }, 300);
  });
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
})();
