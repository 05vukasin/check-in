import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
} from "react-native";
import WorkerStatusIndicator from "./components/WorkerStatusIndicator";
import LoginModal from "./components/LoginModal";
import QRCodeScanner from "./components/QRCodeScanner";
import Map from "./components/Map";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { LOCATION_TASK_NAME } from "./background/LocationTask";

export default function App() {
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [organisation, setOrganisation] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const validateWorker = async () => {
      const storedId = await SecureStore.getItemAsync("workerId");
      const storedOrg = await SecureStore.getItemAsync("organisation");

      if (!storedId || !storedOrg) {
        setShowLogin(true);
        return;
      }

      try {
        const res = await fetch(`https://${storedOrg}.vercel.app/api/worker/validate?id=${storedId}`);
        const json = await res.json();

        if (res.ok && json.ok) {
          setWorkerId(Number(storedId));
          setOrganisation(storedOrg);
          setShowLogin(false);
        } else {
          throw new Error("Nevalidan korisnik");
        }
      } catch (err) {
        console.warn("❌ Provera korisnika nije uspela:", err);
        await SecureStore.deleteItemAsync("workerId");
        await SecureStore.deleteItemAsync("organisation");
        setWorkerId(null);
        setOrganisation(null);
        setShowLogin(true);
      }
    };

    validateWorker();
  }, [refreshTrigger]);

  useEffect(() => {
    const startBackgroundLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

      if (status !== 'granted' || bgStatus !== 'granted') {
        console.warn('❌ Lokacione dozvole nisu dodeljene');
        return;
      }

      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!started) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 0,
          showsBackgroundLocationIndicator: true,
          pausesUpdatesAutomatically: false,
          foregroundService: {
            notificationTitle: 'Praćenje lokacije',
            notificationBody: 'Aplikacija prati vašu lokaciju u pozadini',
          },
        });
      }
    };

    startBackgroundLocation();
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      {showMap && <Map onClose={() => setShowMap(false)} />}

      {!showMap && (
        <>
          {workerId && organisation ? (
            <>
              <Text style={styles.header}>Skeniraj QR kod...</Text>

              <WorkerStatusIndicator
                workerId={workerId}
                baseUrl={`https://${organisation}.vercel.app`}
                refreshTrigger={refreshTrigger}
              />

              <QRCodeScanner
                workerId={workerId}
                organisation={organisation}
                setMessage={setMessage}
                onSuccess={handleRefresh}
              />

              {message !== "" && <Text style={styles.message}>{message}</Text>}
            </>
          ) : (
            <Text>Molimo vas da se prijavite...</Text>
          )}

          {/* Dugme za otvaranje mape */}
          <Pressable onPress={() => setShowMap(true)} style={styles.mapButton}>
            <Image
              source={require('./assets/map.jpg')}
              style={styles.mapImage}
              resizeMode="cover"
            />
          </Pressable>
        </>
      )}

      <LoginModal
        visible={showLogin}
        onSuccess={async (id) => {
          const org = await SecureStore.getItemAsync("organisation");
          if (org) setOrganisation(org);
          setWorkerId(id);
          setShowLogin(false);
        }}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: "red",
    textAlign: "center",
  },
  mapButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
});
