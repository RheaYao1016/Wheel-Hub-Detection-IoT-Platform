"use client";
import Footer from "../components/Layout/Footer";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
    </>
  );
}
