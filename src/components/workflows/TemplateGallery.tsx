import React from 'react';
import { Grid, Star, Download } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  popularity: number;
}

interface TemplateGalleryProps {
  onSelectTemplate?: (template: Template) => void;
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const templates: Template[] = [
    {
      id: '1',
      name: 'Web Scraper',
      description: 'Extract data from websites',
      category: 'Data',
      popularity: 95,
    },
    {
      id: '2',
      name: 'Content Summarizer',
      description: 'Summarize long articles and documents',
      category: 'Content',
      popularity: 88,
    },
    {
      id: '3',
      name: 'Email Processor',
      description: 'Process and categorize emails',
      category: 'Communication',
      popularity: 76,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Grid className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-slate-200">Template Gallery</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-colors cursor-pointer"
            onClick={() => onSelectTemplate?.(template)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-slate-200">{template.name}</h4>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-slate-400">{template.popularity}</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-3">{template.description}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                {template.category}
              </span>
              <button className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 text-sm">
                <Download className="h-4 w-4" />
                <span>Use</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}