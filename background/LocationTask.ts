import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

export const LOCATION_TASK_NAME = 'background-location-task';
const LAST_NOTIFICATION_KEY = 'last_notification_time';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Error in background location task:', error);
    return;
  }

  const location = (data as any).locations?.[0];
  if (!location) {
    console.warn('⚠️ Nema lokacije u task eventu.');
    return;
  }

  try {
    const workerId = await SecureStore.getItemAsync('workerId');
    const organisation = await SecureStore.getItemAsync('organisation');

    if (!workerId || !organisation) {
      console.warn('⚠️ Nema workerId ili organisation u SecureStore.');
      return;
    }

    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    console.log(`📍 Trenutna lokacija: lat=${lat}, lon=${lon}`);

    // Slanje lokacije serveru
    await fetch(`https://${organisation}.vercel.app/api/location/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId, lat, lon }),
    });

    const res = await fetch(`https://${organisation}.vercel.app/api/location/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
    });

    const json = await res.json();
    console.log('✅ Rezultat check lokacije:', json);

    if (!json.allowed) {
      console.log('ℹ️ Radnik nije u krugu – notifikacija nije poslata.');
      return;
    }

    // Proveri kada je poslednja notifikacija poslata
    const lastSent = await SecureStore.getItemAsync(LAST_NOTIFICATION_KEY);
    const now = Date.now();

    if (lastSent) {
      const lastTime = parseInt(lastSent, 10);
      const hoursPassed = (now - lastTime) / (1000 * 60 * 60);
      if (hoursPassed < 12) {
        console.log(`⏳ Prošlo je samo ${hoursPassed.toFixed(2)}h – notifikacija neće biti poslata.`);
        return;
      }
    }

    // Zakazivanje notifikacije
    console.log('📢 Radnik je u krugu – zakazujemo notifikaciju...');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📍 Blizu ste posla',
        body: 'Prijavite se na posao jednim klikom.',
        data: { screen: 'QR' },
      },
      trigger: null,
    });

    // Zabeleži vreme slanja
    await SecureStore.setItemAsync(LAST_NOTIFICATION_KEY, now.toString());
    console.log('✅ Notifikacija uspešno zakazana i vreme sačuvano.');

  } catch (err) {
    console.error('📡 Background location error:', err);
  }
});
