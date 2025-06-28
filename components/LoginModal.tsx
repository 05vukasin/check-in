import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";

interface Props {
  visible: boolean;
  onSuccess: (workerId: number) => void;
}

export default function LoginModal({ visible, onSuccess }: Props) {
  const [organisation, setOrganisation] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const orgClean = organisation.trim();
    const nameClean = name.trim();

    if (!orgClean || !nameClean) {
      setError("Unesite organizaciju i ime.");
      return;
    }

    setLoading(true);
    setError("");

    const device =
      Device.deviceName || Device.modelName || `UnknownDevice`;

    try {
      const url = `https://${orgClean}.vercel.app/api/worker/by-name?name=${encodeURIComponent(
        nameClean
      )}&device=${encodeURIComponent(device)}`;

      console.log("📡 Slanje zahteva na:", url);

      const res = await fetch(url);
      const text = await res.text();

      console.log("📡 Status:", res.status);
      console.log("📡 Odgovor:", text);

      if (!res.ok) {
        try {
          const json = JSON.parse(text);
          setError(`❌ ${json.error || "Greška sa servera."}`);
        } catch {
          setError("❌ Nepoznata greška sa servera.");
        }
        return;
      }

      const data = JSON.parse(text);

      if (data?.id) {
        await SecureStore.setItemAsync("workerId", String(data.id));
        await SecureStore.setItemAsync("organisation", orgClean);
        onSuccess(data.id);
      } else {
        setError("❌ Ime nije pronađeno.");
      }
    } catch (e: any) {
      console.error("❌ Greška prilikom povezivanja:", e);
      setError("❌ Neuspelo povezivanje. Proveri internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrgChange = (text: string) => {
    setOrganisation(text);
    if (error) setError("");
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (error) setError("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Prijava</Text>

          <TextInput
            placeholder="Organizacija"
            value={organisation}
            onChangeText={handleOrgChange}
            style={[styles.input, error && styles.inputError]}
            editable={!loading}
          />
          <TextInput
            placeholder="Vaše ime"
            value={name}
            onChangeText={handleNameChange}
            style={[styles.input, error && styles.inputError]}
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Button
              title="Potvrdi"
              onPress={handleLogin}
              disabled={!organisation.trim() || !name.trim()}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "85%",
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  inputError: {
    borderColor: "red",
  },
  error: {
    color: "red",
    marginBottom: 12,
    textAlign: "center",
  },
});
