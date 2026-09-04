/**
 * Project Dynamic Color & Gradient Utilities
 * Synchronized with MEPac Admin Console theme system.
 */

export function getProjectColor(projectId) {
  if (!projectId) return 'hsl(215, 65%, 45%)';
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

export function getProjectGradient(projectId) {
  if (!projectId) {
    return 'linear-gradient(135deg, hsl(215, 70%, 40%) 0%, hsl(235, 75%, 20%) 100%)';
  }
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 72%, 42%) 0%, hsl(${hue2}, 78%, 22%) 100%)`;
}
