import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Feather } from "@expo/vector-icons";

interface Worker {
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  onClose: () => void;
  workers: Worker[];
  region: Region;
  visible: boolean;
}

export default function Map({ onClose, workers, region, visible }: Props) {
  if (!visible) return null;

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
      <MapView
        style={styles.map}
        region={region}
        customMapStyle={customMapStyle}
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
