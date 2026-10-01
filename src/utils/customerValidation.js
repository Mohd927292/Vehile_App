export const normalizeCustomerName = value => (value || '').replace(/\s+/g, ' ').trim();

export const validateCustomerInput = customer => {
  const name = normalizeCustomerName(customer.msName);
  if (!name) return 'Customer name is required';

  const gstin = (customer.gstin || '').trim().toUpperCase();
  if (gstin && !/^[A-Z0-9]{15}$/.test(gstin)) {
    return 'GSTIN must have 15 letters or digits';
  }

  const phone = (customer.phoneNo || '').trim();
  if (phone && !/^[6-9]\d{9}$/.test(phone)) {
    return 'Enter a valid 10-digit mobile number';
  }

  const email = (customer.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address';
  }

  return null;
};
