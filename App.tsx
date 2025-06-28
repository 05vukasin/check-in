import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import WorkerStatusIndicator from "./components/WorkerStatusIndicator";
import LoginModal from "./components/LoginModal";
import QRCodeScanner from "./components/QRCodeScanner";
import * as SecureStore from "expo-secure-store";
import { useLocationReporter } from './hooks/useLocationReporter';


export default function App() {
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [organisation, setOrganisation] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const load = async () => {
      const storedId = await SecureStore.getItemAsync("workerId");
      const storedOrg = await SecureStore.getItemAsync("organisation");

      if (storedId && storedOrg) {
        setWorkerId(parseInt(storedId));
        setOrganisation(storedOrg);
      } else {
        setShowLogin(true);
      }
    };

    load();
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useLocationReporter(); // ⏱️ Aktivira logovanje lokacije na svakih 10s


  return (
    <View style={styles.container}>
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
            onSuccess={handleRefresh} // 🔄 osvežava status indikator
          />

          {message !== "" && <Text style={styles.message}>{message}</Text>}
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
});
