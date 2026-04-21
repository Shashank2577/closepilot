import fs from 'fs';
const pagePath = 'packages/web/app/page.tsx';
let code = fs.readFileSync(pagePath, 'utf-8');
code = code.replace(
  `      {/* Pipeline Velocity */}
      <div className="mb-8">
        <VelocityChart />
      </div>`,
  `      {/* Pipeline Velocity */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pipeline Velocity</h2>
        <VelocityChart />
      </section>`
);
fs.writeFileSync(pagePath, code);
