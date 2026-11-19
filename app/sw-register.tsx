"use client";
import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const vv = window.visualViewport;
      root.style.setProperty("--app-h", `${vv?.height ?? window.innerHeight}px`);
      root.style.setProperty("--app-top", `${vv?.offsetTop ?? 0}px`);
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);
  return null;
}
