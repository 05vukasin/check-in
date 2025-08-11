import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import WorkerStatusIndicator from "./components/WorkerStatusIndicator";
import LoginModal from "./components/LoginModal";
import QRCodeScanner from "./components/QRCodeScanner";
import Map from "./components/Map";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { LOCATION_TASK_NAME } from "./background/LocationTask";
import "./background/LocationTask"; 

interface Worker {
  name: string;
  lat: number;
  lon: number;
}

export default function App() {
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [organisation, setOrganisation] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [region, setRegion] = useState({
    latitude: 44.7866,
    longitude: 20.4489,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // ✅ Notifikacioni handler (lokalne notifikacije)
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  // ✅ Provera korisnika iz SecureStore
  useEffect(() => {
    const validateWorker = async () => {
      const storedId = await SecureStore.getItemAsync("workerId");
      const storedOrg = await SecureStore.getItemAsync("organisation");

      if (!storedId || !storedOrg) {
        setShowLogin(true);
        return;
      }

      try {
        const res = await fetch(
          `https://${storedOrg}.vercel.app/api/worker/validate?id=${storedId}`
        );
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

  // ✅ Fetch radnika iz API-ja
  useEffect(() => {
    const fetchAndCacheWorkers = async () => {
      try {
        if (!organisation) return;

        const url = `https://${organisation}.vercel.app/api/worker/online`;
        const res = await fetch(url);
        const json = await res.json();

        if (!Array.isArray(json)) return;

        const cached = await SecureStore.getItemAsync("lastWorkers");
        const oldData: Worker[] = cached ? JSON.parse(cached) : [];

        const arraysAreDifferent = (a: Worker[], b: Worker[]) =>
          a.length !== b.length ||
          a.some(
            (w, i) =>
              w.name !== b[i]?.name ||
              w.lat !== b[i]?.lat ||
              w.lon !== b[i]?.lon
          );

        if (arraysAreDifferent(json, oldData)) {
          await SecureStore.setItemAsync("lastWorkers", JSON.stringify(json));
          setWorkers(json);
        } else {
          setWorkers(oldData);
        }
      } catch (e) {
        console.warn("⚠️ Greška pri fetch-u radnika:", e);
      }
    };

    fetchAndCacheWorkers();
    const interval = setInterval(fetchAndCacheWorkers, 30000);
    return () => clearInterval(interval);
  }, [organisation]);

  // ✅ Setup lokacije i pozadinskog taska
  useEffect(() => {
    const setupLocation = async () => {
      try {
        const { status: fgStatus } =
          await Location.requestForegroundPermissionsAsync();
        const { status: bgStatus } =
          await Location.requestBackgroundPermissionsAsync();
        await Notifications.requestPermissionsAsync();

        if (fgStatus === "granted") {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }

        if (fgStatus === "granted" && bgStatus === "granted") {
          const started = await Location.hasStartedLocationUpdatesAsync(
            LOCATION_TASK_NAME
          );
          if (!started) {
            console.log("📍 Starting background location task...");
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
              accuracy: Location.Accuracy.High,
              timeInterval: 300000, // 5 minuta
              distanceInterval: 0,
              showsBackgroundLocationIndicator: true,
              pausesUpdatesAutomatically: false,
              foregroundService: {
                notificationTitle: "Praćenje lokacije",
                notificationBody: "Ažuriranje pozicije radnika u pozadini",
              },
            });
          } else {
            console.log("✅ Background location task već aktivan");
          }
        } else {
          console.warn("❗ Dozvole za lokaciju nisu date");
        }
      } catch (e) {
        console.error("❌ Greška u setupLocation:", e);
      }
    };

    setupLocation();
  }, []);

  // ✅ Log registracije taska (debug)
  useEffect(() => {
    TaskManager.getRegisteredTasksAsync().then((tasks) => {
      console.log("📋 Registered tasks:", tasks);
    });
  }, []);

  const openMapIfLocationAllowed = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      setMessage("Lokacija nije omogućena. Ne možete otvoriti mapu.");
      return;
    }
    setShowMap(true);
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      <Map
        onClose={() => setShowMap(false)}
        workers={workers}
        region={region}
        visible={showMap}
      />

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

          {!showMap && (
            <TouchableOpacity
              onPress={openMapIfLocationAllowed}
              style={styles.mapButton}
            >
              <Image
                source={require("./assets/map.jpg")}
                style={styles.mapIcon}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <Text>Molimo vas da se prijavite...</Text>
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
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: "red",
    textAlign: "center",
  },
  mapButton: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  mapIcon: {
    width: "100%",
    height: "100%",
  },
});
