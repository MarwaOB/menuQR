import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaTimes } from 'react-icons/fa';
import QRCode from 'qrcode';
import MyButton from './UI/Button';

const QRCodeModal = ({ isOpen, onClose, menuName, menuData }) => {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  React.useEffect(() => {
    if (isOpen && canvasRef.current && !qrGenerated) {
      generateQRCode();
    }
  }, [isOpen, qrGenerated]);

  const generateQRCode = async () => {
    try {
      const menuUrl = `${window.location.origin}/menu/${menuData?.id || 'preview'}`;
      
      await QRCode.toCanvas(canvasRef.current, menuUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrGenerated(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRCode = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `${menuName}-qr-code.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const handleClose = () => {
    setQrGenerated(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative animate-fade-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100"
        >
          <FaTimes size={20} />
        </button>

        <div className="p-8 text-center">
          <p className="text-gray-600 mb-6">{t('qr_code_generated')}</p>
          
          {/* Menu name */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">{menuName}</h4>
            <p className="text-sm text-gray-500">{t('scan_to_view_menu')}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <canvas ref={canvasRef} className="max-w-full" />
            </div>
          </div>

          {/* Download button */}
          <MyButton
            onClick={downloadQRCode}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-4"
          >
            <FaDownload /> {t('download_qr_code')}
          </MyButton>

          <p className="text-xs text-gray-400">{t('qr_code_description')}</p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;