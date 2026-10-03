/**
 * Stand-in for HTMLAudioElement in tests (jsdom can't play media). Tests drive it like a browser
 * would: `play()` resolves and fires "playing", and helpers fire "ended", "error" and so on.
 * Install with `vi.stubGlobal('Audio', FakeAudio)`.
 */
export class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  /** Make the next play() reject like a browser blocking autoplay. */
  static rejectNextPlay: string | undefined;

  preload = '';
  volume = 1;
  muted = false;
  currentTime = 0;
  duration = Number.NaN;
  playbackRate = 1;
  paused = true;
  ended = false;
  buffered = { length: 0, start: () => 0, end: () => 0 };
  private source: string | null = null;

  constructor() {
    super();
    FakeAudio.instances.push(this);
  }

  static reset(): void {
    FakeAudio.instances = [];
    FakeAudio.rejectNextPlay = undefined;
  }

  static last(): FakeAudio {
    const audio = FakeAudio.instances.at(-1);
    if (!audio) throw new Error('No audio element was created');
    return audio;
  }

  get src(): string {
    return this.source ?? '';
  }
  set src(value: string) {
    this.source = value;
    this.currentTime = 0;
    this.ended = false;
  }
  getAttribute(name: string): string | null {
    return name === 'src' ? this.source : null;
  }
  removeAttribute(name: string): void {
    if (name === 'src') this.source = null;
  }
  load(): void {
    // Nothing to load in tests.
  }

  play(): Promise<void> {
    const rejection = FakeAudio.rejectNextPlay;
    if (rejection) {
      FakeAudio.rejectNextPlay = undefined;
      return Promise.reject(new DOMException('Blocked', rejection));
    }
    this.paused = false;
    this.fire('playing');
    return Promise.resolve();
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.fire('pause');
  }

  /** Simulates reaching the end of the file. */
  finish(): void {
    this.paused = true;
    this.ended = true;
    this.fire('ended');
  }

  fire(type: string): void {
    this.dispatchEvent(new Event(type));
  }
}
