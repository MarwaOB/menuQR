'use client';

const InputField = ({ label, name, value, onChange, type = 'text', required = false, disabled = false, autoComplete }) => {
  return (
    <div className="w-full">
      <label htmlFor={name} className="field-label">
        {label}
        {required && <span className="ms-0.5 text-paprika" aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className="field"
      />
    </div>
  );
};

export default InputField;
