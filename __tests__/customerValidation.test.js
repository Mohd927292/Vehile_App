import { normalizeCustomerName, validateCustomerInput } from '../src/utils/customerValidation';

describe('customer form validation', () => {
  it('normalizes spacing and requires a name', () => {
    expect(normalizeCustomerName('  ACME   Logistics  ')).toBe('ACME Logistics');
    expect(validateCustomerInput({ msName: '  ' })).toBe('Customer name is required');
  });

  it('checks optional GSTIN, phone, and email when supplied', () => {
    const customer = { msName: 'ACME', gstin: '29AYLPR9800N1ZH', phoneNo: '9876543210', email: 'a@example.com' };
    expect(validateCustomerInput(customer)).toBeNull();
    expect(validateCustomerInput({ ...customer, gstin: '12' })).toMatch(/GSTIN/);
    expect(validateCustomerInput({ ...customer, phoneNo: '123' })).toMatch(/mobile/);
    expect(validateCustomerInput({ ...customer, email: 'wrong' })).toMatch(/email/);
  });
});
