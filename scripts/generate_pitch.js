const PptxGenJS = require('pptxgenjs');

const pres = new PptxGenJS();

// Define Colors
const NAVY = '0F172A';
const BLUE = '2563EB';
const ORANGE = 'F97316';
const WHITE = 'FFFFFF';
const TEXT = '1E293B';

// 1. Title Slide
let slide1 = pres.addSlide();
slide1.background = { color: NAVY };
slide1.addText('CLOSEPILOT', { 
    x: 0.5, y: 1.5, w: '90%', 
    fontSize: 60, bold: true, color: WHITE, 
    align: 'center', fontFace: 'Arial' 
});
slide1.addText('The Future of Autonomous B2B Deal Flow', { 
    x: 0.5, y: 3.0, w: '90%', 
    fontSize: 24, color: BLUE, 
    align: 'center' 
});

// 2. The Problem
let slide2 = pres.addSlide();
slide2.addText('The $100B Leak in Sales Ops', { 
    x: 0.5, y: 0.5, w: '90%', 
    fontSize: 36, bold: true, color: NAVY 
});
slide2.addText('• 60% of leads are lost due to slow response times\n• Sales teams spend 40% of their time on admin tasks\n• CRM data is often incomplete or outdated', { 
    x: 0.5, y: 2.0, w: '90%', 
    fontSize: 20, color: TEXT 
});

// 3. The Solution
let slide3 = pres.addSlide();
slide3.addText('Closepilot: Your AI Sales Workforce', { 
    x: 0.5, y: 0.5, w: '90%', 
    fontSize: 36, bold: true, color: NAVY 
});
slide3.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.5, w: 2.5, h: 2.5, fill: { color: BLUE } });
slide3.addText('Ingest', { x: 0.5, y: 2.5, w: 2.5, align: 'center', color: WHITE, bold: true });

slide3.addShape(pres.ShapeType.rect, { x: 3.5, y: 1.5, w: 2.5, h: 2.5, fill: { color: NAVY } });
slide3.addText('Enrich', { x: 3.5, y: 2.5, w: 2.5, align: 'center', color: WHITE, bold: true });

slide3.addShape(pres.ShapeType.rect, { x: 6.5, y: 1.5, w: 2.5, h: 2.5, fill: { color: ORANGE } });
slide3.addText('Close', { x: 6.5, y: 2.5, w: 2.5, align: 'center', color: WHITE, bold: true });

// 4. How it Works
let slide4 = pres.addSlide();
slide4.addText('Production Hardened Architecture', { 
    x: 0.5, y: 0.5, w: '90%', 
    fontSize: 36, bold: true, color: NAVY 
});
slide4.addText('• Multi-Agent Orchestration\n• Model Context Protocol (MCP) Integration\n• Real-time Human-in-the-Loop Dashboard\n• Enterprise-grade Security Middleware', { 
    x: 0.5, y: 2.0, w: '90%', 
    fontSize: 20, color: TEXT 
});

// 5. Contact / Next Steps
let slide5 = pres.addSlide();
slide5.background = { color: BLUE };
slide5.addText('Ready to Automate Your Pipeline?', { 
    x: 0.5, y: 2.0, w: '90%', 
    fontSize: 44, bold: true, color: WHITE, align: 'center' 
});
slide5.addText('Learn more at closepilot.io', { 
    x: 0.5, y: 3.5, w: '90%', 
    fontSize: 24, color: WHITE, align: 'center' 
});

pres.writeFile({ fileName: 'Closepilot_Pitch_Deck.pptx' });
