/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  ShoppingBag, 
  Package, 
  CheckSquare, 
  ListTodo,
  Plus,
  Trash2,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO,
  isValid
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Item {
  id: string;
  text: string;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date?: string; // ISO format
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO format
  type: 'manual' | 'task';
}

interface AppState {
  tabTitles: string[];
  toPurchase: Item[];
  toPack: Item[];
  packed: Item[];
  todo: Task[];
  events: CalendarEvent[];
}

const DEFAULT_STATE: AppState = {
  tabTitles: ['To Purchase', 'To Pack', 'Packed', 'To do', 'Calendar'],
  toPurchase: [],
  toPack: [],
  packed: [],
  todo: [],
  events: []
};

// --- Main App Component ---
export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('trip_packer_state');
    return saved ? JSON.parse(saved) : DEFAULT_STATE;
  });

  const [activeTab, setActiveTab] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState<number | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Persistence
  useEffect(() => {
    localStorage.setItem('trip_packer_state', JSON.stringify(state));
  }, [state]);

  // Actions
  const updateTabTitle = (index: number, newTitle: string) => {
    const newTitles = [...state.tabTitles];
    newTitles[index] = newTitle;
    setState({ ...state, tabTitles: newTitles });
    setIsEditingTitle(null);
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: Item = { id: crypto.randomUUID(), text: newItemText.trim() };
    const newTask: Task = { id: crypto.randomUUID(), text: newItemText.trim(), completed: false };

    if (activeTab === 0) {
      setState({ ...state, toPurchase: [...state.toPurchase, newItem] });
    } else if (activeTab === 1) {
      setState({ ...state, toPack: [...state.toPack, newItem] });
    } else if (activeTab === 2) {
      setState({ ...state, packed: [...state.packed, newItem] });
    } else if (activeTab === 3) {
      setState({ ...state, todo: [...state.todo, newTask] });
    }
    setNewItemText('');
  };

  const deleteItem = (id: string, listName: 'toPurchase' | 'toPack' | 'packed' | 'todo') => {
    setState({
      ...state,
      [listName]: (state[listName] as any[]).filter((item: any) => item.id !== id)
    });
  };

  const moveItem = (id: string, from: 'toPurchase' | 'toPack' | 'packed') => {
    if (from === 'toPurchase') {
      const item = state.toPurchase.find(i => i.id === id);
      if (item) {
        setState({
          ...state,
          toPurchase: state.toPurchase.filter(i => i.id !== id),
          toPack: [...state.toPack, item]
        });
      }
    } else if (from === 'toPack') {
      // User request: "second to first"
      const item = state.toPack.find(i => i.id === id);
      if (item) {
        setState({
          ...state,
          toPack: state.toPack.filter(i => i.id !== id),
          toPurchase: [...state.toPurchase, item]
        });
      }
    } else if (from === 'packed') {
      // User request: "third to first"
      const item = state.packed.find(i => i.id === id);
      if (item) {
        setState({
          ...state,
          packed: state.packed.filter(i => i.id !== id),
          toPurchase: [...state.toPurchase, item]
        });
      }
    }
  };

  const toggleTask = (id: string) => {
    setState({
      ...state,
      todo: state.todo.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    });
  };

  const updateTaskDate = (id: string, date: string) => {
    setState({
      ...state,
      todo: state.todo.map(task => 
        task.id === id ? { ...task, date } : task
      )
    });
  };

  // --- Components ---

  const TabButton = ({ index, icon: Icon }: { index: number; icon: any }) => (
    <div className="relative group">
      <button
        onClick={() => setActiveTab(index)}
        className={cn(
          "flex items-center gap-2 px-0 py-3 transition-colors duration-300 relative uppercase tracking-widest text-[12px] font-semibold",
          activeTab === index 
            ? "text-sage" 
            : "text-muted hover:text-sage/60"
        )}
      >
        <Icon size={14} className="opacity-50" />
        {isEditingTitle === index ? (
          <input
            autoFocus
            className="bg-transparent border-none focus:ring-0 w-24 outline-none"
            value={state.tabTitles[index]}
            onChange={(e) => {
              const newTitles = [...state.tabTitles];
              newTitles[index] = e.target.value;
              setState({ ...state, tabTitles: newTitles });
            }}
            onBlur={() => setIsEditingTitle(null)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(null)}
          />
        ) : (
          <span className="whitespace-nowrap">{state.tabTitles[index]}</span>
        )}
        {activeTab === index && (
          <motion.div 
            layoutId="tabUnderline"
            className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-sage"
          />
        )}
      </button>
      {!isEditingTitle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditingTitle(index);
          }}
          className="absolute -top-1 -right-4 p-1 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 size={10} />
        </button>
      )}
    </div>
  );

  const ChecklistItem = ({ item, from, ...props }: { item: Item; from: 'toPurchase' | 'toPack' | 'packed' } & { key?: string }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-4 py-4 border-b border-sand/30 group"
      {...props}
    >
      <button 
        onClick={() => moveItem(item.id, from)}
        className={cn(
          "w-5 h-5 border-2 border-sand rounded-md flex items-center justify-center transition-all hover:border-sage",
          from === 'packed' && "bg-sage border-sage"
        )}
      >
        {from === 'packed' && <span className="text-white text-[10px]">✓</span>}
      </button>
      <span className="flex-1 text-ink text-[16px]">{item.text}</span>
      <button 
        onClick={() => deleteItem(item.id, from)}
        className="opacity-0 group-hover:opacity-100 p-2 text-muted hover:text-warm transition-all"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );

  const TodoItem = ({ task, ...props }: { task: Task } & { key?: string }) => (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-4 py-4 border-b border-sand/30 transition-all duration-300 group",
        task.completed && "opacity-50"
      )}
      {...props}
    >
      <button 
        onClick={() => toggleTask(task.id)}
        className={cn(
          "w-5 h-5 border-2 border-sand rounded-md flex items-center justify-center transition-all",
          task.completed ? "bg-sage border-sage" : "hover:border-sage"
        )}
      >
        {task.completed && <span className="text-white text-[10px]">✓</span>}
      </button>
      <div className="flex-1 flex flex-col">
        <span className={cn(
          "text-[16px] transition-all",
          task.completed ? "line-through text-muted" : "text-ink"
        )}>
          {task.text}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="date"
            className="text-[10px] bg-sand/20 px-2 py-0.5 rounded text-muted border-none outline-none focus:ring-0 cursor-pointer"
            value={task.date || ''}
            onChange={(e) => updateTaskDate(task.id, e.target.value)}
          />
        </div>
      </div>
      <button 
        onClick={() => deleteItem(task.id, 'todo')}
        className="opacity-0 group-hover:opacity-100 p-2 text-muted hover:text-warm transition-all"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );

  // --- Render Tabs ---
  const renderList = () => {
    let items: Item[] = [];
    let from: 'toPurchase' | 'toPack' | 'packed' = 'toPurchase';
    
    if (activeTab === 0) { items = state.toPurchase; from = 'toPurchase'; }
    if (activeTab === 1) { items = state.toPack; from = 'toPack'; }
    if (activeTab === 2) { items = state.packed; from = 'packed'; }

    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <AnimatePresence mode="popLayout">
          {items.map(item => (
            <ChecklistItem key={item.id} item={item} from={from} />
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <p className="text-lg">No items here yet.</p>
            <p className="text-sm">Add something using the bar above!</p>
          </div>
        )}
      </div>
    );
  };

  const renderTodo = () => {
    const sortedTodo = [...state.todo].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });

    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <AnimatePresence mode="popLayout">
          {sortedTodo.map(task => (
            <TodoItem key={task.id} task={task} />
          ))}
        </AnimatePresence>
        {state.todo.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <p className="text-lg">Your checklist is empty.</p>
            <p className="text-sm">Note down tasks with optional dates.</p>
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Consolidate events including tasks with dates
    const allEvents = [
      ...state.events,
      ...state.todo.filter(t => t.date).map(t => ({
        id: t.id,
        title: t.text,
        date: t.date!,
        type: 'task' as const,
        completed: t.completed
      }))
    ];

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    return (
      <div className="w-full max-w-4xl mx-auto px-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800 capitalize">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-3xl overflow-hidden border border-slate-100 shadow-xl">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-white p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            const dayEvents = allEvents.filter(e => isSameDay(parseISO(e.date), day));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "bg-white min-h-[120px] p-2 transition-all group relative border-t border-slate-50",
                  !isCurrentMonth && "bg-slate-50/50 opacity-40"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                    isToday ? "bg-indigo-600 text-white" : "text-slate-500"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(e => (
                    <div 
                      key={e.id} 
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-md truncate font-medium",
                        e.type === 'task' ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700",
                        (e as any).completed && "line-through opacity-50"
                      )}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-slate-400 font-medium pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
                
                {/* Add event button on hover */}
                {isCurrentMonth && (
                  <button 
                    onClick={() => {
                        const title = prompt('Enter event title:');
                        if (title) {
                          setState({
                            ...state,
                            events: [...state.events, {
                              id: crypto.randomUUID(),
                              title,
                              date: format(day, 'yyyy-MM-dd'),
                              type: 'manual'
                            }]
                          });
                        }
                    }}
                    className="absolute bottom-2 right-2 p-1 rounded-full bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex gap-6 justify-center">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            Checklist Task
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            Manual Event
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Header */}
      <header className="pt-12 pb-8 px-6 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4"
        >
          <Package size={14} />
          Packing Companion
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Trip <span className="text-indigo-600">Packer</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-md mx-auto">
          Your ultimate travel organization toolkit. Plan, pack, and stay on schedule.
        </p>
      </header>

      {/* Tabs Navigation */}
      <nav className="sticky top-0 z-50 py-4 px-2 mb-10 overflow-x-auto no-scrollbar">
        <div className="max-w-fit mx-auto bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-1 shadow-sm border border-white/40">
          <TabButton index={0} icon={ShoppingBag} />
          <TabButton index={1} icon={Package} />
          <TabButton index={2} icon={CheckCircle2} />
          <TabButton index={3} icon={ListTodo} />
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />
          <TabButton index={4} icon={CalendarIcon} />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto">
        {activeTab !== 4 && (
          <div className="max-w-2xl mx-auto mb-10 px-4">
            <form onSubmit={addItem} className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                {activeTab === 3 ? <CheckSquare size={20} /> : <Plus size={20} />}
              </div>
              <input
                type="text"
                placeholder={activeTab === 3 ? "Add a new task..." : "What do you need to add?"}
                className="w-full pl-14 pr-6 py-5 bg-white rounded-3xl shadow-lg shadow-indigo-500/5 border-none outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-700 text-lg placeholder:text-slate-300"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
              />
            </form>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab < 3 && renderList()}
            {activeTab === 3 && renderTodo()}
            {activeTab === 4 && renderCalendar()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="mt-20 text-center text-slate-400 text-xs pb-10">
        <p>&copy; 2026 TripPacker. Your data is saved locally.</p>
        <div className="mt-4 flex justify-center gap-4">
          <button className="hover:text-indigo-500 transition-colors">Help</button>
          <button className="hover:text-indigo-500 transition-colors">Privacy</button>
          <button 
            onClick={() => {
              if(confirm('Are you sure you want to clear all data?')) {
                setState(DEFAULT_STATE);
              }
            }}
            className="text-rose-400 hover:text-rose-600 transition-colors"
          >
            Reset App
          </button>
        </div>
      </footer>
    </div>
  );
}
