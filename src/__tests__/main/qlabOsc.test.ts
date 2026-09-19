import { describe, it, expect } from 'vitest';
import {
  buildPlaybackState,
  candidateCues,
  cueIdFromAddress,
  flattenCues,
  parseCueValues,
  parseQLabReply,
  QLabCue,
  workspaceAddress,
} from '../../main/Playback/providers/qlab/qlabOsc.ts';

function reply(address: string, data: unknown, status = 'ok') {
  return ['/reply' + address, JSON.stringify({workspace_id: 'ws1', address, status, data})] as [string, string];
}

function cue(overrides: Partial<QLabCue> = {}): QLabCue {
  return {uniqueID: 'id-1', number: '1', name: 'Package', listName: 'Package.mov', type: 'Video', ...overrides};
}

describe('parseQLabReply', () => {
  it('reads the echoed address, status and data', () => {
    const parsed = parseQLabReply(reply('/runningOrPausedCues', [{uniqueID: 'a'}]));

    expect(parsed).toMatchObject({address: '/runningOrPausedCues', status: 'ok', workspaceId: 'ws1'});
    expect(parsed?.data).toEqual([{uniqueID: 'a'}]);
  });

  it('ignores anything that is not a reply', () => {
    expect(parseQLabReply(['/update/workspace/ws1', 'x'])).toBeNull();
  });

  it('ignores a reply whose payload is not JSON', () => {
    expect(parseQLabReply(['/reply/runningOrPausedCues', 'not json'])).toBeNull();
    expect(parseQLabReply(['/reply/runningOrPausedCues', 42])).toBeNull();
  });

  it('surfaces a denied status', () => {
    expect(parseQLabReply(reply('/runningOrPausedCues', null, 'denied'))?.status).toBe('denied');
  });

  it('falls back to the reply address when the payload omits one', () => {
    const message = ['/reply/runningOrPausedCues', JSON.stringify({status: 'ok', data: []})] as [string, string];
    expect(parseQLabReply(message)?.address).toBe('/runningOrPausedCues');
  });
});

describe('cueIdFromAddress', () => {
  it('pulls the id out of a cue address', () => {
    expect(cueIdFromAddress('/cue_id/ABC-123/valuesForKeys')).toBe('ABC-123');
    expect(cueIdFromAddress('/workspace/ws1/cue_id/ABC-123/valuesForKeys')).toBe('ABC-123');
  });

  it('returns null for an address with no cue id', () => {
    expect(cueIdFromAddress('/runningOrPausedCues')).toBeNull();
  });
});

describe('flattenCues', () => {
  it('walks the children of a group cue', () => {
    const data = [
      {uniqueID: 'g1', type: 'Group', name: 'Act 1', cues: [
        {uniqueID: 'c1', type: 'Video', name: 'Package'},
        {uniqueID: 'g2', type: 'Group', name: 'Nested', cues: [{uniqueID: 'c2', type: 'Audio', name: 'Bed'}]},
      ]},
    ];

    expect(flattenCues(data).map(c => c.uniqueID)).toEqual(['g1', 'c1', 'g2', 'c2']);
  });

  it('drops entries with no unique id', () => {
    expect(flattenCues([{name: 'nameless'}, {uniqueID: 'a'}])).toHaveLength(1);
  });

  it('copes with data that is not a list', () => {
    expect(flattenCues(null)).toEqual([]);
    expect(flattenCues({})).toEqual([]);
  });
});

describe('candidateCues', () => {
  const cues = [
    cue({uniqueID: 'g1', number: '1', name: 'Act 1', type: 'Group'}),
    cue({uniqueID: 'c1', number: '2', name: 'Package', type: 'Video'}),
  ];

  it('puts real cues ahead of the group wrapped around them', () => {
    expect(candidateCues(cues, '').map(c => c.uniqueID)).toEqual(['c1', 'g1']);
  });

  it('pins to a cue by number', () => {
    expect(candidateCues(cues, '1').map(c => c.uniqueID)).toEqual(['g1']);
  });

  it('pins to a cue by name, ignoring case and padding', () => {
    expect(candidateCues(cues, '  package ').map(c => c.uniqueID)).toEqual(['c1']);
  });

  it('pins to a cue by unique id', () => {
    expect(candidateCues(cues, 'c1').map(c => c.uniqueID)).toEqual(['c1']);
  });

  it('returns nothing when the pinned cue is not running', () => {
    expect(candidateCues(cues, 'Missing')).toEqual([]);
  });
});

describe('parseCueValues', () => {
  it('reads the times and flags', () => {
    expect(parseCueValues({actionElapsed: 12.5, currentDuration: 60, isPaused: false, isRunning: true, listName: 'A.mov'}))
      .toEqual({actionElapsed: 12.5, currentDuration: 60, isPaused: false, isRunning: true, listName: 'A.mov'});
  });

  it('treats a cue with no isRunning key as running', () => {
    expect(parseCueValues({actionElapsed: 0, currentDuration: 10})?.isRunning).toBe(true);
  });

  it('rejects values with no usable times', () => {
    expect(parseCueValues({actionElapsed: 'x', currentDuration: 60})).toBeNull();
    expect(parseCueValues(null)).toBeNull();
    expect(parseCueValues([1, 2])).toBeNull();
  });
});

describe('buildPlaybackState', () => {
  const values = {actionElapsed: 12.5, currentDuration: 60, isPaused: false, isRunning: true, listName: 'Package.mov'};

  it('counts the cue down, rounding up to whole seconds', () => {
    expect(buildPlaybackState(cue(), values)).toEqual({
      clipId: 'id-1',
      title: 'Package.mov',
      remainingSeconds: 48,
      totalSeconds: 60,
      isRunning: true,
      isLooping: false,
    });
  });

  it('reports a paused cue as not running, holding its time', () => {
    const state = buildPlaybackState(cue(), {...values, isPaused: true});
    expect(state).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('ignores a cue with no duration, as a fade or a start cue has', () => {
    expect(buildPlaybackState(cue(), {...values, currentDuration: 0})).toBeNull();
  });

  it('releases the timers once the cue has played out', () => {
    expect(buildPlaybackState(cue(), {...values, actionElapsed: 60})).toBeNull();
  });

  it('falls back through listName, name and number for a title', () => {
    expect(buildPlaybackState(cue({listName: ''}), values)?.title).toBe('Package');
    expect(buildPlaybackState(cue({listName: '', name: ''}), values)?.title).toBe('1');
  });
});

describe('workspaceAddress', () => {
  it('prefixes only when a workspace is configured', () => {
    expect(workspaceAddress('/runningOrPausedCues', '')).toBe('/runningOrPausedCues');
    expect(workspaceAddress('/runningOrPausedCues', '  ')).toBe('/runningOrPausedCues');
    expect(workspaceAddress('/runningOrPausedCues', 'ws1')).toBe('/workspace/ws1/runningOrPausedCues');
  });
});
