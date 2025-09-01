import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaTimes, FaWifi, FaGlobe } from 'react-icons/fa';
import QRCode from 'qrcode';
import config from '../config';
import MyButton from './UI/Button';

// Helper function to get base URL
const getBaseUrl = () => {
  // Get the base URL and ensure it doesn't end with a slash
  let baseUrl = config.API_BASE_URL || '';
  
  // Remove trailing slash if it exists
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  // Remove '/api' suffix if it exists
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  }
  
  return baseUrl;
};

const QRCodeModal = ({ isOpen, onClose, menuName, menuData }) => {
  const { t } = useTranslation();
  const localCanvasRef = useRef(null);
  const onlineCanvasRef = useRef(null);
  const [localQrData, setLocalQrData] = useState('');
  const [onlineQrData, setOnlineQrData] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Generate local URL (LAN)
      const localUrl = new URL('/menu/current', getBaseUrl());
      if (window.location.hostname === 'localhost') {
        localUrl.protocol = 'http:';
      }
      setLocalQrData(localUrl.toString());

      // Generate public URL (Online)
      const publicUrl = new URL('/menu/current', window.location.origin);
      if (window.location.hostname === 'localhost') {
        publicUrl.hostname = 'your-public-domain.com';
        publicUrl.protocol = 'https:';
      }
      setOnlineQrData(publicUrl.toString());

      // Generate QR codes
      if (localCanvasRef.current) {
        QRCode.toCanvas(localCanvasRef.current, localUrl.toString(), {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      }

      if (onlineCanvasRef.current) {
        QRCode.toCanvas(onlineCanvasRef.current, publicUrl.toString(), {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      }
    }
  }, [isOpen]);

  const downloadQRCode = (type) => {
    const canvas = type === 'local' ? localCanvasRef.current : onlineCanvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${menuName}-qr-code-${type}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  // Close modal when clicking on the backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-md w-full relative animate-fade-in my-8 max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100 z-10"
          aria-label="Close modal"
        >
          <FaTimes size={20} />
        </button>

        <div className="p-6 text-center overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{menuName}</h3>
          <p className="text-gray-600 mb-6">{t('scan_to_view_menu')}</p>

          {/* Local Network QR */}
          <div className="mb-8 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <FaWifi className="text-green-500" />
              <h4 className="font-medium">Local Network (LAN)</h4>
            </div>
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-white rounded-lg border-2 border-gray-200">
                <canvas ref={localCanvasRef} className="w-48 h-48" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3 break-all">{localQrData}</p>
            <MyButton
              onClick={() => downloadQRCode('local')}
              className="text-xs py-1 px-3 bg-green-500 hover:bg-green-600 text-white"
            >
              <FaDownload className="mr-1" /> Download LAN QR
            </MyButton>
          </div>

          {/* Online QR */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <FaGlobe className="text-blue-500" />
              <h4 className="font-medium">Online (Public)</h4>
            </div>
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-white rounded-lg border-2 border-gray-200">
                <canvas ref={onlineCanvasRef} className="w-48 h-48" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3 break-all">{onlineQrData}</p>
            <MyButton
              onClick={() => downloadQRCode('online')}
              className="text-xs py-1 px-3 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <FaDownload className="mr-1" /> Download Online QR
            </MyButton>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Tip:</strong> Use the LAN QR for customers on your WiFi network, and the Online QR for customers using mobile data.
            </p>
          </div>
          <p className="text-xs text-gray-400">{t('qr_code_description')}</p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;