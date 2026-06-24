import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  Key,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usersAPI, authAPI } from "../utils/api";
import {
  formatDate,
  formatCurrency,
} from "../utils/helpers";
import DataTable from "../components/UI/DataTable";
import Modal from "../components/UI/Modal";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import toast from "react-hot-toast";

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCustomPwd, setShowCustomPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    if (user?.role === "Admin") {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (userToReset) => {
    // Show additional warning for admin-to-admin password resets
    if (userToReset.role === 'Admin') {
      const confirmReset = window.confirm(
        `⚠️ SECURITY WARNING ⚠️\n\nYou are about to reset another administrator's password.\n\nUser: ${userToReset.fullName} (${userToReset.username})\n\nThis action will be logged for security purposes.\n\nAre you sure you want to continue?`
      );
      if (!confirmReset) {
        return;
      }
    }
    
    setResetPasswordUser(userToReset);
    setCustomPassword("");
    setConfirmPassword("");
    setShowCustomPwd(false);
    setShowConfirmPwd(false);
    setShowResetPasswordModal(true);
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordUser) return;

    if (customPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (customPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setResettingPassword(true);
      await authAPI.adminResetPassword({
        userId: resetPasswordUser.id,
        newPassword: customPassword,
      });
      toast.success(`Password changed successfully for ${resetPasswordUser.fullName}`);
      closeResetPasswordModal();
    } catch (error) {
      console.error("Error resetting password:", error);
      const errorMessage = error.response?.data?.message || "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setResettingPassword(false);
    }
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetPasswordUser(null);
    setCustomPassword("");
    setConfirmPassword("");
    setShowCustomPwd(false);
    setShowConfirmPwd(false);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await usersAPI.updateUser(userId, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const columns = [
    {
      key: "id",
      title: "ID",
      sortable: true,
    },
    {
      key: "fullName",
      title: "Full Name",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-gray-500 text-xs">@{row.username}</p>
        </div>
      ),
    },
    {
      key: "email",
      title: "Email & Mobile",
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{value}</p>
          {row.mobile && (
            <p className="text-gray-500 text-xs">{row.mobile}</p>
          )}
        </div>
      ),
    },
    {
      key: "role",
      title: "Role",
      sortable: true,
      render: (value) => (
        <span className={`badge ${
          value === 'Admin' ? 'badge-danger' : 
          value === 'Associate' ? 'badge-primary' : 'badge-secondary'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: "isActive",
      title: "Status",
      sortable: true,
      render: (value) => (
        <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: "receiptCount",
      title: "Activity",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{value} receipts</p>
          {row.totalSales > 0 && (
            <p className="text-gray-500 text-xs">
              Sales: {formatCurrency(row.totalSales)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Created Date",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedUser(row);
              setShowUserModal(true);
            }}
            className="text-primary-600 hover:text-primary-900"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => handleResetPassword(row)}
            className="text-orange-600 hover:text-orange-900"
            title="Reset Password"
          >
            <Key className="h-4 w-4" />
          </button>
          
          {/* Only show activate/deactivate for non-admin users or if it's not the current user */}
          {(row.role !== 'Admin' || row.id !== user?.userId) && (
            <button
              onClick={() => toggleUserStatus(row.id, row.isActive)}
              className={`${
                row.isActive 
                  ? 'text-red-600 hover:text-red-900' 
                  : 'text-green-600 hover:text-green-900'
              }`}
              title={row.isActive ? 'Deactivate User' : 'Activate User'}
            >
              {row.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (user?.role !== "Admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500">Only administrators can access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage system users and reset passwords
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        searchable={true}
        filterable={false}
      />

      {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile
                </label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.mobile || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <span className={`badge ${
                  selectedUser.role === 'Admin' ? 'badge-danger' : 
                  selectedUser.role === 'Associate' ? 'badge-primary' : 'badge-secondary'
                } mt-1`}>
                  {selectedUser.role}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <span className={`badge ${selectedUser.isActive ? 'badge-success' : 'badge-danger'} mt-1`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Receipts Created
                </label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.receiptCount} receipts</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Sales
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedUser.totalSales > 0 ? formatCurrency(selectedUser.totalSales) : 'No sales'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Created Date
                </label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeResetPasswordModal}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-lg">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Key className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Reset Password
                    </h3>
                    <div className="mt-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                        <div className="text-sm">
                          <p className="font-medium text-blue-800">User Details:</p>
                          <p className="text-blue-700">• Name: {resetPasswordUser.fullName}</p>
                          <p className="text-blue-700">• Username: {resetPasswordUser.username}</p>
                          <p className="text-blue-700">• Email: {resetPasswordUser.email}</p>
                          <p className="text-blue-700">• Role: {resetPasswordUser.role}</p>
                        </div>
                      </div>

                      {/* New Password */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enter New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCustomPwd ? "text" : "password"}
                            value={customPassword}
                            onChange={(e) => setCustomPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCustomPwd(!showCustomPwd)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            {showCustomPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Re-enter New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPwd ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Enter the same password again"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        The user's old password will stop working immediately after this change.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmResetPassword}
                  disabled={resettingPassword}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {resettingPassword ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeResetPasswordModal}
                  disabled={resettingPassword}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;