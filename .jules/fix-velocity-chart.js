import fs from 'fs';
const webPath = 'packages/web/components/dashboard/VelocityChart.tsx';
let code = fs.readFileSync(webPath, 'utf-8');
code = code.replace(
  "const response = await fetch('http://localhost:3001/api/analytics/velocity');",
  "const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/analytics/velocity`);"
);
fs.writeFileSync(webPath, code);
