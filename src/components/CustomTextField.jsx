import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '../constants/theme';

export function CustomTextField({
  labelText,
  hintText,
  prefixIcon,
  secureTextEntry = false,
  ...rest
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{labelText}</Text>
      <View style={styles.inputContainer}>
        <MaterialIcons name={prefixIcon} size={24} color={Colors.light.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={hintText}
          placeholderTextColor={Colors.light.textSecondary}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          {...rest}
        />
        {isPasswordField && (
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
            <MaterialIcons 
              name={isPasswordVisible ? 'visibility' : 'visibility-off'} 
              size={24} 
              color={Colors.light.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
});
