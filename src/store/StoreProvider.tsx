'use client';

import { StoreProvider as EasyPeasyStoreProvider } from 'easy-peasy';
import { store } from './index';

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  return (
    <EasyPeasyStoreProvider store={store}>
      {children}
    </EasyPeasyStoreProvider>
  );
}