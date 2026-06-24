/**
 * Calculate expiry date by adding 7 days to the receipt date
 * Token expires at the end of the 7th day (midnight starting the 8th day)
 * @param {Date|string} fromDate - The starting date
 * @returns {Date} - The expiry date (7 days later at 12:00 AM)
 */
export const getExpiryDate = (fromDate) => {
  // Parse date string properly to avoid timezone issues
  let date;
  if (typeof fromDate === 'string') {
    // If it's a string like "2025-11-03", parse it as local date
    const parts = fromDate.split('-');
    if (parts.length === 3) {
      date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      date = new Date(fromDate);
    }
  } else {
    date = new Date(fromDate);
  }
  
  // Add 6 days
  const expiryDate = new Date(date);
  expiryDate.setDate(date.getDate() + 6);
  
  // Set time to 12:00 AM (midnight)
  expiryDate.setHours(0, 0, 0, 0);
  
  return expiryDate;
};

/**
 * Format date for input field (YYYY-MM-DD) - handles timezone properly
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get day name from date
 * @param {Date|string} date - The date
 * @returns {string} - Day name (e.g., "Sunday", "Monday")
 */
export const getDayName = (date) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(date);
  return dayNames[d.getDay()];
};

/**
 * Calculate token expiry date with explanation (7-day rule - expires at end of 7th day)
 * @param {Date|string} receiptDate - The receipt date
 * @returns {Object} - Object with expiryDate and explanation
 */
export const calculateTokenExpiry = (receiptDate) => {
  const expiryDate = getExpiryDate(receiptDate);
  const receiptDayName = getDayName(receiptDate);
  const expiryDayName = getDayName(expiryDate);
  
  const receiptDateObj = new Date(receiptDate);
  const receiptDay = receiptDateObj.getDate();
  const expiryDay = expiryDate.getDate();
  
  return {
    expiryDate,
    expiryDateString: formatDateForInput(expiryDate),
    explanation: `Receipt created on ${receiptDay} (${receiptDayName}), expires at end of ${expiryDay} (${expiryDayName}) at midnight`
  };
};