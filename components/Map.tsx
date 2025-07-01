import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";

interface Props {
  onClose: () => void;
}

interface Worker {
  name: string;
  lat: number;
  lon: number;
}

export default function Map({ onClose }: Props) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchWorkers = async (org: string) => {
    try {
      const url = `https://${org}.vercel.app/api/worker/online`;
      console.log("📡 Pozivam endpoint:", url);
      const res = await fetch(url);
      const contentType = res.headers.get("content-type");
      const text = await res.text();

      if (!res.ok || !contentType?.includes("application/json")) {
        console.warn("❌ Nije validan JSON:", text.slice(0, 100));
        return;
      }

      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        setWorkers(data);
        await SecureStore.setItemAsync("lastWorkers", JSON.stringify(data));
      }
    } catch (e) {
      console.warn("❌ Greska prilikom fetch-a:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadFromCache = async () => {
    try {
      const cached = await SecureStore.getItemAsync("lastWorkers");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setWorkers(parsed);
      }
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      await loadFromCache();

      const org = await SecureStore.getItemAsync("organisation");
      if (!org) {
        console.warn("❌ Organizacija nije definisana");
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("❌ Lokacija nije dozvoljena");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const reg: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(reg);
      mapRef.current?.animateToRegion(reg, 1000);

      await fetchWorkers(org);
      const interval = setInterval(() => fetchWorkers(org), 15000);
      return () => clearInterval(interval);
    };

    load();
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const getColorForName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 55%)`;
  };

  return (
    <View style={styles.container}>
      {region ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          customMapStyle={customMapStyle}
          paddingAdjustmentBehavior="always"
          mapPadding={{ top: 60, bottom: 60, left: 20, right: 20 }}
        >
          {workers.map((worker, index) => (
            <Marker
              key={index}
              coordinate={{ latitude: worker.lat, longitude: worker.lon }}
              anchor={{ x: 0.5, y: 1 }}
              calloutAnchor={{ x: 0.5, y: 0 }}
            >
              <View
                style={[
                  styles.circleWrapper,
                  { backgroundColor: getColorForName(worker.name) },
                ]}
              >
                <Text style={styles.initials}>
                  {getInitials(worker.name || "??")}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="black" />
      )}

      <Feather
        name="arrow-left"
        size={28}
        color="white"
        style={styles.backButton}
        onPress={onClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(50, 50, 50, 0.7)",
    padding: 10,
    borderRadius: 30,
  },
  circleWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#aaa",
    zIndex: Platform.OS === "android" ? 999 : undefined,
  },
  initials: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});

const customMapStyle = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", stylers: [{ color: "#dddddd" }] },
  { featureType: "road.highway", stylers: [{ color: "#dadada" }] },
  { featureType: "water", stylers: [{ color: "#c9c9c9" }] },
];
