export function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDefaultYearToDateRange() {
  const today = new Date();

  const desde = new Date(today.getFullYear(), 0, 1);
  const hasta = today;

  return {
    desde: formatLocalDateYYYYMMDD(desde),
    hasta: formatLocalDateYYYYMMDD(hasta),
  };
}