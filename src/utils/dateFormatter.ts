/**
 * Formats a date to M/D/YYYY format consistently across the application
 * @param date - Date object or undefined (uses current date if undefined)
 * @returns Formatted date string in M/D/YYYY format
 */
export const formatDate = (date?: Date): string => {
  const d = date || new Date();
  const month = d.getMonth() + 1; // getMonth() returns 0-11
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};