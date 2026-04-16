export function selectTemplate(services: string[], complexity: 'low' | 'medium' | 'high'): string {
  // Mock template selection logic

  if (complexity === 'high') {
    return 'template_enterprise_comprehensive';
  }

  const hasWeb = services.includes('Web Development');
  const hasMobile = services.includes('Mobile App Development');
  const hasDesign = services.includes('UI/UX Design');

  if (hasWeb && hasMobile) {
    return 'template_omnichannel_standard';
  } else if (hasWeb) {
    return 'template_web_standard';
  } else if (hasMobile) {
    return 'template_mobile_standard';
  } else if (hasDesign && services.length === 1) {
    return 'template_design_only';
  }

  return 'template_general_services';
}
