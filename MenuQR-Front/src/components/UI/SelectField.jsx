// components/SelectField.jsx
'use client';

import React from 'react';
import { FaChevronDown } from 'react-icons/fa';

const SelectField = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  onFocus,
  options = [],
  error,
  required = false,
  placeholder,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-red-700 uppercase">
        {label} {required && '*'}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          className={`w-full appearance-none px-6 py-4 rounded-xl border ${
            error ? 'border-red-400' : 'border-gray-300'
          } focus:ring-2 focus:ring-yellow-400 bg-white text-gray-700`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-red-500">
          <FaChevronDown />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default SelectField;
