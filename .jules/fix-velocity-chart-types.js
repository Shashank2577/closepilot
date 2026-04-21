import fs from 'fs';
const webPath = 'packages/web/components/dashboard/VelocityChart.tsx';
let code = fs.readFileSync(webPath, 'utf-8');
code = code.replace(
  "formatter={(value: number) => [`${value} days`, 'Average Time']}",
  "formatter={(value: any) => [`${value} days`, 'Average Time']}"
);
fs.writeFileSync(webPath, code);
