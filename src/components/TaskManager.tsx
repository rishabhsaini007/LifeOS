import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../utils/dateUtils';
import type { Task } from '../context/AppContext';
import { 
  CheckSquare, 
  Square,
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  Grid,
  Calendar,
  X 
} from 'lucide-react';

export const TaskManager: React.FC = () => {
  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask,
    moveTaskQuadrant 
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getLocalDateString());
  const [dueTime, setDueTime] = useState('18:00');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [category, setCategory] = useState('Work');
  const [status, setStatus] = useState<Task['status']>('Not started');
  const [progress, setProgress] = useState(0);
  const [matrixQuadrant, setMatrixQuadrant] = useState<Task['matrixQuadrant']>('q1');

  // Interactive View: Board vs List vs Priority Matrix
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  const handleOpenModal = (task?: Task, defaultQuad?: Task['matrixQuadrant']) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDescription(task.description);
      setDueDate(task.dueDate);
      setDueTime(task.dueTime || '18:00');
      setPriority(task.priority);
      setCategory(task.category);
      setStatus(task.status);
      setProgress(task.progress);
      setMatrixQuadrant(task.matrixQuadrant);
    } else {
      setEditingTask(null);
      setTitle('');
      setDescription('');
      setDueDate(getLocalDateString());
      setDueTime('18:00');
      setPriority('Medium');
      setCategory('Work');
      setStatus('Not started');
      setProgress(0);
      setMatrixQuadrant(defaultQuad || 'q1');
    }
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title,
      description,
      dueDate,
      dueTime: dueTime || undefined,
      priority,
      category,
      status,
      progress: status === 'Completed' ? 100 : status === 'In progress' ? progress : 0,
      matrixQuadrant
    };

    try {
      if (editingTask) {
        await updateTask({ ...data, id: editingTask.id });
      } else {
        await addTask(data);
      }
      setModalOpen(false);
    } catch (error: any) {
      console.error("Error saving task:", error);
      alert(`Failed to save task: ${error.message || error}`);
    }
  };

  // --- HTML5 Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDrop = async (e: React.DragEvent, targetQuadrant: Task['matrixQuadrant']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await moveTaskQuadrant(taskId, targetQuadrant);
    }
  };

  // Grouping tasks by quadrant
  const getTasksByQuadrant = (quad: Task['matrixQuadrant']) => {
    return tasks.filter(t => t.matrixQuadrant === quad);
  };

  const quadrantsConfig = [
    { id: 'q1' as const, title: '1. Important + Urgent', label: 'Do Immediately', className: 'quadrant-q1' },
    { id: 'q2' as const, title: '2. Important + Not Urgent', label: 'Plan / Schedule', className: 'quadrant-q2' },
    { id: 'q3' as const, title: '3. Not Important + Urgent', label: 'Quick Action / Delegate', className: 'quadrant-q3' },
    { id: 'q4' as const, title: '4. Not Important + Not Urgent', label: 'Later / Drop', className: 'quadrant-q4' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Task Management</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Sort tasks using the Eisenhower Priority Matrix to optimize your focus.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.2rem' }}>
            <button 
              className={`btn ${viewMode === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
              onClick={() => setViewMode('matrix')}
            >
              <Grid size={14} /> Matrix Grid
            </button>
            <button 
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
              onClick={() => setViewMode('list')}
            >
              <Layers size={14} /> Plain List
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> New Task
          </button>
        </div>
      </div>

      {/* 1. 2x2 PRIORITY MATRIX VIEW */}
      {viewMode === 'matrix' && (
        <div className="priority-matrix">
          {quadrantsConfig.map((q) => {
            const qTasks = getTasksByQuadrant(q.id);
            return (
              <div 
                key={q.id} 
                className={`matrix-quadrant ${q.className}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, q.id)}
              >
                <div className="quadrant-header">
                  <div>
                    <span style={{ fontSize: '0.85rem', display: 'block' }}>{q.title}</span>
                    <strong style={{ fontSize: '0.95rem' }}>{q.label}</strong>
                  </div>
                  <button 
                    className="theme-toggle" 
                    style={{ padding: '0.25rem' }} 
                    onClick={() => handleOpenModal(undefined, q.id)}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="quadrant-content">
                  {qTasks.length === 0 ? (
                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                      Drag tasks here
                    </div>
                  ) : (
                    qTasks.map((t) => (
                      <div 
                        key={t.id} 
                        className="glass-card" 
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        style={{ 
                          padding: '0.75rem', 
                          cursor: 'grab', 
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          opacity: t.status === 'Completed' ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <button 
                            className="theme-toggle" 
                            style={{ padding: 0, marginTop: '0.15rem', color: t.status === 'Completed' ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}
                            onClick={async () => {
                              try {
                                await updateTask({ ...t, status: t.status === 'Completed' ? 'Not started' : 'Completed' });
                              } catch (err: any) {
                                alert(`Failed to update task: ${err.message}`);
                              }
                            }}
                          >
                            {t.status === 'Completed' ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: '0.85rem', textDecoration: t.status === 'Completed' ? 'line-through' : 'none', wordBreak: 'break-word' }}>
                              {t.title}
                            </strong>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                            <button className="theme-toggle" style={{ padding: '0.1rem' }} onClick={() => handleOpenModal(t)}>
                              <Edit3 size={12} />
                            </button>
                            <button className="theme-toggle" style={{ padding: '0.1rem' }} onClick={() => deleteTask(t.id)}>
                              <Trash2 size={12} className="text-danger" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-between" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Calendar size={10} /> {t.dueDate}
                          </span>
                          <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                        </div>

                        {t.status === 'In progress' && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              <span>Progress</span>
                              <span>{t.progress}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div style={{ width: `${t.progress}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                            </div>
                          </div>
                        )}
                        
                        {/* Selector for mobile users to move quadrant easily without drag */}
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Move to:</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {['q1', 'q2', 'q3', 'q4'].map((quad) => (
                              quad !== t.matrixQuadrant && (
                                <button
                                  key={quad}
                                  className="btn btn-secondary"
                                  style={{ padding: '0 0.2rem', fontSize: '0.6rem', height: '14px', minWidth: 0, borderRadius: '2px' }}
                                  onClick={() => moveTaskQuadrant(t.id, quad as any)}
                                >
                                  {quad.toUpperCase()}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. PLAIN LIST VIEW */}
      {viewMode === 'list' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 className="section-title"><CheckSquare size={18} className="text-primary" /> Full Tasks Registry</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {tasks.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '3rem 0', fontSize: '0.85rem' }}>
                No tasks available. Click "New Task" to create one.
              </p>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="glass-card flex-between"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)',
                    padding: '1rem 1.25rem',
                    opacity: task.status === 'Completed' ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                    <button 
                      className="theme-toggle" 
                      style={{ padding: 0, marginTop: '0.2rem', color: task.status === 'Completed' ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}
                      onClick={async () => {
                        try {
                          await updateTask({ ...task, status: task.status === 'Completed' ? 'Not started' : 'Completed' });
                        } catch (err: any) {
                          alert(`Failed to update task: ${err.message}`);
                        }
                      }}
                    >
                      {task.status === 'Completed' ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>
                        {task.title}
                      </h3>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{task.description}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <span className="badge badge-low" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        Due: {task.dueDate} {task.dueTime}
                      </span>
                      <span className={`badge badge-${task.priority.toLowerCase()}`}>
                        Priority: {task.priority}
                      </span>
                      <span className="badge badge-low">
                        Status: {task.status}
                      </span>
                      <span className="badge badge-low" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                        Quadrant: {task.matrixQuadrant.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="theme-toggle" onClick={() => handleOpenModal(task)}>
                      <Edit3 size={16} />
                    </button>
                    <button className="theme-toggle text-danger" onClick={() => deleteTask(task.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Task Creation / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">{editingTask ? 'Modify Task Details' : 'Register New Task'}</h2>
              <button className="theme-toggle" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Task Title</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g. Finish chemistry project"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Brief specifics"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Due Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Due Time</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={dueTime} 
                      onChange={(e) => setDueTime(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Category</label>
                    <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="Work">Work</option>
                      <option value="Study">Study</option>
                      <option value="Personal">Personal</option>
                      <option value="Health">Health</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Priority</label>
                    <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Status</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                      <option value="Not started">Not started</option>
                      <option value="In progress">In progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Eisenhower Quadrant</label>
                    <select className="form-control" value={matrixQuadrant} onChange={(e) => setMatrixQuadrant(e.target.value as any)}>
                      <option value="q1">Q1: Important + Urgent (Do First)</option>
                      <option value="q2">Q2: Important + Not Urgent (Plan)</option>
                      <option value="q3">Q3: Not Important + Urgent (Quick Action)</option>
                      <option value="q4">Q4: Not Important + Not Urgent (Later)</option>
                    </select>
                  </div>
                </div>

                {status === 'In progress' && (
                  <div className="form-group">
                    <label>Progress slider ({progress}%)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={progress} 
                      onChange={(e) => setProgress(Number(e.target.value))} 
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TaskManager;
