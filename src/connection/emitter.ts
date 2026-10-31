export type Listener<T> = (payload: T) => void;

// Minimal typed event emitter. A listener that throws does not stop other
// listeners or the caller.
export class TypedEmitter<Events extends Record<string, unknown>> {
  private listeners: {[K in keyof Events]?: Set<Listener<Events[K]>>} = {};

  on<K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>,
  ): () => void {
    const set = this.listeners[event] ?? new Set<Listener<Events[K]>>();
    this.listeners[event] = set;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners[event];
    if (!set) {
      return;
    }
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`Listener for "${String(event)}" failed`, error);
      }
    }
  }

  removeAll(): void {
    this.listeners = {};
  }
}
