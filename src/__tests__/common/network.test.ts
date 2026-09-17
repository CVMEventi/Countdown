import { describe, it, expect } from 'vitest';
import {
  NetworkAddress,
  buildOrigin,
  buildUrl,
  countdownPath,
  pickBestAddress,
  remoteControlPath,
  sortAddressesByLanLikelihood,
} from '../../common/network.ts';

const addr = (iface: string, address: string): NetworkAddress => ({ interface: iface, address });

describe('sortAddressesByLanLikelihood', () => {
  it('picks the real interface on a machine full of private virtual addresses', () => {
    // Taken from a development machine: four of the five addresses are RFC1918,
    // so preferring private ranges alone would pick the wrong one
    const addresses = [
      addr('en0', '172.16.150.106'),
      addr('feth4264', '172.30.0.64'),
      addr('feth2203', '10.147.20.64'),
      addr('utun10', '100.64.0.2'),
      addr('feth4308', '172.25.140.101'),
    ];

    expect(pickBestAddress(addresses)).toEqual(addr('en0', '172.16.150.106'));
  });

  it('ranks a macOS laptop with a VPN up', () => {
    const addresses = [
      addr('awdl0', '169.254.55.1'),
      addr('utun4', '100.87.3.2'),
      addr('bridge100', '192.168.2.1'),
      addr('en0', '192.168.1.42'),
    ];

    expect(sortAddressesByLanLikelihood(addresses).map(a => a.interface))
      .toEqual(['en0', 'bridge100', 'utun4', 'awdl0']);
  });

  it('ranks a Windows machine with WSL', () => {
    const addresses = [
      addr('vEthernet (WSL)', '172.22.0.1'),
      addr('Wi-Fi', '192.168.0.5'),
      addr('Ethernet', '10.0.0.9'),
    ];

    expect(sortAddressesByLanLikelihood(addresses).map(a => a.interface))
      .toEqual(['Wi-Fi', 'Ethernet', 'vEthernet (WSL)']);
  });

  it('ranks a Linux machine running docker', () => {
    const addresses = [
      addr('docker0', '172.17.0.1'),
      addr('eth0', '10.0.0.5'),
      addr('wlan0', '192.168.1.7'),
    ];

    expect(sortAddressesByLanLikelihood(addresses).map(a => a.interface))
      .toEqual(['wlan0', 'eth0', 'docker0']);
  });

  it('puts link-local last and CGNAT below any private range', () => {
    const addresses = [
      addr('en5', '169.254.10.1'),
      addr('en6', '100.100.1.1'),
      addr('en7', '10.0.0.1'),
    ];

    expect(sortAddressesByLanLikelihood(addresses).map(a => a.address))
      .toEqual(['10.0.0.1', '100.100.1.1', '169.254.10.1']);
  });

  it('keeps the reported order for equally ranked addresses', () => {
    const addresses = [addr('en0', '192.168.1.2'), addr('en1', '192.168.1.3')];

    expect(sortAddressesByLanLikelihood(addresses)).toEqual(addresses);
  });

  it('does not mutate the input', () => {
    const addresses = [addr('utun0', '10.1.1.1'), addr('en0', '192.168.1.1')];
    const copy = [...addresses];

    sortAddressesByLanLikelihood(addresses);

    expect(addresses).toEqual(copy);
  });

  it('returns null for an empty list', () => {
    expect(pickBestAddress([])).toBeNull();
    expect(sortAddressesByLanLikelihood([])).toEqual([]);
  });
});

describe('url building', () => {
  it('builds an origin from an address and port', () => {
    expect(buildOrigin('192.168.1.42', 6565)).toBe('http://192.168.1.42:6565');
    expect(buildOrigin('192.168.1.42', '6565')).toBe('http://192.168.1.42:6565');
  });

  it('brackets an IPv6 literal', () => {
    expect(buildOrigin('fe80::1', 6565)).toBe('http://[fe80::1]:6565');
  });

  it('builds the remote control url', () => {
    expect(buildUrl(buildOrigin('192.168.1.42', 6565), remoteControlPath()))
      .toBe('http://192.168.1.42:6565/remote#/');
  });

  it('builds a countdown url with and without a window', () => {
    expect(countdownPath('timer1')).toBe('/remote#/countdown/timer1');
    expect(countdownPath('timer1', 'window1')).toBe('/remote#/countdown/timer1/window1');
  });

  it('does not double up the slash when the origin has a trailing one', () => {
    expect(buildUrl('http://192.168.1.42:6565/', countdownPath('timer1')))
      .toBe('http://192.168.1.42:6565/remote#/countdown/timer1');
  });
});
