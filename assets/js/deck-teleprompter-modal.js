/**
 * deck-teleprompter-modal.js
 * Integrasi Teleprompter HP & Sinkronisasi Real-Time pada Slide Deck Utama.
 * 
 * Fitur:
 * 1. Menghubungkan DeckNav ke SyncEngine (MQTT + BroadcastChannel)
 * 2. Tombol & Pintasan [P] untuk membuka modal QR Code pairing HP
 * 3. Menerima sinyal remote clicker dari HP (next, prev, goto)
 * 4. Mengirim sinyal pergantian slide otomatis ke HP
 */
(function () {
  'use strict';

  function init() {
    if (!window.DeckNav) {
      setTimeout(init, 100);
      return;
    }

    // 1. Inisialisasi SyncEngine untuk Deck
    if (window.DeckSync) {
      window.DeckSync.init({
        role: 'deck',
        onRemoteNav: function (action, index) {
          const current = window.DeckNav.currentIndex();
          if (action === 'next') {
            window.DeckNav.goTo(current + 1);
          } else if (action === 'prev') {
            window.DeckNav.goTo(current - 1);
          } else if (action === 'goto' && typeof index === 'number') {
            window.DeckNav.goTo(index);
          }
        },
        onStatusChange: function (status) {
          updateModalStatus(status);
        }
      });

      // Dengarkan pergantian slide dari deck
      document.addEventListener('deck:activate', function (e) {
        if (e.detail && typeof e.detail.index === 'number') {
          window.DeckSync.sendSlideChange(e.detail.index);
        }
      });
    }

    // 2. Bangun UI Modal & Tombol Pemicu
    buildUI();
  }

  let modalEl = null;
  let qrCanvas = null;
  let statusTextEl = null;
  let statusDotEl = null;

  function getPresenterUrl() {
    const roomId = (window.DeckSync && window.DeckSync.roomId) || 'kwn93';
    let base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
    if (!base.endsWith('/')) base += '/';
    // Jika dibuka lewat file:// lokal, arahkan ke URL produksi Vercel agar HP bisa scan
    if (window.location.protocol === 'file:') {
      return `https://presentasi-kwn-web.vercel.app/presenter/?room=${roomId}`;
    }
    return `${base}presenter/?room=${roomId}`;
  }

  function buildUI() {
    // Tombol di deck (melayang elegan di kanan atas atau bawah)
    const btn = document.createElement('button');
    btn.id = 'btnTeleprompterModal';
    btn.setAttribute('aria-label', 'Buka Teleprompter di HP');
    btn.innerHTML = `
      <span class="tele-icon">📱</span>
      <span class="tele-label">Teleprompter HP</span>
      <span class="tele-key">P</span>
    `;
    document.body.appendChild(btn);

    // Modal Container
    modalEl = document.createElement('div');
    modalEl.id = 'teleprompterModal';
    modalEl.className = 'tele-modal-overlay';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="tele-modal-card" role="dialog" aria-modal="true">
        <header class="tele-modal-header">
          <div class="tele-modal-title">
            <span class="tele-modal-seal"></span>
            <h3>Teleprompter &amp; Remote HP</h3>
          </div>
          <button class="tele-modal-close" id="btnTeleClose" aria-label="Tutup Modal">&times;</button>
        </header>

        <div class="tele-modal-body">
          <div class="tele-qr-pane">
            <div class="tele-qr-box" id="teleQrBox"></div>
            <div class="tele-status-row">
              <span class="tele-status-dot" id="teleStatusDot"></span>
              <span id="teleStatusText" class="tele-status-text">Menyambung...</span>
            </div>
          </div>

          <div class="tele-info-pane">
            <p class="tele-guide-title">Buka Naskah Presenter di HP:</p>
            <p class="tele-guide-desc">
              Arahkan kamera HP ke QR Code di samping. Naskah pidato, waktu, dan catatan slide akan tampil otomatis di HP dan tersinkronisasi secara real-time saat slide bergerak.
            </p>

            <div class="tele-url-box">
              <input type="text" id="teleUrlInput" readonly spellcheck="false" />
              <button id="btnCopyTeleUrl" class="tele-copy-btn">Salin</button>
            </div>

            <div class="tele-actions">
              <a id="btnOpenNewTab" target="_blank" rel="noopener noreferrer" class="tele-btn-link">
                Buka di Tab Baru (Laptop) ↗
              </a>
              <p class="tele-key-hint">Tip: Anda juga bisa menekan tombol <strong>[P]</strong> kapan saja untuk membuka/menutup jendela ini.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    // Injeksi CSS Modal
    const style = document.createElement('style');
    style.textContent = `
      #btnTeleprompterModal {
        position: fixed;
        bottom: 12px;
        right: 18px;
        z-index: 45;
        background: rgba(26, 24, 20, 0.88);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid var(--rule);
        color: var(--ink);
        padding: 6px 12px;
        border-radius: 999px;
        font-family: var(--font-mono);
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
      }
      #btnTeleprompterModal:hover {
        background: var(--paper);
        border-color: var(--vermilion);
        color: var(--ink);
        transform: translateY(-1px);
      }
      .tele-icon { font-size: 14px; }
      .tele-key {
        font-size: 9px;
        background: rgba(21,19,15,0.12);
        padding: 1px 5px;
        border-radius: 4px;
        border: 1px solid var(--rule);
        color: var(--vermilion-2);
      }

      /* Modal Overlay */
      .tele-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 900;
        background: rgba(18, 17, 14, 0.72);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.28s var(--ease);
      }
      .tele-modal-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .tele-modal-card {
        background: var(--paper);
        border: 1px solid var(--rule-2);
        box-shadow: 0 24px 60px rgba(0,0,0,0.35);
        border-radius: 12px;
        width: 100%;
        max-width: 580px;
        overflow: hidden;
        transform: scale(0.94) translateY(12px);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .tele-modal-overlay.open .tele-modal-card {
        transform: scale(1) translateY(0);
      }

      .tele-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-bottom: 1px solid var(--rule);
      }
      .tele-modal-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tele-modal-seal {
        width: 8px;
        height: 8px;
        background: var(--vermilion);
        display: inline-block;
      }
      .tele-modal-title h3 {
        font-family: var(--font-display);
        font-size: 19px;
        color: var(--ink);
        font-weight: 700;
      }
      .tele-modal-close {
        font-size: 24px;
        line-height: 1;
        color: var(--muted);
        cursor: pointer;
        padding: 2px 6px;
      }
      .tele-modal-close:hover { color: var(--vermilion); }

      .tele-modal-body {
        padding: 20px;
        display: grid;
        grid-template-columns: 210px 1fr;
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 540px) {
        .tele-modal-body { grid-template-columns: 1fr; text-align: center; }
        .tele-qr-pane { display: flex; flex-direction: column; align-items: center; }
      }

      .tele-qr-box {
        background: #FFF;
        padding: 10px;
        border: 1px solid var(--rule);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }
      .tele-qr-box canvas { display: block; max-width: 100%; height: auto; }

      .tele-status-row {
        margin-top: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--ink-2);
      }
      .tele-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #888;
      }
      .tele-status-dot.connected { background: #34A853; box-shadow: 0 0 6px #34A853; }
      .tele-status-dot.connecting { background: #FBBC05; }
      .tele-status-dot.error { background: #EA4335; }

      .tele-guide-title {
        font-family: var(--font-display);
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 6px;
        color: var(--ink);
      }
      .tele-guide-desc {
        font-size: 13px;
        line-height: 1.55;
        color: var(--ink-2);
        margin-bottom: 14px;
      }
      .tele-url-box {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(21,19,15,0.06);
        border: 1px solid var(--rule);
        border-radius: 6px;
        padding: 4px 6px;
        margin-bottom: 14px;
      }
      .tele-url-box input {
        flex: 1;
        background: none;
        border: none;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--ink-2);
        outline: none;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tele-copy-btn {
        background: var(--paper);
        border: 1px solid var(--rule);
        padding: 4px 8px;
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 10px;
        cursor: pointer;
        color: var(--ink);
      }
      .tele-copy-btn:hover { background: var(--vermilion); color: #FFF; border-color: var(--vermilion); }

      .tele-btn-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 700;
        color: var(--vermilion-2);
        text-decoration: none;
        margin-bottom: 10px;
      }
      .tele-btn-link:hover { text-decoration: underline; }
      .tele-key-hint {
        font-size: 11px;
        color: var(--muted);
        line-height: 1.4;
      }
    `;
    document.head.appendChild(style);

    qrCanvas = document.getElementById('teleQrCanvas');
    statusTextEl = document.getElementById('teleStatusText');
    statusDotEl = document.getElementById('teleStatusDot');

    const url = getPresenterUrl();
    document.getElementById('teleUrlInput').value = url;
    document.getElementById('btnOpenNewTab').href = url;

    // Tombol Copy URL
    document.getElementById('btnCopyTeleUrl').addEventListener('click', function () {
      navigator.clipboard.writeText(url).then(function () {
        const prev = document.getElementById('btnCopyTeleUrl').textContent;
        document.getElementById('btnCopyTeleUrl').textContent = 'Disalin!';
        setTimeout(function () {
          document.getElementById('btnCopyTeleUrl').textContent = prev;
        }, 1500);
      });
    });

    // Render QR Code
    renderQrCode(url);

    // Event listeners
    btn.addEventListener('click', openModal);
    document.getElementById('btnTeleClose').addEventListener('click', closeModal);
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });

    // Global keyboard shortcut 'P'
    document.addEventListener('keydown', function (e) {
      if (e.key === 'p' || e.key === 'P') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !document.body.classList.contains('editing')) {
          e.preventDefault();
          toggleModal();
        }
      } else if (e.key === 'Escape' && modalEl.classList.contains('open')) {
        closeModal();
      }
    });
  }

  function renderQrCode(url) {
    const box = document.getElementById('teleQrBox');
    if (!box) return;
    box.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(box, {
          text: url,
          width: 190,
          height: 190,
          colorDark: '#15130F',
          colorLight: '#FFFFFF',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.warn('[TeleprompterModal] QR render error:', err);
      }
    }
  }

  function updateModalStatus(status) {
    if (!statusDotEl || !statusTextEl) return;
    statusDotEl.className = `tele-status-dot ${status}`;
    if (status === 'connected') {
      const room = (window.DeckSync && window.DeckSync.roomId) || 'kwn93';
      statusTextEl.textContent = `Aktif (Room: ${room.toUpperCase()})`;
    } else if (status === 'connecting') {
      statusTextEl.textContent = 'Menyambung broker...';
    } else {
      statusTextEl.textContent = 'Offline';
    }
  }

  function openModal() {
    if (!modalEl) return;
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
    const url = getPresenterUrl();
    renderQrCode(url);
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  function toggleModal() {
    if (modalEl && modalEl.classList.contains('open')) closeModal();
    else openModal();
  }

  window.DeckTeleprompter = {
    open: openModal,
    close: closeModal,
    toggle: toggleModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
