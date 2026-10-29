import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';

interface CountdownProps {
  endTime: Date;
  onExpire?: () => void;
  format?: 'HH:MM:SS' | 'MM:SS';
}

const Countdown: React.FC<CountdownProps> = ({ endTime, onExpire, format = 'HH:MM:SS' }) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const difference = endTime.getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const formatTime = (time: number): string => {
    return time < 10 ? `0${time}` : `${time}`;
  };

  if (format === 'MM:SS') {
    const totalMinutes = timeLeft.hours * 60 + timeLeft.minutes;
    return (
      <Text style={styles.countdown}>
        {formatTime(totalMinutes)}:{formatTime(timeLeft.seconds)}
      </Text>
    );
  }

  return (
    <Text style={styles.countdown}>
      {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
    </Text>
  );
};

const styles = StyleSheet.create({
  countdown: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: 'monospace',
  },
});

export default Countdown;