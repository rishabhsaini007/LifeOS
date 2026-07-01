/**
 * Formats a Date object or date-string into a local YYYY-MM-DD format,
 * respecting the system's local time zone instead of falling back to UTC.
 */
export const getLocalDateString = (dateInput?: Date | string): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  
  // If parsing a YYYY-MM-DD string, browsers might parse it as UTC midnight.
  // We want to extract the local parts or handle string splitting directly if it's already YYYY-MM-DD.
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the current time as HH:MM string in local time.
 */
export const getLocalTimeString = (dateInput?: Date): string => {
  const date = dateInput || new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
