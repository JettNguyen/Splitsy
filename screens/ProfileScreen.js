import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  Switch
} from 'react-native';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

const ProfileScreen = () => {
  const { currentUser, logoutUser, updateUser } = useUser();
  const { calculateUserBalance } = useData();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || ''
  });

  const balance = calculateUserBalance();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: logoutUser
        }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    const result = await updateUser(currentUser.id, {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone
    });

    if (result.success) {
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true }) => (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.colors.card }]} onPress={onPress}>
      <View style={styles.menuItemContent}>
        <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.menuIcon}>{icon}</Text>
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        </View>
        {showArrow && <Text style={[styles.menuArrow, { color: theme.colors.textTertiary }]}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  const MenuSection = ({ title, children }) => (
    <View style={styles.menuSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.card }]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <ScrollView style={styles.scrollContainer}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{currentUser?.avatar || 'U'}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{currentUser?.name}</Text>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{currentUser?.email}</Text>
          
          {/* Balance Summary */}
          <View style={[styles.balanceContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Total Balance</Text>
              <Text style={[
                styles.balanceAmount,
                { color: balance >= 0 ? theme.colors.success : theme.colors.error }
              ]}>
                ${Math.abs(balance).toFixed(2)}
              </Text>
              <Text style={[styles.balanceStatus, { color: theme.colors.textTertiary }]}>
                {balance >= 0 ? 'You are owed' : 'You owe'}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <MenuSection title="Account">
          <MenuItem
            icon="✏️"
            title="Edit Profile"
            subtitle="Update your name, email, and phone"
            onPress={() => setShowEditModal(true)}
          />
          <View style={[styles.themeToggleContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.menuItemContent}>
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={styles.menuIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Dark Mode</Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>Toggle between light and dark themes</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.card}
              />
            </View>
          </View>
          <MenuItem
            icon="💳"
            title="Payment Methods"
            subtitle="Manage your payment apps"
            onPress={() => Alert.alert('Coming Soon', 'Payment method management will be available in a future update')}
          />
          <MenuItem
            icon="🔔"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available in a future update')}
          />
        </MenuSection>

        {/* Groups Section */}
        <MenuSection title="Groups">
          <MenuItem
            icon="👥"
            title="Manage Groups"
            subtitle="View and edit your groups"
            onPress={() => Alert.alert('Coming Soon', 'Group management will be available in a future update')}
          />
          <MenuItem
            icon="📊"
            title="Expense Reports"
            subtitle="View detailed spending reports"
            onPress={() => Alert.alert('Coming Soon', 'Expense reports will be available in a future update')}
          />
        </MenuSection>

        {/* Support Section */}
        <MenuSection title="Support">
          <MenuItem
            icon="❓"
            title="Help & FAQ"
            subtitle="Get help and find answers"
            onPress={() => Alert.alert('Coming Soon', 'Help section will be available in a future update')}
          />
          <MenuItem
            icon="📧"
            title="Contact Support"
            subtitle="Get in touch with our team"
            onPress={() => Alert.alert('Coming Soon', 'Contact support will be available in a future update')}
          />
          <MenuItem
            icon="⭐"
            title="Rate Splitsy"
            subtitle="Leave a review on the app store"
            onPress={() => Alert.alert('Coming Soon', 'App store rating will be available in a future update')}
          />
        </MenuSection>

        {/* Sign Out */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity style={[styles.signOutButton, { backgroundColor: theme.colors.error }]} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.modalCloseButton, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile}>
              <Text style={[styles.modalSaveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.formGroup, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={[styles.formGroup, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editForm.email}
                onChangeText={(text) => setEditForm({...editForm, email: text})}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.formGroup, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>Phone (Optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({...editForm, phone: text})}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 20,
  },
  balanceContainer: {
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceStatus: {
    fontSize: 14,
  },
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  themeToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  menuArrow: {
    fontSize: 20,
    fontWeight: '300',
  },
  signOutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  signOutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCloseButton: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingTop: 24,
  },
  formGroup: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
});

export default ProfileScreen;