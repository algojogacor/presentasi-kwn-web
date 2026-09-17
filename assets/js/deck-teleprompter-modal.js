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

  function generateFriendlyPin() {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'kwn-' + code;
  }

  function getOrGenerateDeckRoomId() {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom && urlRoom.trim()) {
      return urlRoom.toLowerCase().trim();
    }
    let stored = sessionStorage.getItem('kwn_deck_room');
    if (!stored) {
      stored = generateFriendlyPin();
      sessionStorage.setItem('kwn_deck_room', stored);
    }
    return stored;
  }

  function init() {
    if (!window.DeckNav) {
      setTimeout(init, 100);
      return;
    }

    const roomId = getOrGenerateDeckRoomId();

    // 1. Inisialisasi SyncEngine untuk Deck dengan Room Terisolasi
    if (window.DeckSync) {
      window.DeckSync.init({
        role: 'deck',
        roomId: roomId,
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
    const roomId = (window.DeckSync && window.DeckSync.roomId) || getOrGenerateDeckRoomId();
    let base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
    if (!base.endsWith('/')) base += '/';
    // Jika dibuka lewat file:// lokal, arahkan ke URL produksi Vercel agar HP bisa scan
    if (window.location.protocol === 'file:') {
      return `https://presentasi-kwn-web.vercel.app/presenter/?room=${roomId}`;
    }
    return `${base}presenter/?room=${roomId}`;
  }

  function buildUI() {
    // Tombol pemicu di rel kiri (samar-samar seperti #soundToggle & mode edit E)
    const btn = document.createElement('button');
    btn.id = 'btnTeleprompterModal';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Teleprompter HP (P)');
    btn.title = 'Teleprompter HP [P]';
    btn.innerHTML = '<span>HP</span><i class="tele-dot"></i>';
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
            <div class="tele-pin-box">
              <div class="tele-pin-info">
                <span class="tele-pin-tag">PIN SESI PRIVAT</span>
                <span class="tele-pin-val" id="telePinVal">...</span>
              </div>
              <button id="btnNewSession" class="tele-btn-regen" type="button" title="Buat PIN Sesi Baru">🔄 Buat PIN Baru</button>
            </div>

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
        left: 2px;
        top: calc(50% + 44px);
        transform: translateY(-50%);
        z-index: 41;
        width: 42px;
        height: 48px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 8px;
        letter-spacing: .1em;
        color: var(--ink-3);
        opacity: .45;
        background: none;
        border: none;
        cursor: pointer;
        transition: opacity .3s ease, color .3s ease;
      }
      #btnTeleprompterModal:hover {
        opacity: 1;
        color: var(--vermilion-2);
      }
      #btnTeleprompterModal .tele-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(21,19,15,.25);
        transition: background .3s ease, box-shadow .3s ease;
      }
      #btnTeleprompterModal.connected .tele-dot {
        background: #34A853;
        box-shadow: 0 0 5px rgba(52,168,83,0.5);
      }
      .fx-print #btnTeleprompterModal,
      @media print {
        #btnTeleprompterModal { display: none !important; }
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

      .tele-pin-box {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(195,59,34,0.06);
        border: 1px solid rgba(195,59,34,0.25);
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 12px;
      }
      .tele-pin-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .tele-pin-tag {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        color: var(--vermilion);
        font-weight: 700;
        text-transform: uppercase;
      }
      .tele-pin-val {
        font-family: var(--font-mono);
        font-size: 17px;
        letter-spacing: 0.14em;
        color: var(--ink);
        font-weight: 800;
      }
      .tele-btn-regen {
        background: var(--paper);
        border: 1px solid var(--rule);
        border-radius: 6px;
        padding: 5px 10px;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--ink-2);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tele-btn-regen:hover {
        border-color: var(--vermilion);
        color: var(--vermilion);
      }

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

    // Tombol Ganti PIN Baru
    document.getElementById('btnNewSession').addEventListener('click', function () {
      const newPin = generateFriendlyPin();
      sessionStorage.setItem('kwn_deck_room', newPin);
      if (window.DeckSync) {
        window.DeckSync.switchRoom(newPin);
      }
      refreshModalData();
    });

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

    refreshModalData();
  }

  function refreshModalData() {
    const currentRoom = (window.DeckSync && window.DeckSync.roomId) || getOrGenerateDeckRoomId();
    const pinValEl = document.getElementById('telePinVal');
    if (pinValEl) pinValEl.textContent = currentRoom.toUpperCase();

    const url = getPresenterUrl();
    const urlInput = document.getElementById('teleUrlInput');
    if (urlInput) urlInput.value = url;
    const openNewTab = document.getElementById('btnOpenNewTab');
    if (openNewTab) openNewTab.href = url;

    renderQrCode(url);
    if (window.DeckSync) updateModalStatus(window.DeckSync.status);
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
    const btn = document.getElementById('btnTeleprompterModal');
    if (btn) btn.classList.toggle('connected', status === 'connected');
    if (status === 'connected') {
      const room = (window.DeckSync && window.DeckSync.roomId) || getOrGenerateDeckRoomId();
      statusTextEl.textContent = `Aktif (PIN: ${room.toUpperCase()})`;
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
    refreshModalData();
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
