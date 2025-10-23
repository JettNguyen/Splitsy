import React, { useState, memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

const SettingRow = memo(({ title, subtitle, value, onToggle, theme }) => {
  const settingRowStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border
  };

  const settingTextStyle = {
    flex: 1,
    marginRight: 16
  };

  const settingTitleStyle = {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
    color: theme.colors.text
  };

  const settingSubtitleStyle = {
    fontSize: 13,
    color: theme.colors.textSecondary
  };

  return (
    <View style={settingRowStyle}>
      <View style={settingTextStyle}>
        <Text style={settingTitleStyle}>{title}</Text>
        <Text style={settingSubtitleStyle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        ios_backgroundColor={theme.colors.border}
        trackColor={{ 
          false: theme.colors.border, 
          true: theme.colors.accent 
        }}
        thumbColor={Platform.OS === 'ios' ? undefined : (value ? theme.colors.card : theme.colors.textTertiary)}
      />
    </View>
  );
});

const NotificationsScreen = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { notifications, markAsRead } = useNotifications();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    expenseAlerts: true,
    paymentReminders: true,
    groupActivity: true,
    settleUpReminders: true,
    emailNotifications: false,
  });
  
  const translateY = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');
  
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 3 && gestureState.dy > 0;
    },
    onPanResponderGrant: () => {
      translateY.setOffset(translateY._value);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy * 0.8);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      translateY.flattenOffset();
      if (gestureState.dy > height * 0.2 || gestureState.vy > 1.2) {
        Animated.timing(translateY, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const togglePushNotifications = useCallback((value) => {
    setSettings(prev => ({ ...prev, pushNotifications: value }));
  }, []);

  const toggleExpenseAlerts = useCallback((value) => {
    setSettings(prev => ({ ...prev, expenseAlerts: value }));
  }, []);

  const togglePaymentReminders = useCallback((value) => {
    setSettings(prev => ({ ...prev, paymentReminders: value }));
  }, []);

  const toggleGroupActivity = useCallback((value) => {
    setSettings(prev => ({ ...prev, groupActivity: value }));
  }, []);

  const toggleSettleUpReminders = useCallback((value) => {
    setSettings(prev => ({ ...prev, settleUpReminders: value }));
  }, []);

  const toggleEmailNotifications = useCallback((value) => {
    setSettings(prev => ({ ...prev, emailNotifications: value }));
  }, []);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.container, 
          { 
            backgroundColor: theme.colors.background,
            transform: [{ translateY }]
          }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
    {/* drag indicator */}
          <View style={styles.dragIndicatorContainer} {...panResponder.panHandlers}>
            <View style={[styles.dragIndicator, { backgroundColor: theme.colors.textTertiary }]} />
          </View>
        
  {/* header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary, opacity: 0.7 }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
          <View style={styles.markAllButton} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notification Settings</Text>
            <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <SettingRow
                key="pushNotifications"
                title="Push Notifications"
                subtitle="Receive notifications on this device"
                value={settings.pushNotifications}
                onToggle={togglePushNotifications}
                theme={theme}
              />
              <SettingRow
                key="expenseAlerts"
                title="Expense Alerts"
                subtitle="When expenses are added to your groups"
                value={settings.expenseAlerts}
                onToggle={toggleExpenseAlerts}
                theme={theme}
              />
              <SettingRow
                key="paymentReminders"
                title="Payment Reminders"
                subtitle="Reminders to settle up with friends"
                value={settings.paymentReminders}
                onToggle={togglePaymentReminders}
                theme={theme}
              />
              <SettingRow
                key="groupActivity"
                title="Group Activity"
                subtitle="Updates about group changes and new members"
                value={settings.groupActivity}
                onToggle={toggleGroupActivity}
                theme={theme}
              />
              <SettingRow
                key="settleUpReminders"
                title="Settle Up Reminders"
                subtitle="Weekly reminders to clear outstanding balances"
                value={settings.settleUpReminders}
                onToggle={toggleSettleUpReminders}
                theme={theme}
              />
              <SettingRow
                key="emailNotifications"
                title="Email Notifications"
                subtitle="Receive notifications via email"
                value={settings.emailNotifications}
                onToggle={toggleEmailNotifications}
                theme={theme}
              />
            </View>
          </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 25,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 16,
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    zIndex: 0,
  },
  markAllButton: {
    padding: 8,
    zIndex: 1,
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  safeArea: {
    flex: 1,
  },
});

export default NotificationsScreen;