/**
 * sync-engine.js
 * Mesin sinkronisasi real-time dua arah antara Presentasi Utama (Laptop)
 * dan Teleprompter Mobile (HP).
 * 
 * Mendukung:
 * 1. MQTT over Secure WebSocket (wss://broker.hivemq.com:8884/mqtt) -> Antar perangkat (Laptop Wi-Fi <-> HP 4G/5G)
 * 2. BroadcastChannel -> Same-browser dual-monitor (0ms latency)
 * 3. LocalStorage Event -> Cross-tab fallback
 */
(function (global) {
  'use strict';

  const DEFAULT_ROOM = 'kwn93';
  const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';

  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  const DeckSync = {
    role: 'deck', // 'deck' atau 'teleprompter'
    roomId: DEFAULT_ROOM,
    topic: '',
    client: null,
    bc: null,
    status: 'disconnected', // 'connected', 'connecting', 'disconnected', 'error'
    callbacks: {
      onSlideChange: null,
      onRemoteNav: null,
      onStatusChange: null
    },

    init(options = {}) {
      this.role = options.role || 'deck';
      this.roomId = (getQueryParam('room') || options.roomId || DEFAULT_ROOM).toLowerCase().trim();
      this.topic = `kwn/deck/${this.roomId}`;

      if (options.onSlideChange) this.callbacks.onSlideChange = options.onSlideChange;
      if (options.onRemoteNav) this.callbacks.onRemoteNav = options.onRemoteNav;
      if (options.onStatusChange) this.callbacks.onStatusChange = options.onStatusChange;

      this.initBroadcastChannel();
      this.initLocalStorageFallback();
      this.initMqtt();

      return this;
    },

    setStatus(newStatus, detail = '') {
      this.status = newStatus;
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange(newStatus, detail);
      }
    },

    initBroadcastChannel() {
      if ('BroadcastChannel' in window) {
        try {
          this.bc = new BroadcastChannel(`kwn_sync_${this.roomId}`);
          this.bc.onmessage = (event) => {
            this.handleIncomingMessage(event.data, 'broadcast_channel');
          };
        } catch (e) {
          console.warn('[SyncEngine] BroadcastChannel error:', e);
        }
      }
    },

    initLocalStorageFallback() {
      window.addEventListener('storage', (e) => {
        if (e.key === `kwn_sync_${this.roomId}` && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleIncomingMessage(data, 'local_storage');
          } catch (err) {}
        }
      });
    },

    initMqtt() {
      if (typeof mqtt === 'undefined') {
        console.warn('[SyncEngine] MQTT library not loaded, using local channels only.');
        this.setStatus('connected', 'Local mode (offline/same-device)');
        return;
      }

      this.setStatus('connecting', 'Menghubungkan ke broker real-time...');

      const clientId = `kwn_${this.role}_${Math.random().toString(16).substring(2, 8)}`;
      try {
        this.client = mqtt.connect(BROKER_URL, {
          clientId: clientId,
          keepalive: 45,
          clean: true,
          reconnectPeriod: 2500,
          connectTimeout: 8000
        });

        this.client.on('connect', () => {
          this.setStatus('connected', 'Terhubung');
          this.client.subscribe(this.topic, { qos: 0 }, (err) => {
            if (err) {
              console.error('[SyncEngine] Subscribe error:', err);
            } else {
              // Jika teleprompter baru terhubung, minta status slide terbaru dari deck
              if (this.role === 'teleprompter') {
                this.publish({ type: 'REQUEST_STATE', sender: 'teleprompter' });
              }
            }
          });
        });

        this.client.on('message', (topic, payload) => {
          if (topic === this.topic) {
            try {
              const data = JSON.parse(payload.toString());
              this.handleIncomingMessage(data, 'mqtt');
            } catch (e) {
              console.error('[SyncEngine] Parse payload error:', e);
            }
          }
        });

        this.client.on('reconnect', () => {
          this.setStatus('connecting', 'Menyambung kembali...');
        });

        this.client.on('offline', () => {
          this.setStatus('disconnected', 'Offline');
        });

        this.client.on('error', (err) => {
          console.warn('[SyncEngine] MQTT Error:', err.message);
          this.setStatus('error', err.message);
        });
      } catch (err) {
        console.warn('[SyncEngine] MQTT initialization exception:', err);
      }
    },

    handleIncomingMessage(msg, transport) {
      if (!msg || typeof msg !== 'object') return;

      // Jangan proses pesan dari diri sendiri
      if (msg.role === this.role && msg.instanceId === this.instanceId) return;

      if (msg.type === 'SLIDE_CHANGE') {
        if (typeof msg.index === 'number' && this.callbacks.onSlideChange) {
          this.callbacks.onSlideChange(msg.index, msg);
        }
      } else if (msg.type === 'REMOTE_NAV') {
        if (this.callbacks.onRemoteNav) {
          this.callbacks.onRemoteNav(msg.action, msg.index, msg);
        }
      } else if (msg.type === 'REQUEST_STATE' && this.role === 'deck') {
        // Deck merespon dengan posisi slide saat ini
        if (window.DeckNav && typeof window.DeckNav.currentIndex === 'function') {
          this.sendSlideChange(window.DeckNav.currentIndex());
        }
      }
    },

    publish(payload) {
      payload.roomId = this.roomId;
      payload.role = this.role;
      payload.timestamp = Date.now();

      // 1. Kirim via BroadcastChannel
      if (this.bc) {
        try { this.bc.postMessage(payload); } catch (e) {}
      }

      // 2. Kirim via LocalStorage (cross-tab)
      try {
        localStorage.setItem(`kwn_sync_${this.roomId}`, JSON.stringify(payload));
      } catch (e) {}

      // 3. Kirim via MQTT (cross-device)
      if (this.client && this.client.connected) {
        this.client.publish(this.topic, JSON.stringify(payload));
      }
    },

    sendSlideChange(index) {
      this.publish({
        type: 'SLIDE_CHANGE',
        index: index
      });
    },

    sendRemoteNav(action, index = null) {
      this.publish({
        type: 'REMOTE_NAV',
        action: action, // 'next', 'prev', 'goto'
        index: index
      });
    }
  };

  global.DeckSync = DeckSync;
})(window);
