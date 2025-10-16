import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

//context imports
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, FONT_FAMILY_BOLD } from '../styles/AppStyles';

//authentication screen component handles login and registration
const AuthScreen = () => {
  const { theme } = useTheme();
  const { registerUser, loginUser } = useUser();
  
  //ui state
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  //form data state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  //helper function to update form fields
  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  //form validation with error messages
  const validateForm = () => {
    if (!form.email.trim()) return 'Please enter an email';
    if (!form.password.trim()) return 'Please enter a password';
    if (!isLogin && !form.name.trim()) return 'Please enter your name';
    if (!isLogin && form.password !== form.confirmPassword) return 'Passwords do not match';
    if (!isLogin && form.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setLoading(true);
    try {
      const result = isLogin 
        ? await loginUser(form.email, form.password)
        : await registerUser({
            name: form.name,
            email: form.email,
            password: form.password
          });

      if (!result.success) {
        Alert.alert('Error', result.error);
      }
    } 
    catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } 
    finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Splitsy</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {isLogin ? 'Welcome back!' : 'Split expenses with friends'}
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border, 
                  color: theme.colors.text 
                }]}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.textSecondary}
                value={form.name}
                onChangeText={(text) => updateForm('name', text)}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border, 
                color: theme.colors.text 
              }]}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textSecondary}
              value={form.email}
              onChangeText={(text) => updateForm('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border, 
                color: theme.colors.text 
              }]}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.textSecondary}
              value={form.password}
              onChangeText={(text) => updateForm('password', text)}
              secureTextEntry
            />
          </View>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border, 
                  color: theme.colors.text 
                }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.colors.textSecondary}
                value={form.confirmPassword}
                onChangeText={(text) => updateForm('confirmPassword', text)}
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.colors.primary },
              loading && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Text>
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={[styles.switchText, { color: theme.colors.textSecondary }]}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={switchMode}>
              <Text style={[styles.switchLink, { color: theme.colors.primary }]}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    fontFamily: FONT_FAMILY_BOLD,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
    fontFamily: FONT_FAMILY_BOLD,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: FONT_FAMILY,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AuthScreen;