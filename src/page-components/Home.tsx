import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isSuperadmin: boolean;
  pageAccess: Record<string, boolean>;
  project?: string;
  projectName?: string;
  projectLogo?: string;
}

interface Project {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  notes?: string;
  latestStatus?: string;
  category?: string;
  source?: string;
  type?: string;
  individuals?: string[];
  monthlyImpact?: number;
  hoursPerMonth?: number;
  updates?: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  project?: string;
  projectName?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Page {
  slug: string;
  label: string;
}

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragOverDelete, setDragOverDelete] = useState(false)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [showAddUpdateModal, setShowAddUpdateModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({})
  const [updateFormData, setUpdateFormData] = useState({
    projectId: '',
    updateText: '',
    updateDate: new Date().toISOString().split('T')[0] // Today's date as default
  })
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    status: 'Do',
    project: '',
    dueDate: ''
  })
  const [isGeneratingStatus, setIsGeneratingStatus] = useState(false)
  const [showStatusPreviewModal, setShowStatusPreviewModal] = useState(false)
  const [statusSummary, setStatusSummary] = useState('')
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  // Filter projects based on category
  const filteredProjects = categoryFilter 
    ? projects.filter(project => project.category === categoryFilter)
    : projects

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setShowLoginModal(false); // Hide login modal if user is already logged in
          
          // Load projects for all users
          loadProjects();
          
          // Load pages registry
          loadPages();
          
          // Load tasks only if user is superadmin
          if (userData.isSuperadmin) {
            loadTasks();
          }
        }
      } catch (e) {
        console.log('Not logged in');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Load projects for all logged-in users
  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        credentials: 'include'
      });
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  // Load pages registry
  const loadPages = async () => {
    try {
      const response = await fetch('/api/pages', {
        credentials: 'include'
      });
      if (response.ok) {
        const pagesData = await response.json();
        setPages(pagesData);
      }
    } catch (e) {
      console.error('Failed to load pages:', e);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, columnStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTask && draggedTask.status !== columnStatus) {
      await updateTaskStatus(draggedTask.id, columnStatus);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverDelete(false);
  };

  // Delete zone drag handlers
  const handleDeleteDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDelete(true);
  };

  const handleDeleteDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverDelete(false);
    }
  };

  const handleDeleteDrop = async (e) => {
    e.preventDefault();
    setDragOverDelete(false);
    
    if (draggedTask) {
      const success = await deleteTask(draggedTask.id);
      if (success) {
        alert(`Task "${draggedTask.title}" has been deleted.`);
      } else {
        alert('Failed to delete task. Please try again.');
      }
    }
    setDraggedTask(null);
  };

  // Update task status via Collections API
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      // Find the task to get its current data
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Update the task data with new status
      const updatedTaskData = {
        title: task.title,
        description: task.description,
        status: newStatus,
        project: task.project,
        projectName: task.projectName,
        assignee: task.assignee,
        dueDate: task.dueDate
      };

      const response = await fetch(`/api/collections/tasks/items/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ data: updatedTaskData })
      });

      if (response.ok) {
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId ? { ...t, status: newStatus } : t
          )
        );
      } else {
        console.error('Failed to update task status');
      }
    } catch (e) {
      console.error('Error updating task status:', e);
    }
  };

  // Delete task via Collections API
  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/collections/tasks/items/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Remove task from local state
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
        return true;
      } else {
        console.error('Failed to delete task');
        return false;
      }
    } catch (e) {
      console.error('Error deleting task:', e);
      return false;
    }
  };

  // Toggle field expansion
  const toggleFieldExpansion = (fieldName) => {
    setExpandedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Generate AI status summary
  const generateStatusSummary = async (project) => {
    setIsGeneratingStatus(true);
    
    try {
      // Prepare project data for analysis
      const projectTasks = tasks.filter(task => task.project === project.id);
      const doTasks = projectTasks.filter(task => task.status === 'Do');
      const doingTasks = projectTasks.filter(task => task.status === 'Doing');
      const doneTasks = projectTasks.filter(task => task.status === 'Done');
      
      const projectData = {
        name: project.name,
        description: project.description || '',
        status: project.status || '',
        updates: project.updates || '',
        tasks: {
          todo: doTasks.map(task => task.title),
          doing: doingTasks.map(task => task.title),
          done: doneTasks.map(task => task.title)
        }
      };

      const response = await fetch('/api/generate-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ projectData })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show the AI summary in a preview modal
        setStatusSummary(result.summary);
        setCurrentProject(project);
        setShowStatusPreviewModal(true);
      } else {
        const error = await response.json();
        alert(`Failed to generate status: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating status:', error);
      alert('Failed to generate status. Please try again.');
    } finally {
      setIsGeneratingStatus(false);
    }
  };

  // Save status summary to Latest Status field
  const saveStatusToLatestStatus = async () => {
    if (!currentProject || !statusSummary) return;
    
    try {
      const updateResponse = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...currentProject,
          latestStatus: `${new Date().toLocaleDateString()} - ${statusSummary}`
        })
      });

      if (updateResponse.ok) {
        const timestampedStatus = `${new Date().toLocaleDateString()} - ${statusSummary}`;
        
        // Update local project data
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p.id === currentProject.id ? { ...p, latestStatus: timestampedStatus } : p
          )
        );
        
        // Update viewing project if it's the same one
        if (viewingProject && viewingProject.id === currentProject.id) {
          setViewingProject({ ...viewingProject, latestStatus: timestampedStatus });
        }
        
        // Close modal and reset state
        setShowStatusPreviewModal(false);
        setStatusSummary('');
        setCurrentProject(null);
        
        alert('AI status summary saved to Latest Status field!');
      } else {
        const updateError = await updateResponse.json();
        alert(`Failed to save status: ${updateError.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving status:', error);
      alert('Failed to save status. Please try again.');
    }
  };

  // Handle adding project update
  const handleAddUpdate = async (e) => {
    e.preventDefault();
    
    if (!updateFormData.projectId || !updateFormData.updateText.trim()) {
      alert('Please select a project and enter update text');
      return;
    }

    try {
      // Find the selected project
      const selectedProject = projects.find(p => p.id === updateFormData.projectId);
      if (!selectedProject) {
        alert('Selected project not found');
        return;
      }

      // Format the new update entry
      const updateEntry = `${updateFormData.updateDate}: ${updateFormData.updateText.trim()}`;
      
      // Append to existing updates or create new updates field
      const existingUpdates = selectedProject.updates || '';
      const newUpdates = existingUpdates 
        ? `${existingUpdates}\n${updateEntry}`
        : updateEntry;

      // Update the project
      const response = await fetch(`/api/projects/${updateFormData.projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...selectedProject,
          updates: newUpdates
        })
      });

      if (response.ok) {
        // Reload projects to reflect the change
        loadProjects();
        
        // Reset form and close modal
        setUpdateFormData({
          projectId: '',
          updateText: '',
          updateDate: new Date().toISOString().split('T')[0]
        });
        setShowAddUpdateModal(false);
        
        alert('Update added successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to add update: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding update:', error);
      alert('Failed to add update. Please try again.');
    }
  };

  // Load tasks for superadmin users
  const loadTasks = async () => {
    try {
      // Load tasks from Collections API
      const response = await fetch('/api/collections/tasks/items', {
        credentials: 'include'
      });
      if (response.ok) {
        const tasksResponse = await response.json();
        const taskItems = tasksResponse.items || tasksResponse; // Handle both paginated and direct responses
        
        // Transform items to match expected task format
        const transformedTasks = taskItems.map(item => ({
          id: item.id,
          title: item.data.title,
          description: item.data.description,
          status: item.data.status,
          project: item.data.project,
          projectName: item.data.projectName,
          assignee: item.data.assignee,
          dueDate: item.data.dueDate,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }));
        
        setTasks(transformedTasks);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  // API helper function
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      ...options
    };

    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  };

  // Handle adding a new task
  const handleAddTask = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!taskFormData.title || !taskFormData.status) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Get project name for display
      const selectedProject = projects.find(p => p.id === taskFormData.project)
      
      // Create new task data object for Collections API
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        status: taskFormData.status,
        project: taskFormData.project,
        projectName: selectedProject ? selectedProject.name : null,
        assignee: taskFormData.assignee || null,
        dueDate: taskFormData.dueDate || null
      }

      // Save to server via Collections API
      const savedItem = await apiCall('/api/collections/tasks/items', {
        method: 'POST',
        body: JSON.stringify({ data: taskData })
      });

      // Transform saved item to match expected task format
      const transformedTask = {
        id: savedItem.id,
        title: savedItem.data.title,
        description: savedItem.data.description,
        status: savedItem.data.status,
        project: savedItem.data.project,
        projectName: savedItem.data.projectName,
        assignee: savedItem.data.assignee,
        dueDate: savedItem.data.dueDate,
        createdAt: savedItem.createdAt,
        updatedAt: savedItem.updatedAt
      };

      // Add task to local state
      setTasks(prev => [...prev, transformedTask])
      
      // Reset form and close modal
      setTaskFormData({
        title: '',
        description: '',
        status: 'Do',
        project: '',
        dueDate: ''
      })
      setShowAddTaskModal(false)
      
      alert(`Task "${transformedTask.title}" has been added successfully!`)
    } catch (e) {
      console.error('Error adding task:', e);
      alert('Failed to add task: ' + e.message);
    }
  }

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setShowLoginModal(false);
        setEmail('');
        setPassword('');
        
        // Load projects for all users
        loadProjects();
        
        // Load pages registry
        loadPages();
        
        // Load tasks only if user is superadmin
        if (userData.isSuperadmin) {
          loadTasks();
        }
        
        alert(`Welcome back, ${userData.firstName}!`);
      } else {
        const error = await response.json();
        alert(error.error || 'Login failed');
      }
    } catch (e) {
      console.error('Login error:', e);
      alert('Login failed. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  if (isLoading) {
    return (
      <main style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', paddingTop: 16, paddingBottom: 16 }}>
        <div className="layout">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
              <a href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                {user && user.projectLogo ? (
                  <img 
                    src={user.projectLogo} 
                    alt={user.projectName || 'Project Logo'} 
                    style={{ 
                      height: '24px', 
                      width: 'auto', 
                      maxWidth: '120px',
                      objectFit: 'contain'
                    }} 
                  />
                ) : null}
              </a>
            </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {user && user.isSuperadmin && (
                    <Link className="btn btn-sm" href="/admin">Admin</Link>
                  )}
                  {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, color: '#171717' }}>
                        Hey, {user.firstName}
                      </span>
                      <button 
                        className="btn btn-sm" 
                        onClick={handleLogout}
                        style={{ fontSize: 12, padding: '4px 8px' }}
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-sm" 
                      onClick={() => setShowLoginModal(true)}
                    >
                      Log In
                    </button>
                  )}
                </div>
          </div>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingTop: 40, position: 'relative' }}>
        {user ? (
          <>
            {/* Projects Grid - Only for Superadmins */}
            {user.isSuperadmin && projects.length > 0 && (
              <div style={{
                width: '100%',
                background: 'white',
                borderBottom: '1px solid #e5e5e5',
                padding: '24px 0',
                position: 'relative',
                zIndex: 1
              }}>
                <div className="layout">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: '#171717' }}>
                      Projects
                    </h2>
                    <button
                      onClick={() => setShowAddUpdateModal(true)}
                      style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#0056b3'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#007bff'}
                    >
                      Add Update
                    </button>
                  </div>
                  
                  {/* Category Filter Controls */}
                  <div style={{ 
                    display: 'flex', 
                    gap: 12, 
                    alignItems: 'center', 
                    marginBottom: 24,
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ 
                        fontSize: 14, 
                        fontWeight: 500, 
                        color: '#333',
                        whiteSpace: 'nowrap'
                      }}>
                        Filter by Category:
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13,
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          minWidth: '180px'
                        }}
                      >
                        <option value="">All Categories</option>
                        <option value="Client Advisory">Client Advisory</option>
                        <option value="Ally Advisory">Ally Advisory</option>
                        <option value="Founder Venture">Founder Venture</option>
                        <option value="Partner Venture">Partner Venture</option>
                      </select>
                    </div>
                    
                    {categoryFilter && (
                      <button
                        onClick={() => setCategoryFilter('')}
                        style={{
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#5a6268'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#6c757d'}
                      >
                        Clear Filter
                      </button>
                    )}
                    
                    {categoryFilter && (
                      <div style={{ 
                        fontSize: 13, 
                        color: '#666',
                        fontStyle: 'italic'
                      }}>
                        Showing {filteredProjects.length} of {projects.length} projects
                      </div>
                    )}
                  </div>
                  
                  {/* No projects message when filter returns no results */}
                  {filteredProjects.length === 0 && categoryFilter && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#666',
                      fontSize: 14,
                      fontStyle: 'italic'
                    }}>
                      No projects found in the "{categoryFilter}" category.
                      <br />
                      <button
                        onClick={() => setCategoryFilter('')}
                        style={{
                          background: 'transparent',
                          color: '#007bff',
                          border: 'none',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: 14,
                          marginTop: 8
                        }}
                      >
                        Clear filter to see all projects
                      </button>
                    </div>
                  )}
                  
                  {/* Projects Grid */}
                  {filteredProjects.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 16,
                      width: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}>
                      {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e5e5e5',
                          borderRadius: 8,
                          padding: 16,
                          textAlign: 'center',
                          width: '100%',
                          height: '0',
                          paddingBottom: '75%',
                          position: 'relative',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#007bff';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e5e5';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => setViewingProject(project)}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 16,
                          left: 16,
                          right: 16,
                          bottom: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}>
                          {/* Gray square container for logo */}
                          <div style={{
                            width: '100%',
                            flex: '1 1 auto',
                            background: '#f8f9fa',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 0
                          }}>
                          {project.logoUrl ? (
                            <img
                              src={project.logoUrl}
                              alt={`${project.name} logo`}
                              style={{
                                maxWidth: '80%',
                                maxHeight: '80%',
                                width: 'auto',
                                height: 'auto',
                                borderRadius: 4,
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <div style={{
                              fontSize: 24,
                              fontWeight: 600,
                              color: '#6c757d'
                            }}>
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Project Name */}
                        <div style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#171717',
                          lineHeight: '1.3',
                            textAlign: 'left',
                            flex: '0 0 auto',
                            padding: '4px 0'
                        }}>
                          {project.name}
                        </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Task Board - Only for Superadmins */}
            {user.isSuperadmin && (
              <div style={{
                width: '100%',
                background: 'white',
                padding: '40px 0'
              }}>
                <div className="layout">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: '#171717' }}>
                      Task Board
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Delete Zone - Only visible when dragging */}
                      {draggedTask && (
                        <div
                          onDragOver={handleDeleteDragOver}
                          onDragLeave={handleDeleteDragLeave}
                          onDrop={handleDeleteDrop}
                          style={{
                            background: dragOverDelete ? '#dc3545' : '#f8d7da',
                            color: dragOverDelete ? 'white' : '#721c24',
                            border: `2px dashed ${dragOverDelete ? '#dc3545' : '#f5c6cb'}`,
                            borderRadius: 6,
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          🗑️ Delete Task
                        </div>
                      )}
                      <button
                        onClick={() => setShowAddTaskModal(true)}
                        style={{
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#0056b3'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#007bff'}
                      >
                        Add Task
                      </button>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 24,
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}>
                    {/* Do Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 500,
                        margin: 0,
                        color: '#171717',
                        textAlign: 'center',
                        padding: '8px',
                        background: '#fff3cd',
                        borderRadius: 6,
                        border: '1px solid #ffeaa7'
                      }}>
                        Do
                      </h3>
                      <div 
                        style={{
                          background: dragOverColumn === 'Do' ? '#f0f8ff' : '#f8f9fa',
                          border: dragOverColumn === 'Do' ? '2px dashed #007bff' : '1px solid #e5e5e5',
                          borderRadius: 8,
                          padding: 20,
                          minHeight: 400,
                          transition: 'all 0.2s ease'
                        }}
                        onDragOver={(e) => handleDragOver(e, 'Do')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'Do')}
                      >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {tasks.filter(task => task.status === 'Do').map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            style={{
                              background: draggedTask?.id === task.id ? '#e3f2fd' : 'white',
                              border: '1px solid #e5e5e5',
                              borderRadius: 6,
                              padding: 12,
                              fontSize: 13,
                              color: '#171717',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              cursor: 'grab',
                              opacity: draggedTask?.id === task.id ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ fontWeight: 500, fontSize: 13, color: '#171717' }}>
                              {task.projectName ? `${task.projectName} | ${task.title}` : task.title}
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>

                    {/* Doing Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 500,
                        margin: 0,
                        color: '#171717',
                        textAlign: 'center',
                        padding: '8px',
                        background: '#cce5ff',
                        borderRadius: 6,
                        border: '1px solid #74b9ff'
                      }}>
                        Doing
                      </h3>
                      <div 
                        style={{
                          background: dragOverColumn === 'Doing' ? '#fff8e1' : '#f8f9fa',
                          border: dragOverColumn === 'Doing' ? '2px dashed #ff9800' : '1px solid #e5e5e5',
                          borderRadius: 8,
                          padding: 20,
                          minHeight: 400,
                          transition: 'all 0.2s ease'
                        }}
                        onDragOver={(e) => handleDragOver(e, 'Doing')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'Doing')}
                      >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {tasks.filter(task => task.status === 'Doing').map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            style={{
                              background: draggedTask?.id === task.id ? '#e3f2fd' : 'white',
                              border: '1px solid #e5e5e5',
                              borderRadius: 6,
                              padding: 12,
                              fontSize: 13,
                              color: '#171717',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              cursor: 'grab',
                              opacity: draggedTask?.id === task.id ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ fontWeight: 500, fontSize: 13, color: '#171717' }}>
                              {task.projectName ? `${task.projectName} | ${task.title}` : task.title}
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>

                    {/* Done Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 500,
                        margin: 0,
                        color: '#171717',
                        textAlign: 'center',
                        padding: '8px',
                        background: '#d4edda',
                        borderRadius: 6,
                        border: '1px solid #00b894'
                      }}>
                        Done
                      </h3>
                      <div 
                        style={{
                          background: dragOverColumn === 'Done' ? '#f1f8e9' : '#f8f9fa',
                          border: dragOverColumn === 'Done' ? '2px dashed #4caf50' : '1px solid #e5e5e5',
                          borderRadius: 8,
                          padding: 20,
                          minHeight: 400,
                          transition: 'all 0.2s ease'
                        }}
                        onDragOver={(e) => handleDragOver(e, 'Done')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'Done')}
                      >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {tasks.filter(task => task.status === 'Done').map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            style={{
                              background: draggedTask?.id === task.id ? '#e3f2fd' : 'white',
                              border: '1px solid #e5e5e5',
                              borderRadius: 6,
                              padding: 12,
                              fontSize: 13,
                              color: '#171717',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              cursor: 'grab',
                              opacity: draggedTask?.id === task.id ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ fontWeight: 500, fontSize: 13, color: '#171717' }}>
                              {task.projectName ? `${task.projectName} | ${task.title}` : task.title}
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Details and Navigation Container - Hidden for Superadmins */}
            {!user.isSuperadmin && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 24,
              width: '100%',
              paddingLeft: 20,
              paddingRight: 20,
                paddingTop: 40,
                position: 'relative',
                zIndex: 2
            }}>
              {/* User Details Window */}
              <div style={{ 
                background: 'white', 
                border: '1px solid #e5e5e5', 
                borderRadius: 12, 
                padding: 32, 
                width: '100%',
                maxWidth: 500,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px 0', color: '#171717' }}>
                    Welcome back!
                  </h2>
                  <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
                    Here are your account details
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f3f4' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Name:</span>
                    <span style={{ fontSize: 13, color: '#171717' }}>{user.firstName} {user.lastName}</span>
                  </div>

                  {/* Email */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f3f4' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Email:</span>
                    <span style={{ fontSize: 13, color: '#171717' }}>{user.email}</span>
                  </div>

                  {/* Project Logo - Centered */}
                  {user.projectName && user.projectName !== 'No project assigned' && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      padding: '20px 0 10px 0'
                    }}>
                      {user.projectLogo ? (
                        <img 
                          src={user.projectLogo} 
                          alt={`${user.projectName} logo`}
                          style={{
                            maxWidth: '90%',
                            maxHeight: '120px',
                            width: 'auto',
                            height: 'auto',
                            borderRadius: 8,
                            objectFit: 'contain',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '200px',
                          height: '80px',
                          background: '#f8f9fa',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 32,
                          fontWeight: 600,
                          color: '#666',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          {user.projectName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Page Access Navigation Buttons */}
              {user.pageAccess && pages.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  width: '100%',
                  maxWidth: 500,
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                  {pages
                    .filter(page => {
                      // Only show pages the user has access to
                      if (!user.pageAccess[page.slug]) return false;
                      
                      // Don't show admin page for non-superadmins
                      if (page.slug === 'admin' && !user.isSuperadmin) return false;
                      
                      return true;
                    })
                    .map(page => {
                      // Map slug to path
                      const getPagePath = (slug) => {
                        if (slug === 'home') return '/';
                        if (slug === 'csm') return '/csm-dashboard';
                        return `/${slug}`;
                      };
                      
                      return (
                        <Link
                          key={page.slug}
                          href={getPagePath(page.slug)}
                          className="btn btn-sm"
                          style={{
                            flex: 1,
                            textDecoration: 'none',
                            textAlign: 'center',
                            fontSize: 13,
                            padding: '8px 16px',
                            minHeight: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '120px'
                          }}
                        >
                          {page.label}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
            )}
          </>
        ) : (
          // Empty state when not logged in
          <div style={{ textAlign: 'center', padding: 32 }}>
            {/* Content removed - user needs to login to see anything */}
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && !user && !isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: 32,
            borderRadius: 8,
            minWidth: 320,
            maxWidth: 400,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Login</h3>
              <button 
                onClick={() => setShowLoginModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: 24, 
                  cursor: 'pointer',
                  padding: 4,
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

                <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your email"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#333' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your password"
                />
              </div>

              <button 
                type="submit"
                style={{ 
                  width: '100%',
                  padding: 12, 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Login
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Update Modal */}
      {showAddUpdateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: 32,
            borderRadius: 8,
            width: '90vw',
            maxWidth: '500px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Add Project Update</h3>
              <button 
                onClick={() => setShowAddUpdateModal(false)}
                style={{ 
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddUpdate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Project *
                </label>
                <select
                  value={updateFormData.projectId}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, projectId: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Update Date *
                </label>
                <input
                  type="date"
                  value={updateFormData.updateDate}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, updateDate: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Update Text *
                </label>
                <textarea
                  value={updateFormData.updateText}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, updateText: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Enter the project update..."
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddUpdateModal(false)}
                  style={{
                    background: '#f8f9fa',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: 32,
            borderRadius: 8,
            minWidth: 500,
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Add New Task</h3>
              <button 
                onClick={() => setShowAddTaskModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: 24, 
                  cursor: 'pointer',
                  padding: 4,
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddTask}>
              {/* Project Dropdown */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Project
                </label>
                <select
                  value={taskFormData.project}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, project: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    height: '44px'
                  }}
                >
                  <option value="">Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Short Description (Title) */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Short Description *
                </label>
                <input
                  type="text"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    height: '44px'
                  }}
                  placeholder="Enter task title"
                  required
                />
              </div>

              {/* Long Description */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Long Description
                </label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                  placeholder="Enter detailed task description (optional)"
                />
              </div>

              {/* Deadline */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Deadline
                </label>
                <input
                  type="date"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    height: '44px'
                  }}
                />
              </div>

              {/* Status Dropdown */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Status *
                </label>
                <select
                  value={taskFormData.status}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    height: '44px'
                  }}
                  required
                >
                  <option value="Do">Do</option>
                  <option value="Doing">Doing</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ 
                    padding: '10px 20px', 
                    background: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Project Details Modal */}
      {viewingProject && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setViewingProject(null);
            setExpandedFields({});
          }
        }}>
          <div style={{
            background: 'white',
            padding: 32,
            borderRadius: 8,
            width: '90vw',
            maxWidth: '1200px',
            maxHeight: '90vh',
            aspectRatio: '16/9',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Project Details</h3>
                <button
                  onClick={() => generateStatusSummary(viewingProject)}
                  disabled={isGeneratingStatus}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: isGeneratingStatus ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingStatus ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isGeneratingStatus) {
                      (e.target as HTMLElement).style.backgroundColor = '#218838';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGeneratingStatus) {
                      (e.target as HTMLElement).style.backgroundColor = '#28a745';
                    }
                  }}
                >
                  {isGeneratingStatus ? 'Generating...' : 'Get Status'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Logo Display - Top Right */}
                {viewingProject.logoUrl && (
                  <div style={{ 
                    width: 80,
                    height: 80,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8f9fa'
                  }}>
                    <img 
                      src={viewingProject.logoUrl} 
                      alt="Project logo" 
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: 6
                      }} 
                    />
                  </div>
                )}
                <button 
                  onClick={() => {
                    setViewingProject(null);
                    setExpandedFields({});
                  }}
                  style={{ 
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    padding: 4,
                    lineHeight: 1,
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* 2-Row Layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
              
              {/* TOP ROW - Project Details (1/3) + Latest Status (2/3) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, flex: '1' }}>
                
                {/* LEFT - Project Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: '#333', borderBottom: '2px solid #007bff', paddingBottom: 8 }}>
                    Project Details
                  </h3>
                  
                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Description
                    </label>
                    <div style={{
                      padding: 12,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 13,
                      background: '#f8f9fa',
                      minHeight: '60px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {viewingProject.description || '-'}
                    </div>
                  </div>

                  {/* Status and Source - Side by Side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Status
                      </label>
                      <div style={{
                        padding: 12,
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 13,
                        background: '#f8f9fa',
                        minHeight: '20px'
                      }}>
                        {viewingProject.status || '-'}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Source
                      </label>
                      <div style={{
                        padding: 12,
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 13,
                        background: '#f8f9fa',
                        minHeight: '20px'
                      }}>
                        {viewingProject.source || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Monthly Impact and Type - Side by Side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Monthly Impact
                      </label>
                      <div style={{
                        padding: 12,
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 13,
                        background: '#f8f9fa',
                        minHeight: '20px'
                      }}>
                        {viewingProject.monthlyImpact || '-'}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Type
                      </label>
                      <div style={{
                        padding: 12,
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 13,
                        background: '#f8f9fa',
                        minHeight: '20px'
                      }}>
                        {viewingProject.type || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Hours Per Month */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Hours Per Month
                    </label>
                    <div style={{
                      padding: 12,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 13,
                      background: '#f8f9fa',
                      minHeight: '20px'
                    }}>
                      {viewingProject.hoursPerMonth || '-'}
                    </div>
                  </div>

                  {/* Updates - Collapsible */}
                  <div>
                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        marginBottom: 6, 
                        fontSize: 13, 
                        fontWeight: 500, 
                        color: '#333',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleFieldExpansion('updates')}
                    >
                      Updates
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: 12, 
                        color: '#666',
                        transform: expandedFields.updates ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }}>
                        ▶
                      </span>
                    </label>
                    <div style={{
                      padding: expandedFields.updates ? 12 : 8,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 13,
                      background: '#f8f9fa',
                      minHeight: expandedFields.updates ? '100px' : '20px',
                      maxHeight: expandedFields.updates ? '200px' : '20px',
                      overflow: expandedFields.updates ? 'auto' : 'hidden',
                      whiteSpace: expandedFields.updates ? 'pre-wrap' : 'nowrap',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleFieldExpansion('updates')}
                    >
                      {expandedFields.updates ? (
                        viewingProject.updates || 'No updates available'
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: '100%',
                          color: '#666',
                          fontSize: 12
                        }}>
                          Click to view updates
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT - Latest Status (2/3 width) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: '#333', borderBottom: '2px solid #28a745', paddingBottom: 8 }}>
                    Latest Status
                  </h3>
                  
                  <div style={{
                    padding: 16,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#f8f9fa',
                    minHeight: '300px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    flex: 1,
                    overflow: 'auto'
                  }}>
                    {viewingProject.latestStatus || 'No status available'}
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW - Tasks in 3 equal columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                
                {/* Do Tasks */}
                <div>
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: 16, 
                    fontWeight: 500, 
                    color: '#dc3545', 
                    borderBottom: '2px solid #dc3545', 
                    paddingBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    Do
                    <span style={{ 
                      fontSize: 14, 
                      background: '#dc3545', 
                      color: 'white', 
                      borderRadius: '50%', 
                      width: 24, 
                      height: 24, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {(() => {
                        const doTasks = tasks.filter(task => task.status === 'Do' && task.project === viewingProject.id);
                        return doTasks.length;
                      })()}
                    </span>
                  </h4>
                  <div style={{
                    padding: 16,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#fff5f5',
                    minHeight: '150px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {(() => {
                      const doTasks = tasks.filter(task => task.status === 'Do' && task.project === viewingProject.id);
                      return doTasks.length > 0 ? doTasks.map(task => `• ${task.title}`).join('\n') : 'No tasks';
                    })()}
                  </div>
                </div>

                {/* Doing Tasks */}
                <div>
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: 16, 
                    fontWeight: 500, 
                    color: '#ffc107', 
                    borderBottom: '2px solid #ffc107', 
                    paddingBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    Doing
                    <span style={{ 
                      fontSize: 14, 
                      background: '#ffc107', 
                      color: 'white', 
                      borderRadius: '50%', 
                      width: 24, 
                      height: 24, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {(() => {
                        const doingTasks = tasks.filter(task => task.status === 'Doing' && task.project === viewingProject.id);
                        return doingTasks.length;
                      })()}
                    </span>
                  </h4>
                  <div style={{
                    padding: 16,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#fffbf0',
                    minHeight: '150px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {(() => {
                      const doingTasks = tasks.filter(task => task.status === 'Doing' && task.project === viewingProject.id);
                      return doingTasks.length > 0 ? doingTasks.map(task => `• ${task.title}`).join('\n') : 'No tasks';
                    })()}
                  </div>
                </div>

                {/* Done Tasks */}
                <div>
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: 16, 
                    fontWeight: 500, 
                    color: '#28a745', 
                    borderBottom: '2px solid #28a745', 
                    paddingBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    Done
                    <span style={{ 
                      fontSize: 14, 
                      background: '#28a745', 
                      color: 'white', 
                      borderRadius: '50%', 
                      width: 24, 
                      height: 24, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {(() => {
                        const doneTasks = tasks.filter(task => task.status === 'Done' && task.project === viewingProject.id);
                        return doneTasks.length;
                      })()}
                    </span>
                  </h4>
                  <div style={{
                    padding: 16,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#f0fff4',
                    minHeight: '150px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {(() => {
                      const doneTasks = tasks.filter(task => task.status === 'Done' && task.project === viewingProject.id);
                      return doneTasks.length > 0 ? doneTasks.map(task => `• ${task.title}`).join('\n') : 'No tasks';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Preview Modal */}
      {showStatusPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowStatusPreviewModal(false);
            setStatusSummary('');
            setCurrentProject(null);
          }
        }}>
          <div style={{
            background: 'white',
            padding: 32,
            borderRadius: 8,
            width: '90vw',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
                AI Status Summary - {currentProject?.name}
              </h3>
              <button 
                onClick={() => {
                  setShowStatusPreviewModal(false);
                  setStatusSummary('');
                  setCurrentProject(null);
                }}
                style={{ 
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              padding: 20,
              marginBottom: 24,
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {statusSummary}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowStatusPreviewModal(false);
                  setStatusSummary('');
                  setCurrentProject(null);
                }}
                style={{
                  background: '#f8f9fa',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveStatusToLatestStatus}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Save to Latest Status
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}