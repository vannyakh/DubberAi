/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Plus as IconPlus,
  Search as IconSearch,
  Video as IconVideo,
  MoreHorizontal as IconMore,
  Trash2 as IconTrash,
  Copy as IconCopy,
  Pencil as IconRename,
  ArrowDown as IconSortOrder,
  ChevronDown as IconChevron,
  LayoutGrid as IconGrid,
  List as IconList,
  Languages as IconBrand,
} from 'lucide-react';
import { Project } from '@video-voice-translator/types';
import { useStudio } from '../hooks/useStudio';
import { useThemeClasses } from '../context/ThemeContext';

type ViewMode = 'grid' | 'list';
type SortKey = 'createdAt' | 'name';
type SortOrder = 'asc' | 'desc';

const SORT_LABELS: Record<SortKey, string> = {
  createdAt: 'Created',
  name: 'Name',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const ProjectsPage: React.FC = () => {
  const { recentProjects, createProject, loadProject, deleteProject, renameProject, duplicateProject } = useStudio();
  const t = useThemeClasses();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('studio_projects_view') as ViewMode) || 'grid'
  );
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<Project[] | null>(null);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('studio_projects_view', mode);
  };

  const projectsToDisplay = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? recentProjects.filter((p) => p.name.toLowerCase().includes(query))
      : recentProjects;
    return [...filtered].sort((a, b) => {
      const cmp =
        sortKey === 'name'
          ? a.name.localeCompare(b.name)
          : (a.createdAt || '').localeCompare(b.createdAt || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [recentProjects, searchQuery, sortKey, sortOrder]);

  const allIds = projectsToDisplay.map((p) => p.id);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleNewProject = () => {
    createProject('New project');
    // main.tsx routes to the editor import stage once projectId is set
  };

  const confirmDelete = () => {
    if (!deleteTargets) return;
    deleteTargets.forEach((p) => deleteProject(p.id));
    setSelectedIds((prev) => prev.filter((id) => !deleteTargets.some((p) => p.id === id)));
    setDeleteTargets(null);
  };

  return (
    <div className={`min-h-screen ${t.pageBg} ${t.textPrimary}`}>
      {/* Header */}
      <header className={`sticky top-0 z-20 ${t.pageBg} border-b ${t.borderB}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <IconBrand size={18} className={t.accent2} />
            <span className="text-sm font-bold tracking-wide">Video Voice Translator</span>
          </div>
          <nav className={`hidden sm:flex items-center gap-1.5 text-xs ${t.textMuted}`}>
            <span>Home</span>
            <span>/</span>
            <span className={t.textPrimary}>All projects</span>
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-full max-w-xs">
            <IconSearch size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects"
              className={`w-full ${t.inputBg} border ${t.borderB} rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 ${t.textPrimary}`}
            />
          </div>

          {/* View toggle */}
          <div className={`hidden sm:flex items-center rounded-lg border ${t.borderB} overflow-hidden`}>
            {(
              [
                { mode: 'grid' as const, Icon: IconGrid, label: 'Grid view' },
                { mode: 'list' as const, Icon: IconList, label: 'List view' },
              ]
            ).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                aria-label={label}
                aria-pressed={viewMode === mode}
                onClick={() => changeViewMode(mode)}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === mode ? `${t.activeBg} ${t.activeText}` : `${t.textMuted} ${t.hoverBg}`
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button
            onClick={handleNewProject}
            className={`flex items-center gap-1.5 ${t.accent2Bg} text-[#171717] rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity`}
          >
            <IconPlus size={14} />
            <span className="hidden sm:inline">New project</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          <label className={`flex items-center gap-2 text-xs ${t.textSecondary} cursor-pointer select-none`}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => setSelectedIds(e.target.checked ? allIds : [])}
              className="size-4 accent-[#2DD4BF] cursor-pointer"
            />
            Select all
          </label>

          <div className={`h-4 w-px ${t.subtleBg}`} />

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-xs ${t.textSecondary} ${t.hoverBg} rounded-lg px-2.5 py-1.5 cursor-pointer`}
            >
              {SORT_LABELS[sortKey]}
              <IconChevron size={12} />
            </button>
            {sortMenuOpen && (
              <div
                className={`absolute left-0 top-full mt-1 z-30 ${t.panelBg} border ${t.borderB} rounded-xl shadow-xl py-1 min-w-32`}
                onMouseLeave={() => setSortMenuOpen(false)}
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortKey(key);
                      setSortMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs cursor-pointer ${t.hoverBg} ${
                      sortKey === key ? t.accent2 : t.textSecondary
                    }`}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className={`p-1.5 rounded-lg ${t.textMuted} ${t.hoverBg} cursor-pointer transition-transform ${
              sortOrder === 'asc' ? 'rotate-180' : ''
            }`}
          >
            <IconSortOrder size={14} />
          </button>

          <div className="flex-1" />

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${t.textMuted}`}>{selectedIds.length} selected</span>
              <button
                onClick={() => {
                  selectedIds.forEach((id) => duplicateProject(id));
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-1.5 text-xs border ${t.borderB} rounded-lg px-2.5 py-1.5 cursor-pointer ${t.hoverBg}`}
              >
                <IconCopy size={12} /> Duplicate
              </button>
              <button
                onClick={() =>
                  setDeleteTargets(recentProjects.filter((p) => selectedIds.includes(p.id)))
                }
                className="flex items-center gap-1.5 text-xs border border-red-500/40 text-red-500 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-red-500/10"
              >
                <IconTrash size={12} /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {projectsToDisplay.length === 0 ? (
          <EmptyState
            hasProjects={recentProjects.length > 0}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            onCreate={handleNewProject}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {projectsToDisplay.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                selected={selectedIds.includes(project.id)}
                onToggleSelected={(checked) => toggleSelected(project.id, checked)}
                onOpen={() => loadProject(project.id)}
                onRename={() => setRenameTarget(project)}
                onDuplicate={() => duplicateProject(project.id)}
                onDelete={() => setDeleteTargets([project])}
              />
            ))}
          </div>
        ) : (
          <div className={`border ${t.borderB} rounded-2xl overflow-hidden divide-y ${t.borderB}`}>
            {projectsToDisplay.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                selected={selectedIds.includes(project.id)}
                onToggleSelected={(checked) => toggleSelected(project.id, checked)}
                onOpen={() => loadProject(project.id)}
                onRename={() => setRenameTarget(project)}
                onDuplicate={() => duplicateProject(project.id)}
                onDelete={() => setDeleteTargets([project])}
              />
            ))}
          </div>
        )}
      </main>

      {renameTarget && (
        <RenameDialog
          project={renameTarget}
          onCancel={() => setRenameTarget(null)}
          onConfirm={(name) => {
            renameProject(renameTarget.id, name);
            setRenameTarget(null);
          }}
        />
      )}

      {deleteTargets && (
        <ConfirmDeleteDialog
          projects={deleteTargets}
          onCancel={() => setDeleteTargets(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

interface ProjectItemProps {
  project: Project;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const ProjectCard: React.FC<ProjectItemProps> = ({
  project,
  selected,
  onToggleSelected,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}) => {
  const t = useThemeClasses();

  return (
    <div className="group relative">
      <button onClick={onOpen} className="block w-full text-left cursor-pointer">
        <div
          className={`relative aspect-video rounded-xl border ${t.borderB} ${t.subtleBg} flex items-center justify-center overflow-hidden transition-transform group-hover:scale-[1.02]`}
        >
          {project.videoUrl ? (
            <video src={project.videoUrl} muted preload="metadata" className="w-full h-full object-cover" />
          ) : (
            <IconVideo size={28} className={t.textFaint} />
          )}
          {project.targetLang && (
            <span className={`absolute bottom-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${t.accent2Bg} text-[#171717]`}>
              {project.targetLang}
            </span>
          )}
        </div>
        <div className="mt-2 px-0.5">
          <p className={`text-xs font-semibold truncate ${t.textPrimary}`}>{project.name}</p>
          <p className={`text-[10px] ${t.textMuted}`}>Created {formatDate(project.createdAt)}</p>
        </div>
      </button>

      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggleSelected(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-2.5 left-2.5 z-10 size-4 accent-[#2DD4BF] cursor-pointer transition-opacity ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />

      <ProjectMenu onRename={onRename} onDuplicate={onDuplicate} onDelete={onDelete} className="absolute top-2 right-2" />
    </div>
  );
};

const ProjectRow: React.FC<ProjectItemProps> = ({
  project,
  selected,
  onToggleSelected,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}) => {
  const t = useThemeClasses();

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${t.panelBg}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggleSelected(e.target.checked)}
        className="size-4 accent-[#2DD4BF] cursor-pointer shrink-0"
      />
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
        <div className={`w-16 aspect-video rounded-md border ${t.borderB} ${t.subtleBg} flex items-center justify-center shrink-0 overflow-hidden`}>
          {project.videoUrl ? (
            <video src={project.videoUrl} muted preload="metadata" className="w-full h-full object-cover" />
          ) : (
            <IconVideo size={14} className={t.textFaint} />
          )}
        </div>
        <span className={`text-xs font-semibold truncate ${t.textPrimary}`}>{project.name}</span>
        <span className={`hidden sm:block text-[10px] ${t.textMuted} ml-auto shrink-0`}>
          {project.targetLang || '—'}
        </span>
        <span className={`text-[10px] ${t.textMuted} shrink-0 w-24 text-right`}>
          {formatDate(project.createdAt)}
        </span>
      </button>
      <ProjectMenu onRename={onRename} onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
};

const ProjectMenu: React.FC<{
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  className?: string;
}> = ({ onRename, onDuplicate, onDelete, className }) => {
  const t = useThemeClasses();
  const [open, setOpen] = useState(false);

  const items = [
    { label: 'Rename', Icon: IconRename, action: onRename },
    { label: 'Duplicate', Icon: IconCopy, action: onDuplicate },
    { label: 'Delete', Icon: IconTrash, action: onDelete, danger: true },
  ];

  return (
    <div className={`relative ${className || ''}`}>
      <button
        aria-label="Project actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`p-1.5 rounded-lg ${t.panelBg} border ${t.borderB} ${t.textMuted} cursor-pointer ${t.hoverBg} ${
          open ? '' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <IconMore size={13} />
      </button>
      {open && (
        <div
          className={`absolute right-0 top-full mt-1 z-30 ${t.panelBg} border ${t.borderB} rounded-xl shadow-xl py-1 min-w-32`}
          onMouseLeave={() => setOpen(false)}
        >
          {items.map(({ label, Icon, action, danger }) => (
            <button
              key={label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action();
              }}
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs cursor-pointer ${t.hoverBg} ${
                danger ? 'text-red-500' : t.textSecondary
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC<{
  hasProjects: boolean;
  searchQuery: string;
  onClearSearch: () => void;
  onCreate: () => void;
}> = ({ hasProjects, searchQuery, onClearSearch, onCreate }) => {
  const t = useThemeClasses();

  if (hasProjects) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <IconSearch size={28} className={t.textFaint} />
        <h2 className={`mt-4 text-sm font-bold ${t.textPrimary}`}>No results found</h2>
        <p className={`mt-1 text-xs ${t.textMuted}`}>
          Your search for "{searchQuery}" did not return any results.
        </p>
        <button
          onClick={onClearSearch}
          className={`mt-4 text-xs border ${t.borderB} rounded-xl px-4 py-2 cursor-pointer ${t.hoverBg}`}
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className={`size-14 rounded-2xl ${t.subtleBg} flex items-center justify-center`}>
        <IconVideo size={24} className={t.accent2} />
      </div>
      <h2 className={`mt-4 text-sm font-bold ${t.textPrimary}`}>No projects yet</h2>
      <p className={`mt-1 text-xs ${t.textMuted} max-w-xs`}>
        Start creating your first project. Import a video, transcribe, translate, and dub it with AI.
      </p>
      <button
        onClick={onCreate}
        className={`mt-5 flex items-center gap-1.5 ${t.accent2Bg} text-[#171717] rounded-xl px-4 py-2 text-xs font-bold cursor-pointer hover:opacity-90`}
      >
        <IconPlus size={14} /> Create your first project
      </button>
    </div>
  );
};

const RenameDialog: React.FC<{
  project: Project;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}> = ({ project, onCancel, onConfirm }) => {
  const t = useThemeClasses();
  const [name, setName] = useState(project.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${t.panelBg} border ${t.borderB} rounded-2xl w-full max-w-sm p-5 shadow-2xl`}
      >
        <h3 className={`text-xs font-bold uppercase tracking-widest ${t.textPrimary}`}>Rename project</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onConfirm(name.trim());
            if (e.key === 'Escape') onCancel();
          }}
          className={`mt-4 w-full ${t.inputBg} border ${t.borderB} rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 ${t.textPrimary}`}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className={`text-xs border ${t.borderB} rounded-xl px-3.5 py-2 cursor-pointer ${t.hoverBg}`}>
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            className={`text-xs ${t.accent2Bg} text-[#171717] font-bold rounded-xl px-3.5 py-2 cursor-pointer hover:opacity-90`}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmDeleteDialog: React.FC<{
  projects: Project[];
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ projects, onCancel, onConfirm }) => {
  const t = useThemeClasses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${t.panelBg} border ${t.borderB} rounded-2xl w-full max-w-sm p-5 shadow-2xl`}
      >
        <h3 className={`text-xs font-bold uppercase tracking-widest ${t.textPrimary}`}>
          Delete {projects.length === 1 ? 'project' : `${projects.length} projects`}?
        </h3>
        <p className={`mt-2 text-xs ${t.textMuted} leading-relaxed`}>
          {projects.length === 1 ? (
            <>
              "{projects[0].name}" will be permanently deleted. This cannot be undone.
            </>
          ) : (
            <>These projects will be permanently deleted. This cannot be undone.</>
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className={`text-xs border ${t.borderB} rounded-xl px-3.5 py-2 cursor-pointer ${t.hoverBg}`}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-xs bg-red-500 text-white font-bold rounded-xl px-3.5 py-2 cursor-pointer hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
