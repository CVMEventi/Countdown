import { describe, it, expect } from 'vitest';
import {discoveryName, desiredServices, DiscoveryInput} from '../../main/Remotes/Discovery.ts';
import {AddDiscoverySettings} from '../../main/Migrations/AddDiscoverySettings.ts';

function input(overrides: Partial<DiscoveryInput> = {}): DiscoveryInput {
  return {
    enabled: true,
    version: '1.3.0',
    http: {running: false, port: 6565},
    osc: {running: false, port: 6566},
    ...overrides,
  }
}

describe('desiredServices', () => {
  it('advertises nothing when disabled', () => {
    expect(desiredServices(input({enabled: false, http: {running: true, port: 6565}}))).toEqual([])
  })

  it('advertises nothing when no server is running', () => {
    expect(desiredServices(input())).toEqual([])
  })

  it('advertises countdown and http on the web server port', () => {
    const services = desiredServices(input({http: {running: true, port: 7000}}))
    expect(services.map(s => [s.type, s.protocol, s.port])).toEqual([
      ['countdown', 'tcp', 7000],
      ['http', 'tcp', 7000],
    ])
    expect(services[0].txt).toEqual({version: '1.3.0', remote: '/remote', ws: '/ws'})
    expect(services[1].txt).toEqual({path: '/remote'})
  })

  it('advertises osc over udp', () => {
    expect(desiredServices(input({osc: {running: true, port: 9000}}))).toEqual([
      {name: discoveryName(), type: 'osc', protocol: 'udp', port: 9000, txt: {version: '1.3.0'}},
    ])
  })

  it('names every service after the host', () => {
    const services = desiredServices(input({http: {running: true, port: 6565}, osc: {running: true, port: 6566}}))
    expect(new Set(services.map(s => s.name))).toEqual(new Set([discoveryName()]))
  })
})

describe('discoveryName', () => {
  it('strips the .local suffix', () => {
    expect(discoveryName('studio-mac.local')).toBe('Countdown (studio-mac)')
  })
})

describe('AddDiscoverySettings', () => {
  it('adds discovery defaults and keeps existing remote keys', () => {
    const migrated = new AddDiscoverySettings().migrate({version: 7, settings: {remote: {oscPort: 1234}}})
    expect(migrated.version).toBe(8)
    expect((migrated.settings as {remote: unknown}).remote).toEqual({discoveryEnabled: true, oscPort: 1234})
  })

  it('leaves newer configs alone', () => {
    const config = {version: 8, settings: {remote: {discoveryEnabled: false}}}
    expect(new AddDiscoverySettings().migrate(config)).toBe(config)
  })
})
