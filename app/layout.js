import "./globals.css";

export const metadata = {
  title: "Sound Brief Board",
  description: "A small full-stack board for saving and managing sound ideas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
