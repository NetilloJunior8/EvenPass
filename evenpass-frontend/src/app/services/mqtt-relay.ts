export type MqttStatusHandler = (connected: boolean) => void;
export type MqttMessageHandler = (topic: string, data: any) => void;

/**
 * Lightweight zero-dependency MQTT 3.1.1 over TLS WebSocket (WSS) client.
 * Provides instant (<150ms) cross-origin pub/sub without HTTP REST polling or 429 rate-limits.
 */
export class MqttCloudRelay {
  private ws: WebSocket | null = null;
  private keepaliveTimer: any = null;
  private reconnectTimer: any = null;
  private brokerIndex = 0;
  private ready = false;
  private stopped = false;
  private outbox: Array<{ topic: string; payload: string; retain: boolean }> = [];
  private subscribedTopics = new Set<string>();
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  constructor(
    private readonly brokers: string[],
    private readonly clientPrefix: string,
    private readonly onMessage: MqttMessageHandler,
    private readonly onStatus?: MqttStatusHandler
  ) {}

  start(initialTopics: string[]): void {
    initialTopics.forEach(t => this.subscribedTopics.add(t));
    this.stopped = false;
    this.connect();
  }

  subscribeTopic(topic: string): void {
    if (!topic || this.subscribedTopics.has(topic)) return;
    this.subscribedTopics.add(topic);
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ready) {
      this.sendSubscribe([topic]);
    }
  }

  publish(topic: string, data: any, retain: boolean = false): void {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ready) {
      try {
        this.ws.send(this.encodePublish(topic, payload, retain));
        return;
      } catch {}
    }
    this.outbox.push({ topic, payload, retain });
    if (this.outbox.length > 40) {
      this.outbox.shift();
    }
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.ready = false;
    this.onStatus?.(false);
  }

  private connect(): void {
    if (this.stopped || typeof WebSocket === 'undefined' || this.brokers.length === 0) return;
    this.clearTimers();
    this.ready = false;

    const url = this.brokers[this.brokerIndex % this.brokers.length];
    try {
      const ws = new WebSocket(url, 'mqtt');
      ws.binaryType = 'arraybuffer';
      this.ws = ws;

      const handshakeWatchdog = setTimeout(() => {
        if (!this.ready && this.ws === ws) {
          try { ws.close(); } catch {}
        }
      }, 6500);

      ws.onopen = () => {
        const clientId = `${this.clientPrefix}_${Math.random().toString(36).slice(2, 10)}`;
        ws.send(this.encodeConnect(clientId));
      };

      ws.onmessage = (evt) => {
        const rawData = evt.data as ArrayBuffer | ArrayBufferView | null;
        const buf = rawData instanceof Uint8Array
          ? rawData
          : rawData && ArrayBuffer.isView(rawData)
            ? new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength)
            : (rawData && typeof (rawData as ArrayBuffer).byteLength === 'number')
              ? new Uint8Array(rawData as ArrayBuffer)
              : null;
        if (!buf) return;
        let offset = 0;

        while (offset < buf.length) {
          const header = buf[offset];
          const pktType = (header >> 4) & 0x0f;
          const flags = header & 0x0f;
          let pos = offset + 1;
          let remLen = 0;
          let multiplier = 1;
          let malformed = false;

          while (pos < buf.length) {
            const b = buf[pos++];
            remLen += (b & 0x7f) * multiplier;
            multiplier *= 128;
            if ((b & 0x80) === 0) break;
            if (multiplier > 2097152) {
              malformed = true;
              break;
            }
          }

          const pktEnd = pos + remLen;
          if (malformed || pktEnd > buf.length) break;

          if (pktType === 2) { // CONNACK
            clearTimeout(handshakeWatchdog);
            const topics = Array.from(this.subscribedTopics);
            if (topics.length > 0) {
              this.sendSubscribe(topics);
            } else {
              this.markReady();
            }
          } else if (pktType === 9) { // SUBACK
            this.markReady();
          } else if (pktType === 3) { // PUBLISH
            if (pos + 2 <= pktEnd) {
              const tLen = (buf[pos] << 8) | buf[pos + 1];
              let pStart = pos + 2 + tLen;
              const topic = this.textDecoder.decode(buf.subarray(pos + 2, pos + 2 + tLen));
              if ((flags & 0x06) !== 0) {
                pStart += 2; // Skip QoS packet identifier
              }
              if (pStart <= pktEnd) {
                const rawText = this.textDecoder.decode(buf.subarray(pStart, pktEnd));
                try {
                  const parsed = JSON.parse(rawText);
                  this.onMessage(topic, parsed);
                } catch {}
              }
            }
          }

          offset = pktEnd;
        }
      };

      ws.onerror = () => {
        clearTimeout(handshakeWatchdog);
        this.onStatus?.(false);
      };

      ws.onclose = () => {
        clearTimeout(handshakeWatchdog);
        this.ready = false;
        this.ws = null;
        this.clearTimers();
        this.onStatus?.(false);
        if (!this.stopped) {
          this.brokerIndex = (this.brokerIndex + 1) % this.brokers.length;
          this.reconnectTimer = setTimeout(() => this.connect(), 2500);
        }
      };
    } catch {
      this.onStatus?.(false);
      if (!this.stopped) {
        this.brokerIndex = (this.brokerIndex + 1) % this.brokers.length;
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    }
  }

  private markReady(): void {
    this.ready = true;
    this.onStatus?.(true);

    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
    this.keepaliveTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.send(new Uint8Array([0xc0, 0x00])); } catch {}
      }
    }, 25000);

    while (this.outbox.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const next = this.outbox.shift()!;
      try {
        this.ws.send(this.encodePublish(next.topic, next.payload, next.retain));
      } catch {}
    }
  }

  private sendSubscribe(topics: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || topics.length === 0) return;
    const pid = Math.floor(1 + Math.random() * 60000);
    const parts: Uint8Array[] = [new Uint8Array([(pid >> 8) & 0xff, pid & 0xff])];
    topics.forEach(t => {
      parts.push(this.encodeStr(t));
      parts.push(new Uint8Array([0]));
    });
    const body = this.concat(parts);
    const frame = this.concat([new Uint8Array([0x82]), this.encodeRemLen(body.length), body]);
    try { this.ws.send(frame); } catch {}
  }

  private encodeConnect(clientId: string): Uint8Array {
    const vh = this.concat([this.encodeStr('MQTT'), new Uint8Array([4, 2, 0, 60])]);
    const pl = this.encodeStr(clientId);
    const body = this.concat([vh, pl]);
    return this.concat([new Uint8Array([0x10]), this.encodeRemLen(body.length), body]);
  }

  private encodePublish(topic: string, msg: string, retain: boolean): Uint8Array {
    const body = this.concat([this.encodeStr(topic), this.textEncoder.encode(msg)]);
    const headerByte = retain ? 0x31 : 0x30;
    return this.concat([new Uint8Array([headerByte]), this.encodeRemLen(body.length), body]);
  }

  private encodeStr(s: string): Uint8Array {
    const b = this.textEncoder.encode(s);
    const out = new Uint8Array(2 + b.length);
    out[0] = (b.length >> 8) & 0xff;
    out[1] = b.length & 0xff;
    out.set(b, 2);
    return out;
  }

  private encodeRemLen(len: number): Uint8Array {
    const bytes: number[] = [];
    let n = len;
    do {
      let d = n % 128;
      n = Math.floor(n / 128);
      if (n > 0) d |= 0x80;
      bytes.push(d);
    } while (n > 0);
    return new Uint8Array(bytes);
  }

  private concat(chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  private clearTimers(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
