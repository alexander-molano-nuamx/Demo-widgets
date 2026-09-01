import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Workstation",
  description: "Demo de Trading Workstation con @nuam/common-fe-lib-components",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
