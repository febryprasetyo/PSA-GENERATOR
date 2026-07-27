export function getBrandName(): string {
  return process.env.BRAND_NAME || process.env.NEXT_PUBLIC_BRAND_NAME || "MGM";
}

export function getBrandLogo(): string {
  return process.env.BRAND_LOGO || process.env.NEXT_PUBLIC_BRAND_LOGO || "/logo-mgm.png";
}

export function getBrandIcon(): string {
  return process.env.BRAND_ICON || process.env.NEXT_PUBLIC_BRAND_ICON || "/icon-mgm.png";
}

export function getBrandColor(): string {
  return process.env.BRAND_COLOR || process.env.NEXT_PUBLIC_BRAND_COLOR || "blue";
}

export function isAutoRegisterSn(): boolean {
  return process.env.AUTO_REGISTER_SN !== "false";
}

export function getRedisPrefix(): string {
  return process.env.REDIS_PREFIX || "psa:mgm:";
}

// Deprecated static fallbacks for backwards compatibility
export const BRAND_NAME = getBrandName();
export const BRAND_LOGO = getBrandLogo();
export const BRAND_ICON = getBrandIcon();
export const BRAND_COLOR = getBrandColor();
export const AUTO_REGISTER_SN = isAutoRegisterSn();
export const REDIS_PREFIX = getRedisPrefix();

export function getRedisKey(key: string): string {
  const prefixStr = getRedisPrefix();
  const prefix = prefixStr.endsWith(":") ? prefixStr : `${prefixStr}:`;
  return `${prefix}${key.replace(/^psa:/, "")}`;
}
