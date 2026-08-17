export function formatPhoneNumber(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  let digits = cleaned;
  if (digits.startsWith("84") && digits.length === 11) {
    digits = "0" + digits.slice(2);
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
  }
  return phone;
}

export function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return "";
  // If it has space like "15/10/2023 09:30", extract just the date part
  const parts = dateStr.trim().split(/\s+/);
  return parts[0] || dateStr;
}
