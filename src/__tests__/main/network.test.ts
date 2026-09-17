import { vi, describe, it, expect, beforeEach } from 'vitest';

const networkInterfaces = vi.fn();

vi.mock('node:os', () => ({
  default: { networkInterfaces: () => networkInterfaces() },
}));

import { listLocalIPv4Addresses } from '../../main/Utilities/network.ts';

describe('listLocalIPv4Addresses', () => {
  beforeEach(() => {
    networkInterfaces.mockReset();
  });

  it('drops internal and IPv6 entries and sorts the rest', () => {
    networkInterfaces.mockReturnValue({
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      en0: [
        { address: 'fe80::1', family: 'IPv6', internal: false },
        { address: '192.168.1.42', family: 'IPv4', internal: false },
      ],
      utun4: [{ address: '10.2.2.2', family: 'IPv4', internal: false }],
    });

    expect(listLocalIPv4Addresses()).toEqual([
      { interface: 'en0', address: '192.168.1.42' },
      { interface: 'utun4', address: '10.2.2.2' },
    ]);
  });

  it('tolerates the numeric family reported by older Node releases', () => {
    networkInterfaces.mockReturnValue({
      en0: [{ address: '192.168.1.42', family: 4, internal: false }],
    });

    expect(listLocalIPv4Addresses()).toEqual([{ interface: 'en0', address: '192.168.1.42' }]);
  });

  it('returns an empty list when there are no usable interfaces', () => {
    networkInterfaces.mockReturnValue({ lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }] });

    expect(listLocalIPv4Addresses()).toEqual([]);
  });

  it('survives an interface with no entries', () => {
    networkInterfaces.mockReturnValue({ en0: undefined });

    expect(listLocalIPv4Addresses()).toEqual([]);
  });
});
