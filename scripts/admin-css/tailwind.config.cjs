module.exports = {
  darkMode: 'class',
  content: ['./admin/index.html', './admin/admin.js', './admin/cms/cms.js', './admin/suite-live.js'],
  theme: {
    extend: {
      colors: {
        brand: { navy: '#081220', slate: '#0f172a', card: '#131f36', border: '#1e2e4a', emerald: '#0fa968', emeraldHover: '#0d9259', amber: '#f59e0b', crimson: '#ef4444', cyan: '#06b6d4', indigo: '#6366f1' }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      }
    }
  },
  corePlugins: {},
  plugins: []
};
