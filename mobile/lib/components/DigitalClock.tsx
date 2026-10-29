import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <React.Fragment>
      <Text style={styles.time}>{formatTime(time)}</Text>
      <Text style={styles.date}>{formatDate(time)}</Text>
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  time: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default DigitalClock;