import localFont from "next/font/local";

/** Chivo is the shirt's typeface, on screen and in print. */
export const chivo = localFont({
  src: "../fonts/Chivo-Regular.ttf",
  weight: "400",
  variable: "--font-chivo",
  display: "swap",
  preload: true,
});
