export interface BrandConfig {
  brandName: string;
  brandLogo: string;
  brandIcon: string;
  brandColor: string;
  autoRegisterSn: boolean;
}

function getBrandSetting(key: string): string | undefined {
  // Dynamic lookup keeps legacy NEXT_PUBLIC_* values runtime-bound on the server.
  const env = process.env;
  const legacyName = env.NEXT_PUBLIC_BRAND_NAME;
  const sameBrand = !env.BRAND_NAME || !legacyName || env.BRAND_NAME.toUpperCase() === legacyName.toUpperCase();
  return env[key] || (sameBrand ? env[`NEXT_PUBLIC_${key}`] : undefined);
}

export function getBrandName(): string {
  return getBrandSetting("BRAND_NAME") || "MGM";
}

export function getBrandLogo(): string {
  return getBrandSetting("BRAND_LOGO") || (getBrandName().toUpperCase() === "CMC" ? "/logo-cmc.png" : "/logo-mgm.png");
}

export function getBrandIcon(): string {
  return getBrandSetting("BRAND_ICON") || (getBrandName().toUpperCase() === "CMC" ? "/icon-cmc.png" : "/icon-mgm.png");
}

export function getBrandColor(): string {
  return getBrandSetting("BRAND_COLOR") || (getBrandName().toUpperCase() === "CMC" ? "red" : "blue");
}

export function getBrandConfig(): BrandConfig {
  return {
    brandName: getBrandName(),
    brandLogo: getBrandLogo(),
    brandIcon: getBrandIcon(),
    brandColor: getBrandColor(),
    autoRegisterSn: isAutoRegisterSn(),
  };
}

export function isAutoRegisterSn(): boolean {
  return process.env.AUTO_REGISTER_SN !== "false";
}

export function getRedisPrefix(): string {
  return process.env.REDIS_PREFIX || "psa:mgm:";
}

export function getSyncRedisPrefix(): string {
  return process.env.SYNC_REDIS_PREFIX || getRedisPrefix();
}

export function getMachineLatestRedisKey(serialNumber: string): string {
  const prefixStr = getSyncRedisPrefix();
  const prefix = prefixStr.endsWith(":") ? prefixStr : `${prefixStr}:`;
  return `${prefix}machine:latest:${serialNumber}`;
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
