import React from 'react';
import { Plus, X, FileSpreadsheet } from 'lucide-react';
import type { TabDocument } from '../../types';

interface TabBarProps {
  tabs: TabDocument[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="flex items-center h-8 bg-slate-200 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-1 gap-0.5 overflow-x-auto select-none">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group relative flex items-center h-7 px-3 max-w-[190px] min-w-[110px] text-xs cursor-pointer border-t-2 transition-all ${
              isActive
                ? 'bg-white dark:bg-slate-800 border-blue-600 text-slate-900 dark:text-slate-100 font-medium shadow-sm'
                : 'bg-slate-200/60 dark:bg-slate-900/60 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 mr-1.5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'opacity-60'}`} />
            
            <span className="truncate flex-1 text-left">{tab.title}</span>

            {/* Dirty indicator / Close button */}
            <div className="flex items-center ml-1.5 flex-shrink-0">
              {tab.isDirty && (
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 group-hover:hidden mr-1" title="Unsaved changes" />
              )}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`p-0.5 rounded-sm hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ${
                  tab.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Close Tab (Ctrl+W)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}

      {/* New tab button */}
      <button
        onClick={onNewTab}
        className="p-1 ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-800 rounded transition-colors"
        title="New File (Ctrl+N)"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
