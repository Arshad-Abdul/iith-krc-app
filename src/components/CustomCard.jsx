import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '../constants/theme';

export function CustomCard({
  title,
  subtitle,
  icon,
  iconColor,
  onTap,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onTap}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name={icon} size={36} color={iconColor || Colors.light.accent} />
          </View>
          <View style={{ height: 16 }} />
          <Text style={styles.title}>{title}</Text>
          <View style={{ height: 8 }} />
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)', // Glassmorphism semi-transparent
    borderRadius: 24,
    padding: 20,
    margin: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.1)', // Subtle white border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    padding: 12,
    backgroundColor: 'rgba(212, 160, 23, 0.1)',
    borderRadius: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
