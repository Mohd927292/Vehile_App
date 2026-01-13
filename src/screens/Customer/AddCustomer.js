import React, { useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { useTheme } from '../../hooks/useTheme';

const AddCustomer = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const prefilledName = route.params?.customerName || '';
  const [customerData, setCustomerData] = useState({
    msName: prefilledName,
    msnamelower: prefilledName.toLowerCase(),
    address1: '',
    address2: '',
    gstin: '',
    phoneNo: '',
    email: '',
  });

  const handleInputChange = (field, value) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateGSTIN = (gstin) => {
    // GSTIN validation regex (simplified version)
    const gstinRegex = /^[0-9]/
    
    //{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
    return gstinRegex.test(gstin);
  };

  const validatePhone = (phone) => {
    // Phone number validation (10 digits, starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateEmail = (email) => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCustomer = async () => {
    if (isSaving) return; // Prevent multiple submissions
    
    // Validate required fields
    if (!customerData.msName?.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
  

    try {
      setIsSaving(true);
      
      // Save customer data to Firestore
      const customerDataToSave = {
        msName: customerData.msName.trim(),
        msnamelower: customerData.msName.trim().toLowerCase(),
        address1: customerData.address1.trim(),
        address2: customerData.address2?.trim() || '',
        gstin: customerData.gstin.trim(),
        phoneNo: customerData.phoneNo.trim(),
        email: customerData.email?.trim() || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const customersRef = collection(db, 'customers');
      const docRef = await addDoc(customersRef, customerDataToSave);
      
        Alert.alert('Success', 'Customer saved successfully!', [
        { 
          text: 'OK', 
          onPress: () => navigation.goBack() 
        }
      ]);
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to save customer. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <Appbar.Header style={[styles.appbar, { backgroundColor: colors.surface }]} elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Add Customer" titleStyle={[styles.appbarTitle, { color: colors.text }]} />
        </Appbar.Header>

        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formCard, { backgroundColor: colors.background , borderColor:colors.border}]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Details</Text>

            <TextInput
              label="M/s Name *"
              value={customerData.msName}
              onChangeText={(value) => handleInputChange('msName', value)}
              placeholder="Enter company name"
              autoCapitalize="characters"
                            mode="outlined"
              style={[styles.input, {backgroundColor:colors.surface}]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              selectionColor={colors.primary}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
            />

            <TextInput
              label="Address 1 "
              value={customerData.address1}
              onChangeText={(value) => handleInputChange('address1', value)}
              placeholder="Enter address line 1"
              
              autoCapitalize="characters"
              multiline
              mode="outlined"
              style={[styles.input, styles.multilineInput,{backgroundColor:colors.surface}]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              selectionColor={colors.primary}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
            />

            <TextInput
              label="Address 2"
              value={customerData.address2}
              onChangeText={(value) => handleInputChange('address2', value)}
              placeholder="Enter address line 2"
              autoCapitalize="characters"
              multiline
              mode="outlined"
              style={[styles.input, styles.multilineInput,{backgroundColor:colors.surface}]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              selectionColor={colors.primary}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
            />

            <TextInput
              label="GSTIN "
              value={customerData.gstin}
              onChangeText={(value) => handleInputChange('gstin', value)}
              placeholder="Enter GSTIN"
              autoCapitalize="characters"
              mode="outlined"
              style={[styles.input,{backgroundColor:colors.surface}]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              selectionColor={colors.primary}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
            />

            <TextInput
              label="Phone No "
              value={customerData.phoneNo}
              onChangeText={(value) => handleInputChange('phoneNo', value)}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              mode="outlined"
              style={[styles.input,{backgroundColor:colors.surface}]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              selectionColor={colors.primary}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
            />

            <TextInput
              label="Email (Optional)"
              value={customerData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={[styles.input,{backgroundColor:colors.surface}]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              selectionColor={colors.primary}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </ScrollView>

        <Button
          mode="contained"
          onPress={handleSaveCustomer}
          disabled={isSaving}
          loading={isSaving}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          buttonColor="#6366f1"
        >
          Save Customer
        </Button>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appbar: {
    elevation: 2,
  },
  appbarTitle: {
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  input: {
    marginBottom: 12,
    
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

export default AddCustomer;