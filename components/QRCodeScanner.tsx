import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';

interface Props {
  workerId: number;
  organisation: string;
  setMessage: (msg: string) => void;
  onSuccess?: () => void; // 🔄 dodat callback za osvežavanje
}

export default function QRCodeScanner({ workerId, organisation, setMessage, onSuccess }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      const url = new URL(result.data);
      const token = url.searchParams.get('token');
      const type = url.searchParams.get('type');

      if (!token || !type) {
        setMessage('❌ QR kod nije validan.');
        return;
      }

      let lat: number | null = null;
      let lon: number | null = null;

      if (type === 'entry') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setMessage('❌ Lokacija nije dozvoljena.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lon = location.coords.longitude;

        await fetch(`https://${organisation}.vercel.app/api/location/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerId, lat, lon }),
        });

        const checkRes = await fetch(`https://${organisation}.vercel.app/api/location/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lon }),
        });

        const checkData = await checkRes.json();
        if (!checkData.allowed) {
          setMessage('❌ Niste u krugu od 300m.');
          return;
        }
      }

      const endpoint = type === 'entry' ? '/api/worker/check-in' : '/api/worker/check-out';
      const finalRes = await fetch(`https://${organisation}.vercel.app${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type, workerId }),
      });

      if (finalRes.ok) {
        setPopupMessage(`✅ ${type === 'entry' ? 'Check-in' : 'Check-out'} uspešan!`);
        onSuccess?.(); // 🔄 poziva refresh
      } else {
        setMessage('❌ Greška pri slanju zahteva.');
      }

    } catch (err) {
      setMessage('❌ Greška u obradi.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setScanned(false);
        setPopupMessage(null);
        setMessage('');
      }, 7000);
    }
  };

  if (!permission) return <ActivityIndicator />;
  if (!permission.granted) {
    return (
      <View>
        <Text>Potrebna je dozvola za kameru</Text>
        <Text onPress={requestPermission}>Dodaj dozvolu</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.scannerWrapper}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <Text style={styles.overlayText}>Skenirajte QR kod</Text>
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      <Modal visible={!!popupMessage} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setPopupMessage(null)}>
          <View style={styles.popupContainer}>
            <View style={styles.popup}>
              <Text style={styles.popupText}>{popupMessage}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scannerWrapper: {
    width: '90%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 20,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlayText: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    color: 'white',
    fontWeight: 'bold',
    backgroundColor: '#0008',
    padding: 6,
    borderRadius: 6,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0008',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    flex: 1,
    backgroundColor: '#0006',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    elevation: 5,
  },
  popupText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
    textAlign: 'center',
  },
});
