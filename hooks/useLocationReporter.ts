// hooks/useLocationReporter.ts
import { useEffect } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

export function useLocationReporter() {
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startReporting = async () => {
      const storedId = await SecureStore.getItemAsync('workerId');
      const storedOrg = await SecureStore.getItemAsync('organisation');

      if (!storedId || !storedOrg) {
        console.warn('❌ Nema podataka u SecureStore za workerId/organisation');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('❌ Dozvola za lokaciju nije odobrena');
        return;
      }

      interval = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const lat = location.coords.latitude;
          const lon = location.coords.longitude;

          console.log(`📍 Lokacija: ${lat}, ${lon}`);

          const res = await fetch(`https://${storedOrg}.vercel.app/api/location/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workerId: parseInt(storedId),
              lat,
              lon,
            }),
          });

          const text = await res.text();
          console.log(`✅ Odgovor servera: ${res.status} - ${text}`);
        } catch (e) {
          console.error('❌ Greška prilikom slanja lokacije:', e);
        }
      }, 300000); // ⏱️ svakih 10 sekundi
    };

    startReporting();

    return () => clearInterval(interval);
  }, []);
}
