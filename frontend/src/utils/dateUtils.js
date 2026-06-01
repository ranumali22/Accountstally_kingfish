/**
 * Standardizes date formatting to DD/MM/YYYY across the application.
 * @param {Date|string} date - The date to format.
 * @returns {string} - Formatted date string (DD/MM/YYYY).
 */
export const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Converts a Date object to YYYY-MM-DD for backend/database storage.
 * @param {Date} dateObj - The JS Date object.
 * @returns {string} - Formatted date string (YYYY-MM-DD).
 */
export const toYYYYMMDD = (dateObj) => {
  if (!dateObj) return "";
  let d;

  if (dateObj instanceof Date) {
    d = dateObj;
    // If it's a JS Date, we usually want the local date parts (especially from DatePickers)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } else if (typeof dateObj === "number") {
    // Excel Serial Date (Roughly between 1900 and 2100)
    if (dateObj > 10000 && dateObj < 100000) {
      // Use UTC to avoid timezone shift for Excel dates
      d = new Date((dateObj - 25569) * 86400 * 1000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } else {
      d = new Date(dateObj);
    }
  } else if (typeof dateObj === "string") {
    const s = dateObj.trim();
    // 1. Standard ISO or YYYY-MM-DD
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Direct return for YYYY-MM-DD to avoid timezone shifts from Date constructor
      const [y, m, d] = s.split(/[-/]/);
      return `${y}-${m.padStart(2, "0")}-${d.slice(0, 2).padStart(2, "0")}`;
    } else {
      // 2. Match DD/MM/YYYY or MM/DD/YYYY (supports 2 or 4 digit years)
      const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
      if (parts) {
        let d1 = Number(parts[1]);
        let d2 = Number(parts[2]);
        let year = Number(parts[3]);

        if (year < 100) year += 2000; 

        let day, month;
        if (d1 > 12) {
          // d1 is day, d2 is month
          day = d1;
          month = d2;
        } else if (d2 > 12) {
          // d2 is day, d1 is month
          day = d2;
          month = d1;
        } else {
          // Ambiguous (both <= 12). Prioritize DD/MM/YYYY (India standard)
          day = d1;
          month = d2;
        }
        d = new Date(year, month - 1, day);
      } else {
        d = new Date(s);
      }
    }
  } else {
    d = new Date(dateObj);
  }

  if (isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
