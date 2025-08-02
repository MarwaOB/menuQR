'use client';

import React from 'react';
import MyButton from './Button';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/20 transition-all duration-200">
      <div className="relative w-[90%] max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-200 animate-fadeInScale">
        <MyButton
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 bg-transparent text-gray-400 hover:text-red-500 text-xl p-0 m-0 shadow-none"
        >
          &times;
        </MyButton>

        {children}
      </div>
    </div>
  );
};

export default Modal;
