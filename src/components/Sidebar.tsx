import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Plus,
  FileText,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HttpMethod } from '@/types';

export default function Sidebar() {
  const {
    workspaces,
    currentWorkspaceId,
    setCurrentWorkspace,
    projects,
    requests,
    currentRequestId,
    setCurrentRequest,
    currentProjectId,
    setCurrentProject,
    addProject,
    addRequest,
  } = useWorkbenchStore();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  const workspaceProjects = projects.filter(p => p.workspaceId === currentWorkspaceId);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleCreateProject = () => {
    if (!currentWorkspaceId) return;
    const newProject = {
      id: `proj-${Date.now()}`,
      workspaceId: currentWorkspaceId,
      name: 'New Project',
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addProject(newProject);
    setExpandedProjects(new Set([...expandedProjects, newProject.id]));
  };

  const handleCreateRequest = (projectId: string) => {
    const newRequest = {
      id: `req-${Date.now()}`,
      projectId,
      name: 'New Request',
      method: 'GET' as HttpMethod,
      url: 'https://api.example.com',
      headers: [],
      queryParams: [],
      body: { type: 'none' as const },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addRequest(newRequest);
    setCurrentRequest(newRequest.id);
  };

  const getMethodColor = (method: HttpMethod) => {
    const colors: Record<HttpMethod, string> = {
      GET: 'text-green',
      POST: 'text-yellow',
      PUT: 'text-blue-300',
      PATCH: 'text-yellow',
      DELETE: 'text-red',
      HEAD: 'text-grey-600',
      OPTIONS: 'text-grey-600',
    };
    return colors[method] || 'text-grey-600';
  };

  const filteredProjects = workspaceProjects.filter(project => {
    if (!searchQuery) return true;
    const projectRequests = requests.filter(r => r.projectId === project.id);
    const projectMatch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const requestMatch = projectRequests.some(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return projectMatch || requestMatch;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Workspace Selector */}
      <div className="p-4 border-b border-grey-400">
        <label className="text-xs font-medium text-grey-600 mb-2 block">Workspace</label>
        <Select value={currentWorkspaceId || undefined} onValueChange={setCurrentWorkspace}>
          <SelectTrigger>
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map(workspace => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-grey-400">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Projects and Requests */}
      <div className="flex-1 overflow-auto p-2">
        {currentWorkspace ? (
          <>
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-semibold text-grey-600">PROJECTS</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCreateProject}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-grey-600 text-sm">
                {searchQuery ? 'No matching requests' : 'No projects yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProjects.map(project => {
                  const projectRequests = requests.filter(r => r.projectId === project.id);
                  const isExpanded = expandedProjects.has(project.id);
                  const isSelected = currentProjectId === project.id;

                  return (
                    <div key={project.id}>
                      {/* Project Header */}
                      <div
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-grey-100 group",
                          isSelected && "bg-blue-400"
                        )}
                        onClick={() => {
                          toggleProject(project.id);
                          setCurrentProject(project.id);
                        }}
                      >
                        <button
                          className="p-0 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProject(project.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-grey-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-grey-600" />
                          )}
                        </button>
                        {isExpanded ? (
                          <FolderOpen className="h-4 w-4 text-yellow" />
                        ) : (
                          <Folder className="h-4 w-4 text-yellow" />
                        )}
                        <span className="text-sm font-medium text-grey flex-1 truncate">
                          {project.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateRequest(project.id);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Requests */}
                      {isExpanded && (
                        <div className="ml-6 mt-1 space-y-0.5">
                          {projectRequests.length === 0 ? (
                            <div className="px-2 py-2 text-xs text-grey-600">
                              No requests yet
                            </div>
                          ) : (
                            projectRequests.map(request => (
                              <div
                                key={request.id}
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-grey-100",
                                  currentRequestId === request.id && "bg-primary text-white hover:bg-primary/90"
                                )}
                                onClick={() => setCurrentRequest(request.id)}
                              >
                                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                <span
                                  className={cn(
                                    "text-xs font-semibold mr-2 flex-shrink-0",
                                    currentRequestId === request.id ? "text-white" : getMethodColor(request.method)
                                  )}
                                >
                                  {request.method}
                                </span>
                                <span className="text-sm truncate flex-1">
                                  {request.name}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-grey-600 text-sm">
            Select a workspace to begin
          </div>
        )}
      </div>
    </div>
  );
}
