import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  TextInput,
  Button,
  Appbar,
  Provider as PaperProvider,
} from 'react-native-paper';
import { db } from '../../config/firebase';
import firestore from '@react-native-firebase/firestore';

const EditCustomer = ({ navigation, route }) => {
  const customer = route?.params?.customer;

  const initialCustomerData = useMemo(() => ({
    msName: customer?.msName || '',
    msnamelower: customer?.msnamelower || (customer?.msName ? customer.msName.toLowerCase() : ''),
    address1: customer?.address1 || '',
    address2: customer?.address2 || '',
    gstin: customer?.gstin || '',
    phoneNo: customer?.phoneNo || '',
    email: customer?.email || '',
  }), [customer]);

  const [customerData, setCustomerData] = useState(initialCustomerData);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field, value) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateGSTIN = (gstin) => {
    const gstinRegex = /^[0-9]/;
    return gstinRegex.test(gstin);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUpdateCustomer = async () => {
    if (isSaving) return;

    if (!customer?.id) {
      Alert.alert('Error', 'Customer not found. Please go back and try again.');
      return;
    }

    if (!customerData.msName?.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    if (!customerData.address1?.trim()) {
      Alert.alert('Error', 'Address line 1 is required');
      return;
    }
    if (!customerData.gstin?.trim()) {
      Alert.alert('Error', 'GSTIN is required');
      return;
    }
    if (!validateGSTIN(customerData.gstin.trim())) {
      Alert.alert('Error', 'Please enter a valid GSTIN');
      return;
    }
    if (!customerData.phoneNo?.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (!validatePhone(customerData.phoneNo.trim())) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    if (!validateEmail(customerData.email?.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsSaving(true);

      const customerDataToSave = {
        msName: customerData.msName.trim(),
        msnamelower: customerData.msName.trim().toLowerCase(),
        address1: customerData.address1.trim(),
        address2: customerData.address2?.trim() || '',
        gstin: customerData.gstin.trim(),
        phoneNo: customerData.phoneNo.trim(),
        email: customerData.email?.trim() || '',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('customers').doc(customer.id).update(customerDataToSave);

      Alert.alert('Success', 'Customer updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error updating customer:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to update customer. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <Appbar.Header style={styles.appbar} elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Edit Customer" titleStyle={styles.appbarTitle} />
        </Appbar.Header>

        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            
         
            <TextInput
              label="M/s Name *"
              value={customerData.msName}
              onChangeText={(value) => handleInputChange('msName', value)}
              placeholder="Enter company name"
              mode="outlined"
              style={styles.input}
              outlineColor="#e2e8f0"
              activeOutlineColor="#6366f1"
              selectionColor="#6366f1"
            />

            <TextInput
              label="Address 1 *"
              value={customerData.address1}
              onChangeText={(value) => handleInputChange('address1', value)}
              placeholder="Enter address line 1"
              multiline
              mode="outlined"
              style={[styles.input, styles.multilineInput]}
              outlineColor="#e2e8f0"
              activeOutlineColor="#6366f1"
              selectionColor="#6366f1"
            />

            <TextInput
              label="Address 2"
              value={customerData.address2}
              onChangeText={(value) => handleInputChange('address2', value)}
              placeholder="Enter address line 2"
              multiline
              mode="outlined"
              style={[styles.input, styles.multilineInput]}
              outlineColor="#e2e8f0"
              activeOutlineColor="#6366f1"
              selectionColor="#6366f1"
            />

            <TextInput
              label="GSTIN *"
              value={customerData.gstin}
              onChangeText={(value) => handleInputChange('gstin', value)}
              placeholder="Enter GSTIN"
              autoCapitalize="characters"
              mode="outlined"
              style={styles.input}
              outlineColor="#e2e8f0"
              activeOutlineColor="#6366f1"
              selectionColor="#6366f1"
            />

            <TextInput
              label="Phone No *"
              value={customerData.phoneNo}
              onChangeText={(value) => handleInputChange('phoneNo', value)}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              outlineColor="#e2e8f0"
              activeOutlineColor="#6366f1"
              selectionColor="#6366f1"
            />

            <TextInput
              label="Email (Optional)"
              value={customerData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              outlineColor="#e2e8f0"
              activeOutlineColor="#6366f1"
              selectionColor="#6366f1"
            />
          </View>
        </ScrollView>

        <Button
          mode="contained"
          onPress={handleUpdateCustomer}
          disabled={isSaving}
          loading={isSaving}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          buttonColor="#6366f1"
        >
          Update Customer
        </Button>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  appbar: {
    backgroundColor: '#fff',
  },
  appbarTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 28,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
    color: '#64748b',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 54,
  },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 14,
    elevation: 3,
  },
  saveButtonContent: {
    height: 52,
  },
});

export default EditCustomer;