import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  workerId: number;
  baseUrl: string;         // npr. https://organizacija.vercel.app
  refreshTrigger: number;  // svaki put kad se promeni, fetchuje se status iznova
};

export default function WorkerStatusIndicator({ workerId, baseUrl, refreshTrigger }: Props) {
  const [isCheckedIn, setIsCheckedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!workerId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/worker/status?id=${workerId}`);
        const data = await res.json();
        setIsCheckedIn(data?.in_out ?? null);
      } catch (err) {
        console.warn('Greška pri proveri statusa radnika:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [workerId, baseUrl, refreshTrigger]); // Dodato: baseUrl i refreshTrigger

  if (isCheckedIn === null) return null;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          { backgroundColor: isCheckedIn ? 'lightgreen' : 'gray' },
        ]}
      />
      <Text style={{ color: isCheckedIn ? 'green' : 'gray', fontWeight: '600' }}>
        {isCheckedIn ? 'Prijavljen' : 'Odjavljen'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  circle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
