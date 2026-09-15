import { EventEmitter } from 'node:events';
import type { TradeSide } from './protocol.js';

export interface DemoTrade {
  side: TradeSide;
  usd: number;
  /** a fresh wallet joins on this buy */
  newHolder: boolean;
}

/** Synthetic trade feed for local development and pre-launch demos: the shrine stats move without a chain. */
export class DemoFeed extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly buyBias = 0.6) {
    super();
  }

  start() {
    const tick = () => {
      // log-normal size: median ~$90, long tail up to whales
      const n = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
      let usd = Math.min(80_000, Math.max(1, Math.exp(4.5 + 1.5 * n)));
      if (Math.random() < 0.05) usd = 15_000 + Math.random() * 40_000;
      const side: TradeSide = Math.random() < this.buyBias ? 'buy' : 'sell';
      this.emit('trade', { side, usd: Math.round(usd * 100) / 100, newHolder: side === 'buy' && Math.random() < 0.45 } satisfies DemoTrade);
      this.timer = setTimeout(tick, 600 + Math.random() * 3500);
    };
    this.timer = setTimeout(tick, 500);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
