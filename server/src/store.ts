import fs from 'node:fs';
import path from 'node:path';
import type { ShrineState, Trade } from './protocol.js';

export interface Persisted {
  version: 1;
  token: string;
  state: ShrineState;
  recent: Trade[];
  lastBlock: number | null;
  savedAt: number;
  /** token balances by address (base units, as decimal strings) for the holder count */
  balances?: Record<string, string>;
}

/**
 * Tiny JSON persistence. Writes are debounced and atomic (tmp + rename) so a
 * crash mid-write never corrupts the state file.
 */
export class Store {
  private readonly file: string;
  private timer: NodeJS.Timeout | null = null;
  private pending: Persisted | null = null;
  readonly writable: boolean;

  constructor(dir: string) {
    this.file = path.join(dir, 'state.json');
    let ok = true;
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
    } catch (err) {
      ok = false;
      console.warn(`[store] ${dir} is not writable, state will not persist:`, (err as Error).message);
    }
    this.writable = ok;
  }

  load(): Persisted | null {
    try {
      if (!fs.existsSync(this.file)) return null;
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Persisted;
      if (raw.version !== 1) return null;
      return raw;
    } catch (err) {
      console.warn('[store] failed to load state:', (err as Error).message);
      return null;
    }
  }

  save(data: Persisted, delayMs = 1500) {
    if (!this.writable) return;
    this.pending = data;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, delayMs);
  }

  flush() {
    if (!this.writable || !this.pending) return;
    const data = this.pending;
    this.pending = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.warn('[store] failed to save state:', (err as Error).message);
    }
  }
}
