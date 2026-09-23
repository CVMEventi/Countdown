import { describe, it, expect } from 'vitest';
import { parseVmixApi, selectPlaybackState } from '../../main/Playback/providers/vmix/vmixApi.ts';

function vmix(inputs: string, {active = '2', preview = '1'} = {}) {
  return `<vmix>
  <version>27.0.0.71</version>
  <edition>4K</edition>
  <preview>${preview}</preview>
  <active>${active}</active>
  <inputs>${inputs}</inputs>
</vmix>`;
}

const clip = '<input key="abc-123" number="2" type="Video" title="Package.mp4" state="Running" position="41230" duration="180000" loop="False" />';

describe('parseVmixApi', () => {
  it('reads active, preview and the input attributes', () => {
    const state = parseVmixApi(vmix(clip));

    expect(state.active).toBe(2);
    expect(state.preview).toBe(1);
    expect(state.inputs).toHaveLength(1);
    expect(state.inputs[0]).toEqual({
      key: 'abc-123',
      number: 2,
      type: 'Video',
      title: 'Package.mp4',
      state: 'Running',
      position: 41230,
      duration: 180000,
      loop: false,
    });
  });

  it('normalises several inputs', () => {
    const state = parseVmixApi(vmix(`<input key="a" number="1" type="Colour" title="BG" />${clip}`));
    expect(state.inputs.map(i => i.number)).toEqual([1, 2]);
  });

  it('decodes entities in a title', () => {
    const state = parseVmixApi(vmix('<input key="a" number="2" type="Video" title="Rock &amp; Roll.mp4" state="Running" position="0" duration="5000" />'));
    expect(state.inputs[0].title).toBe('Rock & Roll.mp4');
  });

  it('reads loop="True"', () => {
    const state = parseVmixApi(vmix('<input key="a" number="2" type="Video" title="Bed" state="Running" position="0" duration="5000" loop="True" />'));
    expect(state.inputs[0].loop).toBe(true);
  });

  it('reports a missing active as null rather than NaN', () => {
    const state = parseVmixApi('<vmix><inputs></inputs></vmix>');
    expect(state.active).toBeNull();
    expect(state.inputs).toEqual([]);
  });

  it('throws on a response that is not vMix', () => {
    expect(() => parseVmixApi('<html><body>nope</body></html>')).toThrow();
  });
});

describe('selectPlaybackState', () => {
  function select(xml: string, followLooping = false) {
    return selectPlaybackState(parseVmixApi(xml), {followLooping});
  }

  function selectInput(xml: string, input: string) {
    return selectPlaybackState(parseVmixApi(xml), {followLooping: false, input});
  }

  it('mirrors a running clip on Program', () => {
    expect(select(vmix(clip))).toEqual({
      clipId: 'abc-123',
      title: 'Package.mp4',
      // 138770ms left, rounded up so the clip reads the way the engine counts
      remainingSeconds: 139,
      totalSeconds: 180,
      isRunning: true,
      isLooping: false,
      media: {input_number: 2, input_type: 'Video', input_key: 'abc-123'},
    });
  });

  it('keeps the time but reports not running when paused', () => {
    const state = select(vmix(clip.replace('state="Running"', 'state="Paused"')));
    expect(state?.remainingSeconds).toBe(139);
    expect(state?.isRunning).toBe(false);
  });

  it('releases the timers when the clip is completed', () => {
    expect(select(vmix(clip.replace('state="Running"', 'state="Completed"')))).toBeNull();
  });

  it('releases the timers when Program is not a playable input', () => {
    expect(select(vmix('<input key="a" number="2" type="Colour" title="BG" state="Running" position="0" duration="0" />'))).toBeNull();
  });

  it('ignores an input with no usable duration', () => {
    expect(select(vmix(clip.replace('duration="180000"', 'duration="0"')))).toBeNull();
    expect(select(vmix('<input key="a" number="2" type="Video" title="X" state="Running" position="0" />'))).toBeNull();
  });

  it('ignores a looping clip unless asked to follow it', () => {
    const looping = vmix(clip.replace('loop="False"', 'loop="True"'));
    expect(select(looping)).toBeNull();
    expect(select(looping, true)?.isLooping).toBe(true);
  });

  it('returns null when active points at an input that is not listed', () => {
    expect(select(vmix(clip, {active: '7'}))).toBeNull();
  });

  it('returns null when there is no active input', () => {
    expect(selectPlaybackState({active: null, preview: 1, inputs: []}, {followLooping: false})).toBeNull();
  });

  it('returns null once the playhead has passed the duration', () => {
    expect(select(vmix(clip.replace('position="41230"', 'position="180000"')))).toBeNull();
  });

  it('pins to an input by number, even when it is not on Program', () => {
    const xml = vmix(`<input key="a" number="1" type="Video" title="Other.mp4" state="Running" position="0" duration="30000" />${clip}`, {active: '2'});

    expect(selectInput(xml, '1')).toMatchObject({title: 'Other.mp4', totalSeconds: 30});
  });

  it('pins to an input by title, ignoring case and padding', () => {
    expect(selectInput(vmix(clip), '  package.MP4 ')).toMatchObject({title: 'Package.mp4'});
  });

  it('returns null when the pinned input is not there', () => {
    expect(selectInput(vmix(clip), 'Missing.mp4')).toBeNull();
    expect(selectInput(vmix(clip), '99')).toBeNull();
  });

  it('still applies the playable rules to a pinned input', () => {
    const xml = vmix('<input key="a" number="1" type="Colour" title="BG" state="Running" position="0" duration="0" />');
    expect(selectInput(xml, '1')).toBeNull();
  });

  it('falls back to the input number when the key is empty', () => {
    const state = select(vmix('<input key="" number="2" type="Video" title="X" state="Running" position="0" duration="5000" />'));
    expect(state?.clipId).toBe('2');
  });
});
