export function getProjectColor(projectId) {
    if (!projectId) return 'var(--accent-blue)';
    
    // Simple hash function for the project ID
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
        hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to a hue (0-360)
    const hue = Math.abs(hash) % 360;
    
    // Return a nice vibrant pastel/solid color
    return `hsl(${hue}, 65%, 45%)`;
}
