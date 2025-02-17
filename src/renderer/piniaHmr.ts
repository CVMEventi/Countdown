import { getActivePinia } from 'pinia';

export function usePiniaWebpackHotHMR(hot, store)
{
  hot.accept();
  const stores = Array.isArray(store) ? store : [store];

  stores.forEach((storeInstance) =>
  {
    hot.dispose((data) =>
    {
      (data).initialUseStoreId = storeInstance.$id;
    });
    const piniaAccept = acceptWebpackHMRUpdate(storeInstance.$id, hot);
    piniaAccept(storeInstance);
  });
}

/**
 * Checks if a function is a `StoreDefinition`.
 *
 * @param fn - object to test
 * @returns true if `fn` is a StoreDefinition
 */
export const isUseStore = (fn) => typeof fn === 'function' && typeof fn.$id === 'string';

export function acceptWebpackHMRUpdate(initialUseStoreId, hot)
{
  // strip as much as possible from iife.prod
  if (process.env.NODE_ENV === 'production')
  {
    return () =>
    {};
  }
  return (newModule) =>
  {
    const pinia = hot.data?.pinia || getActivePinia();
    if (!pinia)
    {
      // this store is still not used
      return;
    }

    // preserve the pinia instance across loads
    // hot.data.pinia = pinia // FIXME: this doesn't work as data does not let us set functions.

    if (isUseStore(newModule) && pinia._s.has(newModule.$id))
    {
      console.log(`[HMR-Pinia] Accepting update for "${newModule.$id}"`);
      const id = newModule.$id;

      if (id !== initialUseStoreId)
      {
        console.warn(`The ID of the store changed from "${initialUseStoreId}" to "${id}". Reloading.`);
        // return import.meta.hot.invalidate()
        return hot.invalidate(); // eslint-disable-line consistent-return
      }

      const existingStore = pinia._s.get(id);
      if (!existingStore)
      {
        console.log(`[Pinia]: skipping HMR of "${id}" because store doesn't exist yet`);
        return;
      }
      newModule(pinia, existingStore);
    }
  };
}
