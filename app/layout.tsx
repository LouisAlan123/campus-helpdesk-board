import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campus Help Desk Board",
  description: "Post and view campus help requests",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
