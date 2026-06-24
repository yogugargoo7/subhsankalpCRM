// CSV Utilities for processing plot data

/**
 * Helper function to handle empty values - defaults to "NA" if empty, otherwise returns the value
 */
const handleEmptyValue = (value, defaultValue = "NA") => {
  if (!value || value.trim() === "" || value.toLowerCase() === "null" || value.toLowerCase() === "undefined") {
    return defaultValue;
  }
  return value.trim();
};

/**
 * Helper function to parse boolean values from CSV
 */
const parseBooleanValue = (value) => {
  if (!value || value.trim() === "") return false;
  const cleanValue = value.toLowerCase().trim();
  return cleanValue === "yes" || cleanValue === "true" || cleanValue === "1";
};

/**
 * Parse CSV data to plot format - Enhanced to handle empty values with NA defaults
 */
export const parseCSVToPlotData = (csvText) => {
  console.log('Raw CSV text:', csvText.substring(0, 500)); // Debug log
  
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    console.log('Not enough lines in CSV');
    return [];
  }

  const plots = [];
  
  // Skip header line and process data lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    console.log(`Processing line ${i}:`, line); // Debug log

    // Parse CSV values - handle quoted values and commas properly
    let values = [];
    
    // Method 1: Split by comma (handle quoted values)
    if (line.includes(',')) {
      // Simple CSV parsing - split by comma but handle basic cases
      const parts = line.split(',');
      values = parts.map(v => v.trim().replace(/^["']|["']$/g, '')); // Remove quotes
    }
    // Method 2: Split by tab
    else if (line.includes('\t')) {
      values = line.split('\t').map(v => v.trim());
    }
    // Method 3: Split by multiple spaces (for space-separated data)
    else {
      values = line.split(/\s+/).filter(v => v.trim());
    }

    console.log(`Parsed values for line ${i}:`, values); // Debug log

    if (values.length < 4) {
      console.log(`Skipping line ${i} - not enough values`);
      continue;
    }

    // Expected CSV format based on your data:
    // Plot Number, Block, Length, Width, Plot Size, Road, PLC Applicable, PLC Type, Facing, Registered Company, Gata/Khesra, Available, Basic Rate
    
    const plot = {
      plotNumber: handleEmptyValue(values[0], ""),
      block: handleEmptyValue(values[1]),
      length: handleEmptyValue(values[2], "0"),
      width: handleEmptyValue(values[3], "0"),
      plotSize: handleEmptyValue(values[4]),
      road: handleEmptyValue(values[5]),
      plcApplicable: parseBooleanValue(values[6]),
      typeofPLC: handleEmptyValue(values[7]),
      facing: handleEmptyValue(values[8]),
      registeredCompany: handleEmptyValue(values[9]),
      gataKhesraNo: handleEmptyValue(values[10]),
      availablePlot: values[11] ? parseBooleanValue(values[11]) : true, // Default to true if not specified
      basicRate: handleEmptyValue(values[12], "0"),
      description: handleEmptyValue(values[13] || "")
    };

    // Clean up specific field formats
    
    // Handle Plot Number - ensure it's not empty
    if (!plot.plotNumber || plot.plotNumber === "NA") {
      console.log(`Skipping line ${i} - missing plot number`);
      continue;
    }

    // Handle numeric fields - convert NA to 0 for calculations
    if (plot.length === "NA") plot.length = "0";
    if (plot.width === "NA") plot.width = "0";
    if (plot.basicRate === "NA") plot.basicRate = "0";

    // Handle facing direction - convert abbreviated forms
    if (plot.facing && plot.facing !== "NA") {
      const facing = plot.facing.toLowerCase().trim();
      
      // Single directions
      if (facing === 'n' || facing === 'north') plot.facing = 'North';
      else if (facing === 's' || facing === 'south') plot.facing = 'South';
      else if (facing === 'e' || facing === 'east') plot.facing = 'East';
      else if (facing === 'w' || facing === 'west') plot.facing = 'West';
      
      // Two-side combinations
      else if (facing === 'ne' || facing === 'n-e' || facing === 'northeast' || facing === 'north east') plot.facing = 'North East';
      else if (facing === 'nw' || facing === 'n-w' || facing === 'northwest' || facing === 'north west') plot.facing = 'North West';
      else if (facing === 'se' || facing === 's-e' || facing === 'southeast' || facing === 'south east') plot.facing = 'South East';
      else if (facing === 'sw' || facing === 's-w' || facing === 'southwest' || facing === 'south west') plot.facing = 'South West';
      
      // Three-side combinations
      else if (facing === 'ewn' || facing === 'e-w-n' || facing === 'east west north' || facing === 'east-west-north') plot.facing = 'East West North (3-Side)';
      else if (facing === 'nse' || facing === 'n-s-e' || facing === 'north south east' || facing === 'north-south-east') plot.facing = 'North South East (3-Side)';
      else if (facing === 'nsw' || facing === 'n-s-w' || facing === 'north south west' || facing === 'north-south-west') plot.facing = 'North South West (3-Side)';
      else if (facing === 'ews' || facing === 'e-w-s' || facing === 'east west south' || facing === 'east-west-south') plot.facing = 'East West South (3-Side)';
    }

    // Handle PLC Type - if PLC not applicable, set type to NA
    if (!plot.plcApplicable && plot.typeofPLC !== "NA") {
      plot.typeofPLC = "NA";
    }

    console.log(`Created plot for line ${i}:`, plot); // Debug log
    plots.push(plot);
  }

  console.log('Final parsed plots:', plots); // Debug log
  return plots;
};

/**
 * Validate plot data - Enhanced to handle NA values properly
 */
export const validatePlotData = (plots) => {
  const errors = [];
  const warnings = [];

  plots.forEach((plot, index) => {
    const rowNum = index + 1;
    
    // Critical errors (will prevent creation)
    if (!plot.plotNumber || plot.plotNumber.trim() === '' || plot.plotNumber === 'NA') {
      errors.push(`Row ${rowNum}: Plot number is required and cannot be NA`);
    }
    
    // Basic rate is required and must be a valid number > 0
    const basicRate = parseFloat(plot.basicRate);
    if (!plot.basicRate || plot.basicRate === 'NA' || isNaN(basicRate) || basicRate <= 0) {
      errors.push(`Row ${rowNum}: Valid basic rate is required (got: ${plot.basicRate})`);
    }
    
    // Warnings (won't prevent creation but should be noted)
    if (!plot.plotSize || plot.plotSize.trim() === '' || plot.plotSize === 'NA') {
      warnings.push(`Row ${rowNum}: Plot size is missing or NA`);
    }
    
    if (!plot.block || plot.block.trim() === '' || plot.block === 'NA') {
      warnings.push(`Row ${rowNum}: Block is missing or NA`);
    }
    
    if (!plot.facing || plot.facing.trim() === '' || plot.facing === 'NA') {
      warnings.push(`Row ${rowNum}: Facing direction is missing or NA`);
    }
    
    if (!plot.registeredCompany || plot.registeredCompany.trim() === '' || plot.registeredCompany === 'NA') {
      warnings.push(`Row ${rowNum}: Registered company is missing or NA`);
    }

    if (!plot.road || plot.road.trim() === '' || plot.road === 'NA') {
      warnings.push(`Row ${rowNum}: Road information is missing or NA`);
    }

    if (!plot.gataKhesraNo || plot.gataKhesraNo.trim() === '' || plot.gataKhesraNo === 'NA') {
      warnings.push(`Row ${rowNum}: Gata/Khesra number is missing or NA`);
    }

    // Check for numeric fields that should be numbers
    const length = parseFloat(plot.length);
    const width = parseFloat(plot.width);
    
    if (plot.length !== 'NA' && plot.length !== '0' && (isNaN(length) || length <= 0)) {
      warnings.push(`Row ${rowNum}: Length should be a valid number (got: ${plot.length})`);
    }
    
    if (plot.width !== 'NA' && plot.width !== '0' && (isNaN(width) || width <= 0)) {
      warnings.push(`Row ${rowNum}: Width should be a valid number (got: ${plot.width})`);
    }
  });

  return { errors, warnings };
};