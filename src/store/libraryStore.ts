import {create} from 'zustand';
import {Loco} from '../library/types';

type LibraryState = {
  // False until the database has been read once.
  loaded: boolean;
  // Set if the database could not be opened or read.
  error: string | null;
  // In library order. Written only by LibraryService.
  locos: Loco[];
};

export const useLibraryStore = create<LibraryState>(() => ({
  loaded: false,
  error: null,
  locos: [],
}));

export const useLoco = (id: number | null): Loco | undefined =>
  useLibraryStore((state) =>
    id === null ? undefined : state.locos.find((loco) => loco.id === id),
  );
