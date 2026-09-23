import { describe, it, expect } from 'vitest';
import {
  buildPlaybackState,
  candidateNodes,
  GrandShowNode,
  parseGrandShowReply,
  parsePin,
  timeToMs,
} from '../../main/Playback/providers/grandshow/grandshowApi.ts';

// Captured from GrandShow EE v1.19
const PLAYING = '{"nodes":[{"nodeCurTime":{"H":0,"M":0,"Mi":142,"S":32},"nodeDurTime":{"H":0,"M":1,"Mi":846,"S":27},"nodeEndTime":{"H":0,"M":1,"Mi":846,"S":27},"nodeId":1,"nodePosition":{"col":1,"row":1},"nodeStartTime":{"H":0,"M":0,"Mi":0,"S":0},"nodeTotalTime":{"H":0,"M":1,"Mi":846,"S":27}}],"playingNodeNumber":"1"}';
const NONE_PAUSED = '{"nodes":null,"pausingNodeNumber":"0"}';

function node(overrides: Partial<GrandShowNode> = {}): GrandShowNode {
  return {id: 1, row: 1, col: 1, startMs: 0, endMs: 60_000, curMs: 12_000, durMs: 60_000, ...overrides};
}

describe('timeToMs', () => {
  it('adds up the H/M/S/Mi parts', () => {
    expect(timeToMs({H: 1, M: 1, S: 27, Mi: 846})).toBe(3_687_846);
  });

  it('rejects what is not a time', () => {
    expect(timeToMs(null)).toBeNull();
    expect(timeToMs({H: 'x'})).toBeNull();
  });
});

describe('parseGrandShowReply', () => {
  it('reads the playing nodes with their times', () => {
    expect(parseGrandShowReply(Buffer.from(PLAYING))).toEqual({
      kind: 'playing',
      nodes: [{id: 1, row: 1, col: 1, startMs: 0, endMs: 87_846, curMs: 32_142, durMs: 87_846}],
    });
  });

  it('treats a null node list as empty', () => {
    expect(parseGrandShowReply(NONE_PAUSED)).toEqual({kind: 'paused', nodes: []});
  });

  it('reads the service status, misspelt as GrandShow sends it', () => {
    expect(parseGrandShowReply('{"sevice": "running"}')).toEqual({kind: 'service', running: true});
    expect(parseGrandShowReply('{"service": "stop"}')).toEqual({kind: 'service', running: false});
  });

  it('recognises bare string errors', () => {
    expect(parseGrandShowReply('COMMAND ERROR')).toEqual({kind: 'error', message: 'COMMAND ERROR'});
    expect(parseGrandShowReply('no clip on this position')).toEqual({kind: 'error', message: 'no clip on this position'});
  });

  it('ignores replies that are not its own', () => {
    expect(parseGrandShowReply('row: 2 , col: -1')).toBeNull();
    expect(parseGrandShowReply('{"t": 00:00:56:759}')).toBeNull();
    expect(parseGrandShowReply('{"playingChapter": [1] }')).toBeNull();
  });
});

describe('parsePin', () => {
  it('reads a row, or a row and column', () => {
    expect(parsePin('')).toBeNull();
    expect(parsePin('2')).toEqual({row: 2, col: null});
    expect(parsePin('1,3')).toEqual({row: 1, col: 3});
    expect(parsePin('1 3')).toEqual({row: 1, col: 3});
    expect(parsePin('r1c3')).toEqual({row: 1, col: 3});
  });

  it('rejects anything else', () => {
    expect(parsePin('intro')).toBeNull();
  });
});

describe('candidateNodes', () => {
  it('ranks playing before paused, top row first', () => {
    const playing = [node({row: 2}), node({row: 1, col: 2})];
    const paused = [node({row: 1, col: 1})];

    expect(candidateNodes(playing, paused, null).map(({node, isRunning}) => [node.row, node.col, isRunning])).toEqual([
      [1, 2, true],
      [2, 1, true],
      [1, 1, false],
    ]);
  });

  it('keeps to the pinned row or node', () => {
    const playing = [node({row: 1, col: 1}), node({row: 2, col: 1}), node({row: 2, col: 3})];

    expect(candidateNodes(playing, [], {row: 2, col: null})).toHaveLength(2);
    expect(candidateNodes(playing, [], {row: 2, col: 3}).map(({node}) => node.col)).toEqual([3]);
  });
});

describe('buildPlaybackState', () => {
  it('counts down to the trim end', () => {
    expect(buildPlaybackState(node({startMs: 5_000, endMs: 65_000, curMs: 20_500, durMs: 60_000}), true)).toEqual({
      clipId: '1@1,1',
      title: 'R1C1',
      remainingSeconds: 45,
      totalSeconds: 60,
      isRunning: true,
      isLooping: false,
      media: {row: 1, col: 1, node_id: 1},
    });
  });

  it('lets go of a clip holding its last frame', () => {
    expect(buildPlaybackState(node({curMs: 60_000}), true)).toBeNull();
  });
});
