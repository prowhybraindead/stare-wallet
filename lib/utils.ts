import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency Formatter - Defaulted to VND
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// Safe Date Formatter
export function formatDate(dateString: string | Date | undefined | null) {
  if (!dateString) return "N/A";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  } catch (e) {
    return "Invalid Date";
  }
}

// Deep Serialization for Firebase Data (Strips non-plain objects)
export function serializeFirestoreData(data: any): any {
  if (data === null || data === undefined) return data;

  // Handle Firebase Timestamp
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }

  // Handle regular Objects
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const key in data) {
      serialized[key] = serializeFirestoreData(data[key]);
    }
    return serialized;
  }

  // Return primitive types
  return data;
}

export function generateCardNumber(): string {
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 9000 + 1000).toString()
  ).join(" ");
}

export function maskCardNumber(cardNumber: string): string {
  const parts = cardNumber.split(" ");
  return parts.map((p, i) => (i === parts.length - 1 ? p : "****")).join(" ");
}

export function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
