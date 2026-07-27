"use client";

import { useEffect, useState } from "react";

export interface BrandConfig {
  brandName: string;
  brandLogo: string;
  brandIcon: string;
  brandColor: string;
  autoRegisterSn: boolean;
}

const defaultConfig: BrandConfig = {
  brandName: "MGM",
  brandLogo: "/logo-mgm.png",
  brandIcon: "/icon-mgm.png",
  brandColor: "blue",
  autoRegisterSn: true,
};

export function useBrand() {
  const [config, setConfig] = useState<BrandConfig>(defaultConfig);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/brand-config")
      .then((res) => res.json())
      .then((data: Partial<BrandConfig>) => {
        if (isMounted && data.brandName) {
          setConfig({
            brandName: data.brandName || "MGM",
            brandLogo: data.brandLogo || "/logo-mgm.png",
            brandIcon: data.brandIcon || "/icon-mgm.png",
            brandColor: data.brandColor || "blue",
            autoRegisterSn: data.autoRegisterSn !== false,
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return config;
}
