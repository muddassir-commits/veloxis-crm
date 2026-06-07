const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  {
    path: path.join(__dirname, '../components/portal/client-reports-viewer.tsx'),
    replacements: [
      { from: /bg-white/g, to: 'bg-bg-light' },
      { from: /bg-gray-50/g, to: 'bg-bg-light' },
      { from: /bg-[#F8FAFF]/g, to: 'bg-bg-light' },
      { from: /bg-[#F1F5F9]/g, to: 'bg-bg-light' },
      { from: /bg-slate-100/g, to: 'bg-bg-light' },
      { from: /text-gray-900/g, to: 'text-text-primary' },
      { from: /text-gray-700/g, to: 'text-text-secondary' },
      { from: /text-gray-500/g, to: 'text-text-muted' },
      { from: /text-[#0A1628]/g, to: 'text-text-primary' },
      { from: /text-[#475569]/g, to: 'text-text-secondary' },
      { from: /text-[#94A3B8]/g, to: 'text-text-muted' },
      { from: /border-gray-200/g, to: 'border-border' },
      { from: /border-[#E2E8F4]/g, to: 'border-border' },
      { from: /border-[#F1F5F9]/g, to: 'border-border' },
      { from: /divide-[#E2E8F4]\/50/g, to: 'divide-border/50' }
    ]
  },
  {
    path: path.join(__dirname, '../components/portal/client-file-browser.tsx'),
    replacements: [
      { from: /bg-white/g, to: 'bg-bg-light' },
      { from: /bg-gray-50/g, to: 'bg-bg-light' },
      { from: /bg-[#F8FAFF]/g, to: 'bg-bg-light' },
      { from: /bg-[#F1F5F9]/g, to: 'bg-bg-light' },
      { from: /bg-slate-100/g, to: 'bg-bg-light' },
      { from: /text-gray-900/g, to: 'text-text-primary' },
      { from: /text-gray-700/g, to: 'text-text-secondary' },
      { from: /text-gray-500/g, to: 'text-text-muted' },
      { from: /text-[#0A1628]/g, to: 'text-text-primary' },
      { from: /text-[#475569]/g, to: 'text-text-secondary' },
      { from: /text-[#94A3B8]/g, to: 'text-text-muted' },
      { from: /border-gray-200/g, to: 'border-border' },
      { from: /border-[#E2E8F4]/g, to: 'border-border' },
      { from: /border-[#F1F5F9]/g, to: 'border-border' },
      { from: /divide-[#E2E8F4]\/50/g, to: 'divide-border/50' },
      { from: /divide-[#1E3352]\/30/g, to: 'divide-border/30' }
    ]
  },
  {
    path: path.join(__dirname, '../components/portal/portal-header.tsx'),
    replacements: [
      { from: /bg-white/g, to: 'bg-bg-light' },
      { from: /bg-gray-50/g, to: 'bg-bg-light' },
      { from: /bg-[#F8FAFF]/g, to: 'bg-bg-light' },
      { from: /bg-[#F1F5F9]/g, to: 'bg-bg-light' },
      { from: /bg-slate-100/g, to: 'bg-bg-light' },
      { from: /text-gray-900/g, to: 'text-text-primary' },
      { from: /text-gray-700/g, to: 'text-text-secondary' },
      { from: /text-gray-500/g, to: 'text-text-muted' },
      { from: /text-[#0A1628]/g, to: 'text-text-primary' },
      { from: /text-[#475569]/g, to: 'text-text-secondary' },
      { from: /text-[#94A3B8]/g, to: 'text-text-muted' },
      { from: /border-gray-200/g, to: 'border-border' },
      { from: /border-[#E2E8F4]/g, to: 'border-border' },
      { from: /border-[#F1F5F9]/g, to: 'border-border' },
      { from: /divide-[#E2E8F4]\/50/g, to: 'divide-border/50' }
    ]
  },
  {
    path: path.join(__dirname, '../components/shared/data-table.tsx'),
    replacements: [
      { from: /divide-\[#1E3352\]\/30/g, to: 'divide-border/30' }
    ]
  },
  {
    path: path.join(__dirname, '../components/admin/activity/activity-dashboard.tsx'),
    replacements: [
      { from: /bg-\[#10B981\]\/15 text-\[#10B981\] flex items-center justify-center border border-\[#10B981\]\/30/g, to: 'bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20' },
      { from: /bg-\[#3B82F6\]\/15 text-\[#3B82F6\] flex items-center justify-center border border-\[#3B82F6\]\/30/g, to: 'bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20' },
      { from: /bg-\[#6366F1\]\/15 text-\[#6366F1\] flex items-center justify-center border border-\[#6366F1\]\/30/g, to: 'bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20' },
      { from: /bg-accent\/15 text-accent flex items-center justify-center border border-\[#F97316\]\/30/g, to: 'bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/20' },
      { from: /bg-warning\/15 text-warning flex items-center justify-center border border-warning\/30/g, to: 'bg-yellow-500/20 text-yellow-400 flex items-center justify-center border border-yellow-500/20' },
      { from: /bg-\[#8BA3C7\]\/15 text-text-secondary flex items-center justify-center border border-\[#8BA3C7\]\/30/g, to: 'bg-slate-500/20 text-slate-400 flex items-center justify-center border border-slate-500/20' }
    ]
  }
];

filesToUpdate.forEach((file) => {
  if (fs.existsSync(file.path)) {
    let content = fs.readFileSync(file.path, 'utf8');
    let original = content;
    
    file.replacements.forEach((rep) => {
      content = content.replace(rep.from, rep.to);
    });
    
    if (content !== original) {
      fs.writeFileSync(file.path, content, 'utf8');
      console.log(`Successfully updated file: ${path.basename(file.path)}`);
    } else {
      console.log(`No changes made to file: ${path.basename(file.path)}`);
    }
  } else {
    console.log(`File does not exist: ${file.path}`);
  }
});
