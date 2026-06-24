import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Save } from "lucide-react";
import { plotsAPI } from "../../utils/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import toast from "react-hot-toast";

const EditPlotForm = ({ isOpen, onClose, onSuccess, plot }) => {
  const [loading, setLoading] = useState(false);
  const [customFacing, setCustomFacing] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm();

  const watchedFacing = watch("facing");

  useEffect(() => {
    if (isOpen && plot) {
      // Pre-populate form with plot data
      setValue("block", plot.block || "");
      setValue("length", plot.length || "");
      setValue("width", plot.width || "");
      setValue("area", plot.area || "");
      setValue("plotSize", plot.plotSize || "");
      setValue("basicRate", plot.basicRate || "");
      setValue("road", plot.road || "");
      setValue("plcApplicable", plot.plcApplicable || false);
      setValue("typeofPLC", plot.typeofPLC || "");
      
      // Handle facing - check if it's a predefined value or custom
      const predefinedFacings = [
        "North", "South", "East", "West",
        "North-East", "North-West", "South-East", "South-West",
        "East West North", "North South East", "North South West", "East West South"
      ];
      
      if (plot.facing && !predefinedFacings.includes(plot.facing)) {
        setCustomFacing(plot.facing);
        setValue("facing", "custom");
      } else {
        setValue("facing", plot.facing || "");
        setCustomFacing("");
      }
      
      setValue("registeredCompany", plot.registeredCompany || "");
      setValue("gataKhesraNo", plot.gataKhesraNo || "");
      setValue("availablePlot", plot.availablePlot || false);
      setValue("description", plot.description || "");
      setValue("status", plot.status || "Available");
    }
  }, [isOpen, plot, setValue]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Prepare update data (only send non-empty values)
      const updateData = {};
      
      if (data.block?.trim()) updateData.block = data.block.trim();
      if (data.length) updateData.length = parseFloat(data.length);
      if (data.width) updateData.width = parseFloat(data.width);
      if (data.area) updateData.area = parseFloat(data.area);
      if (data.plotSize?.trim()) updateData.plotSize = data.plotSize.trim();
      if (data.basicRate) updateData.basicRate = parseFloat(data.basicRate);
      if (data.road?.trim()) updateData.road = data.road.trim();
      updateData.plcApplicable = data.plcApplicable;
      if (data.typeofPLC?.trim()) updateData.typeofPLC = data.typeofPLC.trim();
      
      // Handle facing - use custom value if "custom" is selected
      if (data.facing === "custom" && customFacing?.trim()) {
        updateData.facing = customFacing.trim();
      } else if (data.facing?.trim()) {
        updateData.facing = data.facing.trim();
      }
      
      if (data.registeredCompany?.trim()) updateData.registeredCompany = data.registeredCompany.trim();
      if (data.gataKhesraNo?.trim()) updateData.gataKhesraNo = data.gataKhesraNo.trim();
      updateData.availablePlot = data.availablePlot;
      if (data.description?.trim()) updateData.description = data.description.trim();
      if (data.status?.trim()) updateData.status = data.status.trim();

      await plotsAPI.updatePlot(plot.id, updateData);
      
      toast.success("Plot updated successfully");
      reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error updating plot:", error);
      toast.error("Failed to update plot");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !plot) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Edit Plot Details
              </h3>
              <div className="mt-1 flex items-center space-x-2">
                <span className="text-sm text-gray-500">Plot:</span>
                <span className="text-lg font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded">
                  {plot.siteName} - {plot.plotNumber}
                </span>
                <span className={`badge ${
                  plot.status === 'Available' ? 'badge-success' :
                  plot.status === 'Booked' ? 'badge-warning' :
                  plot.status === 'Sold' ? 'badge-danger' : 'badge-info'
                }`}>
                  {plot.status}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Block
                  </label>
                  <input
                    {...register("block")}
                    type="text"
                    className="input"
                    placeholder="Enter block"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plot Size
                  </label>
                  <input
                    {...register("plotSize")}
                    type="text"
                    className="input"
                    placeholder="e.g., 120 sq yard"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Basic Rate (₹/sq yard) *
                  </label>
                  <input
                    {...register("basicRate", {
                      required: "Basic rate is required",
                      min: { value: 0, message: "Basic rate must be positive" }
                    })}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Enter rate per sq yard"
                  />
                  {errors.basicRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.basicRate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Dimensions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Length (ft)
                  </label>
                  <input
                    {...register("length")}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Enter length"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (ft)
                  </label>
                  <input
                    {...register("width")}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Enter width"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area (sq ft)
                  </label>
                  <input
                    {...register("area")}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Enter area"
                  />
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Location Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Road
                  </label>
                  <input
                    {...register("road")}
                    type="text"
                    className="input"
                    placeholder="Enter road details"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facing
                  </label>
                  <select
                    {...register("facing")}
                    className="input"
                    onChange={(e) => {
                      setValue("facing", e.target.value);
                      if (e.target.value !== "custom") {
                        setCustomFacing("");
                      }
                    }}
                  >
                    <option value="">Select facing</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North-East">North-East</option>
                    <option value="North-West">North-West</option>
                    <option value="South-East">South-East</option>
                    <option value="South-West">South-West</option>
                    <option value="East West North">East West North (3-Side)</option>
                    <option value="North South East">North South East (3-Side)</option>
                    <option value="North South West">North South West (3-Side)</option>
                    <option value="East West South">East West South (3-Side)</option>
                    <option value="custom">Custom (Enter below)</option>
                  </select>
                  
                  {(watchedFacing === "custom" || customFacing) && (
                    <input
                      type="text"
                      value={customFacing}
                      onChange={(e) => setCustomFacing(e.target.value)}
                      className="input mt-2"
                      placeholder="Enter custom facing"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* PLC Details */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                PLC Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      {...register("plcApplicable")}
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      PLC Applicable
                    </span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type of PLC
                  </label>
                  <input
                    {...register("typeofPLC")}
                    type="text"
                    className="input"
                    placeholder="Enter PLC type"
                  />
                </div>
              </div>
            </div>

            {/* Company & Legal Details */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Company & Legal Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registered Company
                  </label>
                  <input
                    {...register("registeredCompany")}
                    type="text"
                    className="input"
                    placeholder="Enter registered company name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gata Khesra No
                  </label>
                  <input
                    {...register("gataKhesraNo")}
                    type="text"
                    className="input"
                    placeholder="Enter Gata Khesra number"
                  />
                </div>
              </div>
            </div>

            {/* Status & Availability */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Status & Availability
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="input"
                  >
                    <option value="Available">Available</option>
                    <option value="Tokened">Tokened</option>
                    <option value="PartPayment">Part Payment</option>
                    <option value="Booked">Booked</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      {...register("availablePlot")}
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Available for Sale
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="input"
                placeholder="Enter plot description or additional notes"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
                disabled={isSubmitting || loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center"
                disabled={isSubmitting || loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Plot
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPlotForm;