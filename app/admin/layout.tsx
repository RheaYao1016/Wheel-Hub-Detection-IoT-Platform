"use client";
import Footer from "../components/Layout/Footer";
import AccountMenu from "../components/Layout/AccountMenu";
export default function AdminLayout({children}: {children:React.ReactNode}) {
  return (
    <>
      {/* 继承根布局的导航，仅在右上角展示账号菜单 */}
      <div className="max-w-screen-2xl mx-auto px-3 py-2 flex justify-end"><AccountMenu /></div>
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
    </>
  );
}
