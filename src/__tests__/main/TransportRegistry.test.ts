import {describe, expect, it, vi} from 'vitest';
import {TransportRegistry} from '../../main/Remotes/TransportRegistry.ts';
import type {AnyWebSocketUpdate} from '../../common/TimerInterfaces.ts';

const update: AnyWebSocketUpdate = {
  type: 'audio',
  update: {timerId: 'timer1'},
};

function makeTransport() {
  return {sendToClients: vi.fn()};
}

describe('TransportRegistry', () => {
  it('broadcasts to every registered transport', () => {
    const registry = new TransportRegistry();
    const a = makeTransport();
    const b = makeTransport();
    registry.add(a);
    registry.add(b);

    registry.broadcast(update);

    expect(a.sendToClients).toHaveBeenCalledWith(update);
    expect(b.sendToClients).toHaveBeenCalledWith(update);
  });

  it('is a no-op with nothing registered', () => {
    const registry = new TransportRegistry();
    expect(() => registry.broadcast(update)).not.toThrow();
    expect(registry.size).toBe(0);
  });

  it('stops sending to a removed transport', () => {
    const registry = new TransportRegistry();
    const transport = makeTransport();
    registry.add(transport);
    registry.remove(transport);

    registry.broadcast(update);

    expect(transport.sendToClients).not.toHaveBeenCalled();
  });

  it('registers a transport only once', () => {
    const registry = new TransportRegistry();
    const transport = makeTransport();
    registry.add(transport);
    registry.add(transport);

    registry.broadcast(update);

    expect(transport.sendToClients).toHaveBeenCalledTimes(1);
  });

  // One remote throwing must not cost the others their update
  it('delivers to the remaining transports when one throws', () => {
    const registry = new TransportRegistry();
    const broken = {
      sendToClients: vi.fn(() => {
        throw new Error('socket gone');
      }),
    };
    const healthy = makeTransport();
    registry.add(broken);
    registry.add(healthy);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => registry.broadcast(update)).not.toThrow();
    expect(healthy.sendToClients).toHaveBeenCalledWith(update);

    consoleError.mockRestore();
  });
});
