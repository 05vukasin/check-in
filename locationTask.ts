import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store'; // ✅ DODATO

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];

    if (!location) return;

    try {
      const storedId = await SecureStore.getItemAsync('workerId');
      const storedOrg = await SecureStore.getItemAsync('organisation');

      if (storedId && storedOrg) {
        await fetch(`https://${storedOrg}.vercel.app/api/location/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId: parseInt(storedId),
            lat: location.coords.latitude,
            lon: location.coords.longitude,
          }),
        });
      }
    } catch (e) {
      console.error('❌ Greska pri slanju lokacije:', e);
    }
  }
});

export { LOCATION_TASK_NAME };
