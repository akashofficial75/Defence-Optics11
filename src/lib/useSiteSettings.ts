import { useState, useEffect } from 'react';
import { SiteSettings } from '../types';
import { INITIAL_SITE_SETTINGS } from '../data/initialData';
import { getSiteSettings } from './dataStore';

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSiteSettings().then((s) => {
      if (mounted) {
        setSettings(s);
        setLoaded(true);
      }
    });

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SiteSettings>;
      if (customEvent.detail && mounted) {
        setSettings(customEvent.detail);
      }
    };

    window.addEventListener('defence_optics_settings_updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('defence_optics_settings_updated', handleUpdate);
    };
  }, []);

  return { settings, loaded };
}
