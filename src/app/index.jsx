import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/theme';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Image
          source={require('../../assets/images/download.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ height: 24 }} />
        <Text style={styles.title}>Transforming Information into Knowledge</Text>
        <View style={{ height: 48 }} />
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logo: { width: 250, height: 250 },
  title: { fontSize: 24, fontWeight: '300', color: Colors.light.text, textAlign: 'center', letterSpacing: 1 },
});
