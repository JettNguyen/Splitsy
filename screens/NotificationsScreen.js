import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

const NotificationsScreen = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    expenseAlerts: true,
    paymentReminders: true,
    groupActivity: true,
    settleUpReminders: true,
    emailNotifications: false,
  });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'expense': return '💰';
      case 'payment': return '💸';
      case 'settle': return '✅';
      case 'reminder': return '⏰';
      case 'group': return '👥';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'expense': return theme.colors.info;
      case 'payment': return theme.colors.success;
      case 'settle': return theme.colors.accent;
      case 'reminder': return theme.colors.warning;
      case 'group': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  const NotificationItem = ({ notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { 
          backgroundColor: notification.read ? theme.colors.surface : theme.colors.card,
          borderColor: theme.colors.border,
          borderLeftColor: getNotificationColor(notification.type),
        }
      ]}
      onPress={() => markAsRead(notification.id)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(notification.type) }]}>
        <Text style={styles.notificationIconText}>
          {getNotificationIcon(notification.type)}
        </Text>
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { 
          color: theme.colors.text,
          fontWeight: notification.read ? '500' : '600'
        }]}>
          {notification.title}
        </Text>
        <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}>
          {notification.message}
        </Text>
        <Text style={[styles.notificationTime, { color: theme.colors.textTertiary }]}>
          {formatTime(notification.timestamp)}
        </Text>
      </View>
      {!notification.read && (
        <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.accent }]} />
      )}
    </TouchableOpacity>
  );

  const SettingRow = ({ title, subtitle, value, onToggle }) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
        thumbColor={theme.colors.card}
      />
    </View>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={[styles.markAllButtonText, { color: theme.colors.accent }]}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={[styles.statsSection, { backgroundColor: theme.colors.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.accent }]}>{unreadCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Unread</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>{notifications.length}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity style={styles.statItem} onPress={clearAll}>
              <Text style={[styles.clearAllText, { color: theme.colors.error }]}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyIcon, { color: theme.colors.textTertiary }]}>🔔</Text>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No notifications yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  You'll see expense updates and payment reminders here
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notification Settings</Text>
            <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <SettingRow
                title="Push Notifications"
                subtitle="Receive notifications on this device"
                value={settings.pushNotifications}
                onToggle={(value) => setSettings({ ...settings, pushNotifications: value })}
              />
              <SettingRow
                title="Expense Alerts"
                subtitle="When expenses are added to your groups"
                value={settings.expenseAlerts}
                onToggle={(value) => setSettings({ ...settings, expenseAlerts: value })}
              />
              <SettingRow
                title="Payment Reminders"
                subtitle="Reminders to settle up with friends"
                value={settings.paymentReminders}
                onToggle={(value) => setSettings({ ...settings, paymentReminders: value })}
              />
              <SettingRow
                title="Group Activity"
                subtitle="Updates about group changes and new members"
                value={settings.groupActivity}
                onToggle={(value) => setSettings({ ...settings, groupActivity: value })}
              />
              <SettingRow
                title="Settle Up Reminders"
                subtitle="Weekly reminders to clear outstanding balances"
                value={settings.settleUpReminders}
                onToggle={(value) => setSettings({ ...settings, settleUpReminders: value })}
              />
              <SettingRow
                title="Email Notifications"
                subtitle="Receive notifications via email"
                value={settings.emailNotifications}
                onToggle={(value) => setSettings({ ...settings, emailNotifications: value })}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  markAllButton: {
    padding: 8,
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsSection: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
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
});

export default NotificationsScreen;