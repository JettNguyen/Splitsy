import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';

// toast notification with smooth show/hide animations
const Toast = ({ 
  visible, 
  message, 
  type = 'success', 
  duration = 3000, 
  onHide 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // animate toast in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

    // automatically hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible) return null;

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#10B981', icon: 'S' };
      case 'error':
        return { backgroundColor: '#EF4444', icon: 'E' };
      case 'warning':
        return { backgroundColor: '#F59E0B', icon: 'W' };
      case 'info':
        return { backgroundColor: '#7c3aed', icon: 'I' };
      default:
        return { backgroundColor: '#10B981', icon: 'S' };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: toastStyle.backgroundColor },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.toastContent} 
          onPress={hideToast}
          activeOpacity={0.8}
        >
          <Text style={styles.toastIcon}>{toastStyle.icon}</Text>
          <Text style={styles.toastMessage}>{message}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toast: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  toastMessage: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default Toast;