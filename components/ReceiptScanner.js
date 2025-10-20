// components/ReceiptScanner.js
// pick/take a photo → upload to flask /ocr → show parsed result → return to parent

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Image, TextInput,
  ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import Constants from 'expo-constants';
const { IP_ADDRESS } = Constants.expoConfig.extra;

// set this to your flask url
// ios sim:      http://127.0.0.1:5000/ocr
// android emu:  http://10.0.2.2:5000/ocr
// real device:  http://<your-computer-ip>:5000/ocr
const BACKEND_URL = `http://${IP_ADDRESS}:5000/ocr`;

const ReceiptScanner = ({ visible, onClose, onReceiptScanned }) => {
  const { theme } = useTheme();

  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showEditView, setShowEditView] = useState(false);
  const [extractedData, setExtractedData] = useState({
    merchant: '', date: '', subtotal: '', total: '', items: []
  });
  const [savedInfo, setSavedInfo] = useState({ saved_json_path: '', saved_image_path: '' });

  // reset when modal closes
  useEffect(() => {
    if (!visible) {
      setIsProcessing(false);
      setCapturedImage(null);
      setShowEditView(false);
      setExtractedData({ merchant: '', date: '', subtotal: '', total: '', items: [] });
      setSavedInfo({ saved_json_path: '', saved_image_path: '' });
    }
  }, [visible]);

  // upload image to flask and set parsed data
  const uploadToBackend = async (imageUri) => {
    try {
      setIsProcessing(true);

      const name = imageUri.split('/').pop() || 'receipt.jpg';
      const form = new FormData();

      if (Platform.OS === 'web') {
        // web: need a real File
        const resp = await fetch(imageUri); // fetch blob from uri (can be blob: or data:)
        const blob = await resp.blob();
        const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
        form.append('file', file);
      } else {
        // native: append uri object
        const ext = name.split('.').pop()?.toLowerCase();
        const type =
          ext === 'png' ? 'image/png' :
          ext === 'heic' || ext === 'heif' ? 'image/heic' :
          'image/jpeg';
        form.append('file', { uri: imageUri, name, type });
      }

      // let fetch set the multipart boundary (no manual content-type)
      const res = await fetch(BACKEND_URL, { method: 'POST', body: form });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `http ${res.status}`);
      }

      const data = await res.json();

      setExtractedData({
        merchant: data.merchant || 'unknown merchant',
        date: data.date || new Date().toLocaleDateString(),
        subtotal: data.subtotal || '0.00',
        total: data.total || '0.00',
        items: Array.isArray(data.items)
          ? data.items.map(i => ({ name: i.name || '', price: i.price?.toString() || '', qty: i.qty || 1 }))
          : []
      });
      setSavedInfo({
        saved_json_path: data.saved_json_path || '',
        saved_image_path: data.saved_image_path || ''
      });



      
      setShowEditView(true);
    } catch (e) {
      console.error('ocr upload error:', e);
      Alert.alert('hmm', 'could not read that image. you can edit fields manually.');
      setShowEditView(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // camera flow
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('permission', 'please enable camera to snap your receipt');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.9 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setCapturedImage(uri);
      await uploadToBackend(uri);
    }
  };

  // gallery flow
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('permission', 'please enable photo library to pick a receipt');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setCapturedImage(uri);
      await uploadToBackend(uri);
    }
  };

  // edit helpers
  // const addItem = () =>
  //   setExtractedData(p => ({ ...p, items: [...p.items, { name: '', price: '', qty: 1 }] }));

  const addItem = () =>
  setExtractedData(prev => {
    const newItem = { name: '', price: '', qty: 1 };

    // subtotal doesn’t change yet since no price entered
    return { ...prev, items: [...prev.items, newItem] };
  });

  // const removeItem = (i) =>
  //   setExtractedData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  //also updates subtotal value 
  const removeItem = (i) =>
  setExtractedData(prev => {
    const removedItem = prev.items[i];
    const qty = removedItem && !isNaN(parseInt(removedItem.qty)) ? parseInt(removedItem.qty) : 1;
    const price = removedItem && !isNaN(parseFloat(removedItem.price)) ? parseFloat(removedItem.price) : 0;

    const updatedItems = prev.items.filter((_, idx) => idx !== i);
    const newSubtotal = Math.max(0, (parseFloat(prev.subtotal) || 0) - qty * price);

    return { ...prev, items: updatedItems, subtotal: newSubtotal.toFixed(2) };
  });

  // const updateItem = (i, field, val) =>
  //   setExtractedData(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));

  const updateItem = (i, field, val) =>
  setExtractedData(prev => {
    const updatedItems = prev.items.map((it, idx) =>
      idx === i ? { ...it, [field]: val } : it
    );

    // recompute subtotal from scratch (simpler + safer)
    let subtotal = 0;
    for (const item of updatedItems) {
      const q = !isNaN(parseInt(item.qty)) ? parseInt(item.qty) : 1;
      const p = !isNaN(parseFloat(item.price)) ? parseFloat(item.price) : 0;
      subtotal += q * p;
    }

    return {
      ...prev,
      items: updatedItems,
      subtotal: subtotal.toFixed(2),
      total: newTotal
    };
  });

  
  // confirm and pass back
  const handleConfirm = () => {
    if (!extractedData.merchant.trim()) return Alert.alert('missing', 'please enter a merchant');
    if (!extractedData.total.trim()) return Alert.alert('missing', 'please enter a total');

    onReceiptScanned({ ...extractedData, _saved: savedInfo });
    onClose();
  };

  const handleClose = () => {
    setShowEditView(false);
    setCapturedImage(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {!showEditView ? (
          // step 1: choose photo
          <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={handleClose}>
                <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Receipt Scanner</Text>
              <View style={{ width: 20 }} />
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <View style={styles.icon}><Text style={styles.iconText}>🧾</Text></View>
              <Text style={[{ fontSize: 22, fontWeight: '700', marginBottom: 8, color: theme.colors.text }]}>
                Scan Receipt
              </Text>
              <Text style={[{ fontSize: 15, marginBottom: 24, color: theme.colors.textSecondary, textAlign: 'center' }]}>
                we’ll read the text, save a json on the server, and let you edit the details
              </Text>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.primary, marginBottom: 12 }]}
                onPress={takePhoto}
                disabled={isProcessing}
              >
                <Text style={styles.actionButtonText}>📷 take photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.card, borderWidth: 2, borderColor: theme.colors.primary }]}
                onPress={pickImage}
                disabled={isProcessing}
              >
                <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>choose from gallery</Text>
              </TouchableOpacity>

              {isProcessing && (
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
                    Reading your receipt…
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // step 2: review + edit
          <ScrollView style={[styles.editContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.editHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={() => setShowEditView(false)}>
                <Text style={[styles.backButton, { color: theme.colors.primary }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.editTitle, { color: theme.colors.text }]}>Review Details</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={[styles.confirmButton, { color: theme.colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            {capturedImage ? <Image source={{ uri: capturedImage }} style={styles.previewImage} /> : null}

            {(savedInfo.saved_json_path || savedInfo.saved_image_path) && (
              <View style={[styles.infoBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>saved on server:</Text>
                {!!savedInfo.saved_json_path && (
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    json: {savedInfo.saved_json_path}
                  </Text>
                )}
                {!!savedInfo.saved_image_path && (
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    image: {savedInfo.saved_image_path}
                  </Text>
                )}
              </View>
            )}

            <View style={[styles.formSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Receipt</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Merchant</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={extractedData.merchant}
                  onChangeText={(t) => setExtractedData(p => ({ ...p, merchant: t }))}
                  placeholder="e.g., target"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={extractedData.date}
                  onChangeText={(t) => setExtractedData(p => ({ ...p, date: t }))}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={extractedData.subtotal}
                  onChangeText={(t) => setExtractedData(p => ({ ...p, subtotal: t }))}
                  placeholder="$0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Total</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={extractedData.total}
                  onChangeText={(t) => setExtractedData(p => ({ ...p, total: t }))}
                  placeholder="$0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: theme.colors.card }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Items (optional)</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={addItem}>
                  <Text style={styles.addButtonText}>+ Add item</Text>
                </TouchableOpacity>
              </View>

              {extractedData.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <TextInput
                  style={[styles.input, styles.itemQtyInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={String(item.qty)}
                  onChangeText={(t) => updateItem(idx, 'qty', t.replace(/[^0-9]/g, ''))} // allow only numbers
                  placeholder="Qty"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                  <TextInput
                    style={[styles.input, styles.itemNameInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={item.name}
                    onChangeText={(t) => updateItem(idx, 'name', t)}
                    placeholder="item name"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, styles.itemPriceInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={item.price}
                    onChangeText={(t) => updateItem(idx, 'price', t)}
                    placeholder="$0.00"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(idx)}>
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  
  container: { flex: 1 },
  centerContainer: { flex: 1 },
  icon: {
    width: 100, 
    height: 100, 
    borderRadius: 26, 
    backgroundColor: '#7c3aed',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20
  },
  
  iconText: { 
    fontSize: 40, 
    fontWeight: '900', 
    color: 'white'
   },

  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 14, 
    borderBottomWidth: 1
  },

  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700' 
  },

  closeButtonText: { fontSize: 18 },

  actionButton: {
    paddingHorizontal: 26, 
    paddingVertical: 14, 
    borderRadius: 22, 
    minWidth: 200, 
    alignItems: 'center'
   },

  actionButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '700' 
  },

  editContainer: { flex: 1 },

  editHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 14, 
    borderBottomWidth: 1
  },

  backButton: { 
    fontSize: 16, 
    fontWeight: '700'
   },

  editTitle: { 
    fontSize: 18, 
    fontWeight: '800' 
  },

  confirmButton: { 
    fontSize: 16, 
    fontWeight: '700' 
  },

  previewImage: { 
    width: '100%', 
    height: 220, 
    resizeMode: 'contain', 
    backgroundColor: '#000' 
  },

  infoBox: { 
    margin: 12, 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1 
  },

  infoText: { fontSize: 12 },

  formSection: { 
    marginHorizontal: 16, 
    marginVertical: 10, 
    borderRadius: 12, 
    padding: 16 
  },

  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },

  sectionTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    marginBottom: 8 
  },

  inputGroup: { marginBottom: 10 },

  label: { 
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 6 
  },

  input: { 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    fontSize: 16 
  },

  addButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 6 
  },

  addButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '700' 
  },

  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10, 
    gap: 8 
  },

  itemNameInput: { flex: 2 },
  itemPriceInput: { flex: 1 },
  itemQtyInput: { flex: 0.5 },

  removeButton: { 
    backgroundColor: '#EF4444', 
    borderRadius: 12, 
    width: 28, height: 28, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  removeButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '800' 
  },
});

export default ReceiptScanner;