import {create} from 'zustand';
import {Consist, Loco, VehicleRef} from '../library/types';

type LibraryState = {
  // False until the database has been read once.
  loaded: boolean;
  // Set if the database could not be opened or read.
  error: string | null;
  // Written only by LibraryService.
  locos: Loco[];
  consists: Consist[];
  // The vehicle list order, locos and consists together.
  order: VehicleRef[];
};

export const useLibraryStore = create<LibraryState>(() => ({
  loaded: false,
  error: null,
  locos: [],
  consists: [],
  order: [],
}));

export const useLoco = (id: number | null): Loco | undefined =>
  useLibraryStore((state) =>
    id === null ? undefined : state.locos.find((loco) => loco.id === id),
  );

export const useConsist = (id: number | null): Consist | undefined =>
  useLibraryStore((state) =>
    id === null
      ? undefined
      : state.consists.find((consist) => consist.id === id),
  );
