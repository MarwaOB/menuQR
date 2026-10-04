import { useCallback, useEffect, useState } from 'react';
import { menuAPI } from '../utils/api';
import { flattenDishes } from '../lib/menu';

/**
 * Read-only access to today's menu for the marketing pages.
 * status: 'loading' | 'ready' | 'empty' | 'error'
 */
export default function useCurrentMenu() {
  const [state, setState] = useState({ status: 'loading', menu: null, dishes: [] });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const data = await menuAPI.getCurrent();
      const dishes = flattenDishes(data?.sections);
      setState({ status: dishes.length ? 'ready' : 'empty', menu: data || null, dishes });
    } catch (err) {
      const status = err?.response?.status;
      const message = (err?.message || '').toLowerCase();
      const isEmpty = status === 404 || message.includes('no menu') || message.includes('not found');
      setState({ status: isEmpty ? 'empty' : 'error', menu: null, dishes: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
