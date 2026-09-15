import { useEffect, useRef, useState } from 'react';
import type { Milestone, PriceInfo, ServerMessage, ShrineState, TokenInfo } from './protocol';
import { connect, type ConnectionStatus } from './ws';

export interface ShrineData {
  ready: boolean;
  status: ConnectionStatus;
  state: ShrineState | null;
  token: TokenInfo | null;
  price: PriceInfo | null;
  milestones: Milestone[];
  demo: boolean;
  prelaunch: boolean;
  launchAt: number | null;
  /** the most recently announced milestone, for a toast; cleared after a while */
  toast: Milestone | null;
}

const DEFAULT_MILESTONES: Milestone[] = [
  { index: 0, name: 'The Sighting', mcapUsd: 50_000, line: 'A shape on the desert road. Horns. Aviators. It flexes.' },
  { index: 1, name: 'The Awakening', mcapUsd: 250_000, line: 'The beast has smelled the wealth.' },
  { index: 2, name: 'The Flex', mcapUsd: 1_000_000, line: 'Both arms up. The charts bow.' },
  { index: 3, name: 'Mr. Wealthwide', mcapUsd: 5_000_000, line: 'Every timezone. Every bag.' },
  { index: 4, name: 'The Stampede', mcapUsd: 25_000_000, line: 'The herd follows the beast.' },
  { index: 5, name: 'Worldwide', mcapUsd: 100_000_000, line: 'Nobody laughed. Everybody held.' },
  { index: 6, name: 'DALE.', mcapUsd: 1_000_000_000, line: 'The prophecy is complete.' },
];

/** Live shrine data over the WebSocket, with the milestone list falling back to the built-in prophecy while offline. */
export function useShrine(): ShrineData {
  const [data, setData] = useState<ShrineData>({
    ready: false,
    status: 'connecting',
    state: null,
    token: null,
    price: null,
    milestones: DEFAULT_MILESTONES,
    demo: false,
    prelaunch: false,
    launchAt: null,
    toast: null,
  });
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const stop = connect({
      onStatus: (status) => setData((d) => ({ ...d, status })),
      onMessage: (msg: ServerMessage) => {
        switch (msg.type) {
          case 'hello':
            setData((d) => ({
              ...d,
              ready: true,
              state: msg.state,
              token: msg.token,
              price: msg.price,
              milestones: msg.milestones.length > 0 ? msg.milestones : d.milestones,
              demo: msg.demo,
              prelaunch: msg.prelaunch,
              launchAt: msg.launchAt,
            }));
            break;
          case 'state':
            setData((d) => ({ ...d, state: msg.state }));
            break;
          case 'price':
            setData((d) => ({ ...d, price: msg.price, state: msg.state }));
            break;
          case 'milestone':
            setData((d) => ({ ...d, state: msg.state, toast: msg.milestone }));
            if (toastTimer.current) window.clearTimeout(toastTimer.current);
            toastTimer.current = window.setTimeout(() => setData((d) => ({ ...d, toast: null })), 9000);
            break;
        }
      },
    });
    return () => {
      stop();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  return data;
}
