export default function Footer() {
  return (
    <footer className="footer-shell">
      <div>
        <strong>Wheel Hub Detection Platform</strong>
        <span>Commercial packaging demo built on Next.js, Prisma, ECharts and Three.js.</span>
      </div>
      <div>
        <span>© {new Date().getFullYear()} 轮毂检测数字孪生平台</span>
        <span>项目合作 / 建议请联系：ruyiyao@stumail.ysu.edu.cn</span>
      </div>
    </footer>
  );
}
