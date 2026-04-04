import { useEffect, useState } from 'react';

export function useGeoJSON<T>(url: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    fetch(import.meta.env.BASE_URL + url).then(res => res.json()).then(setData).catch(console.error);
  }, [url]);
  return data;
}
