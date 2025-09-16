import { createTypedHooks } from 'easy-peasy';
import { StoreModel } from './types';

// Typed hooks for easy-peasy
const typedHooks = createTypedHooks<StoreModel>();

export const useStoreActions = typedHooks.useStoreActions;
export const useStoreDispatch = typedHooks.useStoreDispatch;
export const useStoreState = typedHooks.useStoreState;