import React, { useState, useEffect } from 'react';
import { X, FileCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { receiptsAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../UI/Modal';
import LoadingSpinner from '../UI/LoadingSpinner';
import PrintReceipt from '../Receipt/PrintReceipt';
import toast from 'react-hot-toast';

const NOCReceiptForm = ({ isOpen, onClose, plot, onSuccess }) => {
  if (!plot) return null;

  // This component now just shows the receipt preview
  // The receipt is already created by the handler
  return (
    <PrintReceipt 
      receipt={plot} 
      isOpen={isOpen} 
      onClose={() => {
        if (onSuccess) onSuccess();
        onClose();
      }} 
    />
  );
};

export default NOCReceiptForm;
