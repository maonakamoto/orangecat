export function capitalize(str: string): string {
  if (!str) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function capitalizeWords(str: string): string {
  if (!str) {
    return str;
  }
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

export function getInitial(str: string | null | undefined, fallback = 'U'): string {
  return str?.charAt(0)?.toUpperCase() || fallback;
}

export function truncateAddress(address: string, startChars = 8, endChars = startChars): string {
  if (address.length <= startChars + endChars + 3) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
