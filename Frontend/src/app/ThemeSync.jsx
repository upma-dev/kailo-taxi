import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { syncThemeForPath } from "../shared/utils/theme.js";

export default function ThemeSync() {
  const location = useLocation();
  const pathname = location.pathname;

  useLayoutEffect(() => {
    syncThemeForPath(pathname);
  }, [pathname]);

  useEffect(() => {
    const handlePageshow = () => syncThemeForPath(pathname);

    window.addEventListener("pageshow", handlePageshow);
    return () => window.removeEventListener("pageshow", handlePageshow);
  }, [pathname]);

  return null;
}
