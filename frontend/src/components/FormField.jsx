import React from 'react';

/**
 * Reusable form field wrapper component
 * Handles input rendering, masking, validation, and error display
 * 
 * Props:
 *   - label: Field label text
 *   - name: Field name (for form state)
 *   - type: Input type (text, email, password, etc.)
 *   - value: Current field value
 *   - error: Error message (if any)
 *   - onChange: Handler for input changes
 *   - onBlur: Handler for blur events (optional)
 *   - placeholder: Input placeholder
 *   - disabled: Disable input
 *   - required: Show required indicator
 *   - mask: Function to apply input masking (optional)
 *   - maxLength: Max character length
 */
const FormField = ({
  label,
  name,
  type = 'text',
  value = '',
  error = '',
  onChange,
  onBlur,
  placeholder = '',
  disabled = false,
  required = false,
  mask = null,
  maxLength = null,
}) => {
  const handleChange = (e) => {
    let newValue = e.target.value;

    // Apply mask if provided
    if (mask) {
      newValue = mask(newValue);
    }

    // Respect maxLength if set
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }

    onChange({
      target: {
        name,
        value: newValue,
      },
    });
  };

  return (
    <div className="form-field-wrapper">
      <label htmlFor={name} className="form-field-label">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={`form-field-input ${error ? 'input-error' : ''}`}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
};

export default FormField;
