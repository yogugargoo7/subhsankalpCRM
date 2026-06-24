import React from 'react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { customerAPI } from '../../utils/api';

function CustomerRegister({ setCustomerRegistrationForm, onCustomerCreated }) {
  const [formData, setFormData] = useState({
    Name: '',
    Email: '',
    PlotNumber: '',
    password: '',
  });
  const [backendError, setBackendError] = useState('');
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await customerAPI.createCustomer(formData);
      if (onCustomerCreated) {
        onCustomerCreated();
      }
      setCustomerRegistrationForm(false);
    } catch (error) {
      if (error.response) {
        const data = error.response.data;
        if (typeof data === 'string') {
          setBackendError(data);
        } else if (data.message) {
          setBackendError(data.message);
        } else {
          setBackendError('Request failed.');
        }
      } else if (error.request) {
        setBackendError('Cannot reach server. Is backend running?');
      } else {
        setBackendError(error.message);
      }
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Add New Customer</h2>
          <button
            onClick={() => setCustomerRegistrationForm(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="Name"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              type="text"
              id="Name"
              name="Name"
              value={formData.Name}
              onChange={handleChange}
              className="input mt-1"
              placeholder="Enter customer's full name"
            />
          </div>
          <div>
            <label
              htmlFor="Email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="Email"
              name="Email"
              value={formData.Email}
              onChange={handleChange}
              className="input mt-1"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label
              htmlFor="PlotNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Plot Number
            </label>
            <input
              type="text"
              id="PlotNumber"
              name="PlotNumber"
              value={formData.PlotNumber}
              onChange={handleChange}
              className="input mt-1"
              placeholder="Assign a plot number"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input mt-1"
              placeholder="Create a password"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Submit
          </button>
          {backendError && (
            <div className="text-red-500 text-sm mt-2">{backendError}</div>
          )}
        </form>
      </div>
    </div>
  );
}

export default CustomerRegister;

