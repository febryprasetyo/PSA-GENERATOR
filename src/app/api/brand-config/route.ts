import { NextResponse } from "next/server";

export async function GET() {
  const brandName = process.env.BRAND_NAME || process.env.NEXT_PUBLIC_BRAND_NAME || "MGM";
  const brandLogo = process.env.BRAND_LOGO || process.env.NEXT_PUBLIC_BRAND_LOGO || "/logo-mgm.png";
  const brandIcon = process.env.BRAND_ICON || process.env.NEXT_PUBLIC_BRAND_ICON || "/icon-mgm.png";
  const brandColor = process.env.BRAND_COLOR || process.env.NEXT_PUBLIC_BRAND_COLOR || "blue";
  const autoRegisterSn = process.env.AUTO_REGISTER_SN !== "false";

  return NextResponse.json({
    brandName,
    brandLogo,
    brandIcon,
    brandColor,
    autoRegisterSn,
  });
}
