// Tracks which locos the app wants live info for ("watched") and which the
// central unit currently has subscribed for this client.
//
// The Z21 keeps at most 16 subscribed locos per client and drops the oldest
// when a 17th is requested (FIFO, §4). It does not tell us when it drops one,
// so we model the FIFO ourselves. Re-requesting an address that is already
// subscribed is assumed NOT to move it to the back of the queue: if that
// assumption is wrong we only re-request slightly too early, never too late.

export const MAX_SUBSCRIBED_LOCOS = 16;

export class LocoSubscriptions {
  private readonly watchCounts = new Map<number, number>();
  // Oldest first.
  private subscribed: number[] = [];

  // Returns true if the address was not watched before, i.e. its info should
  // be requested now.
  watch(address: number): boolean {
    const count = this.watchCounts.get(address) ?? 0;
    this.watchCounts.set(address, count + 1);
    return count === 0;
  }

  unwatch(address: number): void {
    const count = this.watchCounts.get(address) ?? 0;
    if (count <= 1) {
      this.watchCounts.delete(address);
    } else {
      this.watchCounts.set(address, count - 1);
    }
  }

  isWatched(address: number): boolean {
    return this.watchCounts.has(address);
  }

  watchedAddresses(): number[] {
    return [...this.watchCounts.keys()];
  }

  // Records that LAN_X_GET_LOCO_INFO was sent for the address. Returns the
  // addresses the central unit has now dropped.
  recordRequest(address: number): number[] {
    if (!this.subscribed.includes(address)) {
      this.subscribed.push(address);
    }
    const evicted: number[] = [];
    while (this.subscribed.length > MAX_SUBSCRIBED_LOCOS) {
      evicted.push(this.subscribed.shift()!);
    }
    return evicted;
  }

  isSubscribed(address: number): boolean {
    return this.subscribed.includes(address);
  }

  // After a reconnect the central unit has no subscriptions for us. Watched
  // locos are kept so they can be re-requested.
  resetSubscribed(): void {
    this.subscribed = [];
  }
}
