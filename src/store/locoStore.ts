import {create} from 'zustand';
import {DisplayedLoco} from '../driving/locoIntent';

export type LiveLoco = DisplayedLoco & {
  // Another controller is also driving this loco (brief §6.3).
  shared: boolean;
};

type LocoStoreState = {
  // Locos currently shown on screen, by address. Written only by
  // DriveController.
  locos: Partial<Record<number, LiveLoco>>;
};

export const useLocoStore = create<LocoStoreState>(() => ({locos: {}}));

export const useLiveLoco = (address: number | null): LiveLoco | undefined =>
  useLocoStore((state) =>
    address === null ? undefined : state.locos[address],
  );
