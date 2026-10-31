import {LocoSubscriptions, MAX_SUBSCRIBED_LOCOS} from '../subscriptions';

describe('LocoSubscriptions', () => {
  it('counts watchers per address', () => {
    const subs = new LocoSubscriptions();
    expect(subs.watch(3)).toBe(true);
    expect(subs.watch(3)).toBe(false);
    subs.unwatch(3);
    expect(subs.isWatched(3)).toBe(true);
    subs.unwatch(3);
    expect(subs.isWatched(3)).toBe(false);
    expect(subs.watch(3)).toBe(true);
  });

  it('evicts the oldest subscription after 16 (FIFO)', () => {
    const subs = new LocoSubscriptions();
    for (let address = 1; address <= MAX_SUBSCRIBED_LOCOS; address++) {
      expect(subs.recordRequest(address)).toEqual([]);
    }
    expect(subs.recordRequest(17)).toEqual([1]);
    expect(subs.isSubscribed(1)).toBe(false);
    expect(subs.isSubscribed(17)).toBe(true);
  });

  it('does not duplicate or reorder an address requested again', () => {
    const subs = new LocoSubscriptions();
    for (let address = 1; address <= MAX_SUBSCRIBED_LOCOS; address++) {
      subs.recordRequest(address);
    }
    subs.recordRequest(1);
    // 1 is still the oldest, so it goes first.
    expect(subs.recordRequest(17)).toEqual([1]);
  });

  it('keeps watched addresses after a reset of the subscribed list', () => {
    const subs = new LocoSubscriptions();
    subs.watch(3);
    subs.recordRequest(3);
    subs.resetSubscribed();
    expect(subs.isSubscribed(3)).toBe(false);
    expect(subs.watchedAddresses()).toEqual([3]);
  });
});
