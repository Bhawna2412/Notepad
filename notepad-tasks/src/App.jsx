import { useState, useEffect, useRef } from "react";
import "./App.css";
export default function App() {
  const [projectBrief, setProjectBrief] = useState("");
  const [notepadTabs, setNotepadTabs] = useState([{ id: 1, title: "Note 1", content: "" }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [savedNotesList, setSavedNotesList] = useState([]);
  const [openedNoteId, setOpenedNoteId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabTitle, setEditingTabTitle] = useState("");
  const [showSaveNoteModal, setShowSaveNoteModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [timeFilter, setTimeFilter] = useState("This Week");
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(null);
  const [taskDropdown, setTaskDropdown] = useState(null);
  const MAX_TASKS = 7;
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showGoToToday, setShowGoToToday] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const calendarSectionRef = useRef(null);
  const todayCardRef = useRef(null);

  const TASKS_STORAGE_KEY = "notepad_tasks_v1";
  const GROUPS_STORAGE_KEY = "notepad_groups_v1";
  const NOTES_STORAGE_KEY = "notepad_notes_v1";
  const NOTEPAD_TABS_KEY = "notepad_tabs_v1";
  const SAVED_NOTES_LIST_KEY = "notepad_saved_notes_v1";
  const BRIEF_STORAGE_KEY = "notepad_brief_v1";

  // Get dates for a wider, horizontally scrollable timeline
  function getTimelineDates() {
    const curr = new Date(selectedDate);
    const first = curr.getDate() - curr.getDay();
    const timelineStart = new Date(curr.setDate(first - 7));
    const totalDays = timeFilter === "Entire Month" ? 90 : 45;
    const dates = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(timelineStart);
      date.setDate(timelineStart.getDate() + i);
      dates.push(new Date(date));
    }
    return dates;
  }

  const timelineDates = getTimelineDates();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function getNextTaskId(currentTasks) {
    return currentTasks.length > 0 ? Math.max(...currentTasks.map((task) => task.id)) + 1 : 1;
  }

  function getWednesdayThisWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToWeekStart = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToWeekStart);
    const wednesday = new Date(weekStart);
    wednesday.setDate(weekStart.getDate() + 2);
    return wednesday.toISOString().split("T")[0];
  }

  function getWednesdayNextWeek() {
    const thisWeekWednesday = new Date(getWednesdayThisWeek());
    thisWeekWednesday.setDate(thisWeekWednesday.getDate() + 7);
    return thisWeekWednesday.toISOString().split("T")[0];
  }

  function get20thOfMonth() {
    const today = new Date();
    const twentieth = new Date(today.getFullYear(), today.getMonth(), 20);
    return twentieth.toISOString().split("T")[0];
  }

  function getDateRangeByFilter(filter) {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    if (filter === "This Week") {
      const start = new Date(now);
      start.setDate(now.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (filter === "Next Week") {
      const start = new Date(now);
      start.setDate(now.getDate() + mondayOffset + 7);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  function isTaskInTimeFilter(task) {
    if (!task.date) return false;
    const taskDate = new Date(task.date);
    taskDate.setHours(12, 0, 0, 0);
    const { start, end } = getDateRangeByFilter(timeFilter);
    return taskDate >= start && taskDate <= end;
  }

  function centerTodayInCalendar() {
    const container = calendarSectionRef.current;
    const todayCard = todayCardRef.current;
    if (!container || !todayCard) return;

    const targetScrollLeft = todayCard.offsetLeft - container.clientWidth / 2 + todayCard.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: "smooth" });
  }

  function scrollCalendarLeft() {
    const container = calendarSectionRef.current;
    if (!container) return;
    container.scrollBy({ left: -150, behavior: "smooth" });
  }

  function scrollCalendarRight() {
    const container = calendarSectionRef.current;
    if (!container) return;
    container.scrollBy({ left: 150, behavior: "smooth" });
  }

  // Simpler task generation
  function generateTasks(brief) {
    if (!brief.trim()) {
      return [];
    }

    const lowerBrief = brief.toLowerCase();
    if (lowerBrief.includes("article") || lowerBrief.includes("blog") || lowerBrief.includes("post")) {
      return ["Create structure", "Write article", "Proofread the document", "Publish the document"];
    }

    if (lowerBrief.includes("website") || lowerBrief.includes("web")) {
      return ["Create page structure", "Write main content", "Add styling", "Test on mobile", "Publish website"];
    }

    if (lowerBrief.includes("presentation") || lowerBrief.includes("slides")) {
      return ["Create outline", "Design slides", "Add key insights", "Rehearse", "Deliver presentation"];
    }

    if (lowerBrief.includes("report")) {
      return ["Collect data", "Create structure", "Write report", "Proofread", "Submit report"];
    }

    return ["Create structure", "Do the main work", "Review output", "Finalize and publish"];
  }

  function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    const id = Date.now();
    setGroups((prev) => [...prev, { id, name }]);
    setNewGroupName("");
    setEditingGroupId(null);
  }

  function deleteGroup(id) {
    setDeleteConfirmation(id);
  }

  function confirmDeleteGroup(id) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setTasks((prev) => prev.map((t) => (t.groupId === id ? { ...t, groupId: null } : t)));
    if (activeGroupId === id) setActiveGroupId(null);
    setEditingGroupId(null);
    setDeleteConfirmation(null);
  }

  function startRenameGroup(id, name) {
    setEditingGroupId(id);
    setEditingGroupName(name);
  }

  function saveRenameGroup(id) {
    if (!editingGroupName.trim()) {
      setEditingGroupId(null);
      return;
    }
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: editingGroupName.trim() } : g)));
    setEditingGroupId(null);
    setEditingGroupName("");
  }

  // Assign date to task
  function assignTaskDate(id, date) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, date } : t)));
  }

  // Assign group to task
  function assignTaskGroup(id, groupId) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, groupId } : t)));
  }

  function markSelectedAsDone() {
    setTasks((prev) =>
      prev.map((task) => (selectedTasks.has(task.id) ? { ...task, completed: true } : task))
    );
    setSelectedTasks(new Set());
  }

  // Handle panel resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (isResizing === "left") {
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setLeftPanelWidth(newWidth);
      } else if (isResizing === "right") {
        const windowWidth = window.innerWidth;
        const newWidth = Math.max(200, Math.min(500, windowWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Load persisted data once
  useEffect(() => {
    const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    const savedGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
    const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    const savedBrief = localStorage.getItem(BRIEF_STORAGE_KEY);

    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch {
        setTasks([]);
      }
    }

    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups));
      } catch {
        setGroups([]);
      }
    }

    const savedTabs = localStorage.getItem(NOTEPAD_TABS_KEY);
    if (savedTabs) {
      try {
        const tabs = JSON.parse(savedTabs);
        if (Array.isArray(tabs) && tabs.length > 0) {
          setNotepadTabs(tabs);
          setActiveTabId(tabs[0].id);
        }
      } catch {}
    } else if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        const content = typeof parsed === "string" ? parsed : "";
        setNotepadTabs([{ id: 1, title: "Note 1", content }]);
        setActiveTabId(1);
      } catch {
        setNotepadTabs([{ id: 1, title: "Note 1", content: "" }]);
        setActiveTabId(1);
      }
    }
    const savedList = localStorage.getItem(SAVED_NOTES_LIST_KEY);
    if (savedList) {
      try {
        setSavedNotesList(JSON.parse(savedList));
      } catch {
        setSavedNotesList([]);
      }
    }

    if (savedBrief) {
      try {
        setProjectBrief(JSON.parse(savedBrief));
      } catch {
        setProjectBrief("");
      }
    }
  }, []);

  // Persist tasks & groups
  useEffect(() => {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    if (notepadTabs.length > 0) {
      localStorage.setItem(NOTEPAD_TABS_KEY, JSON.stringify(notepadTabs));
    }
  }, [notepadTabs]);

  useEffect(() => {
    localStorage.setItem(SAVED_NOTES_LIST_KEY, JSON.stringify(savedNotesList));
  }, [savedNotesList]);

  useEffect(() => {
    localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(projectBrief));
  }, [projectBrief]);

  useEffect(() => {
    const container = calendarSectionRef.current;
    const todayCard = todayCardRef.current;
    if (!container || !todayCard) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowGoToToday(!entry.isIntersecting);
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    observer.observe(todayCard);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    centerTodayInCalendar();
  }, [timeFilter]);

  // Generate tasks from project brief without removing existing tasks
  useEffect(() => {
    if (!projectBrief.trim()) return;

    const generated = generateTasks(projectBrief).slice(0, MAX_TASKS);

    setTasks((prevTasks) => {
      const existingTextSet = new Set(prevTasks.map((task) => task.text.toLowerCase()));
      let nextId = getNextTaskId(prevTasks);

      const newItems = generated
        .filter((text) => !existingTextSet.has(text.toLowerCase()))
        .map((text) => ({
          id: nextId++,
          text,
          completed: false,
          groupId: activeGroupId,
          date: new Date().toISOString().split("T")[0],
          onHold: false,
        }));

      return [...prevTasks, ...newItems];
    });

    setEditingId(null);
  }, [projectBrief, activeGroupId]);

  // Toggle task completion
  function toggleTask(id) {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  // Delete task
  function deleteTask(id) {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    setEditingId(null);
  }

  // Start editing task
  function startEditTask(id, text) {
    setEditingId(id);
    setEditingText(text);
  }

  // Save edited task
  function saveEditTask(id) {
    if (editingText.trim() === "") {
      deleteTask(id);
      return;
    }
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, text: editingText } : task
      )
    );
    setEditingId(null);
    setEditingText("");
  }

  // Add new task
  function addNewTask() {
    if (newTaskText.trim() === "") return;
    const newId = getNextTaskId(tasks);
    setTasks((prevTasks) => [
      ...prevTasks,
      {
        id: newId,
        text: newTaskText,
        completed: false,
        groupId: activeGroupId,
        date: new Date().toISOString().split("T")[0],
        onHold: false,
      },
    ]);
    setNewTaskText("");
  }

  function getCurrentContent() {
    if (openedNoteId !== null) {
      const note = savedNotesList.find((n) => n.id === openedNoteId);
      return note ? note.content : "";
    }
    const tab = notepadTabs.find((t) => t.id === activeTabId);
    return tab ? tab.content : "";
  }

  function setCurrentContent(value) {
    if (openedNoteId !== null) {
      setSavedNotesList((prev) =>
        prev.map((n) => (n.id === openedNoteId ? { ...n, content: value } : n))
      );
      return;
    }
    setNotepadTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, content: value } : t))
    );
  }

  function getCurrentTabTitle() {
    const tab = notepadTabs.find((t) => t.id === activeTabId);
    return tab ? tab.title : "Note";
  }

  function addNotepadTab() {
    const nextId = Math.max(0, ...notepadTabs.map((t) => t.id)) + 1;
    setNotepadTabs((prev) => [...prev, { id: nextId, title: `Note ${nextId}`, content: "" }]);
    setActiveTabId(nextId);
    setOpenedNoteId(null);
  }

  function removeNotepadTab(id) {
    setNotepadTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      const rest = notepadTabs.filter((t) => t.id !== id);
      setActiveTabId(rest.length > 0 ? rest[0].id : null);
    }
  }

  function updateTabTitle(id, title) {
    setNotepadTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: title.trim() || t.title } : t))
    );
  }

  function startRenameTab(id, title) {
    setEditingTabId(id);
    setEditingTabTitle(title);
  }

  function saveRenameTab(id) {
    updateTabTitle(id, editingTabTitle);
    setEditingTabId(null);
    setEditingTabTitle("");
  }

  function saveAsNote() {
    const title = getCurrentTabTitle();
    const content = getCurrentContent();
    if (!title.trim() && !content.trim()) return;
    const nextId = Math.max(0, ...savedNotesList.map((n) => n.id)) + 1;
    setSavedNotesList((prev) => [...prev, { id: nextId, title: title.trim() || "Untitled", content }]);
    setShowSaveNoteModal(false);
  }

  function openNoteFromLeft(noteId) {
    setOpenedNoteId(noteId);
  }

  function closeOpenedNote() {
    setOpenedNoteId(null);
  }

  function updateOpenedNote() {
    if (openedNoteId === null) return;
    setSavedNotesList((prev) =>
      prev.map((n) => (n.id === openedNoteId ? { ...n, content: getCurrentContent() } : n))
    );
  }

  function startRenameNote(id, title) {
    setEditingNoteId(id);
    setEditingNoteTitle(title);
  }

  function saveRenameNote(id) {
    setSavedNotesList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title: editingNoteTitle.trim() || n.title } : n))
    );
    setEditingNoteId(null);
    setEditingNoteTitle("");
  }

  function deleteSavedNote(id) {
    setSavedNotesList((prev) => prev.filter((n) => n.id !== id));
    if (openedNoteId === id) setOpenedNoteId(null);
  }

  function addNoteAsTask() {
    const text = getCurrentContent().trim();
    if (!text) return;
    const summary = text.split("\n")[0].slice(0, 120);
    const newId = getNextTaskId(tasks);

    setTasks((prevTasks) => [
      ...prevTasks,
      {
        id: newId,
        text: summary,
        completed: false,
        groupId: activeGroupId,
        date: new Date().toISOString().split("T")[0],
        onHold: false,
      },
    ]);
  }

  // Assign task to on hold
  function toggleTaskOnHold(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, onHold: !t.onHold } : t)));
    setTaskDropdown(null);
  }

  const filteredByGroup = activeGroupId ? tasks.filter((task) => task.groupId === activeGroupId) : tasks;
  const filteredByTime = filteredByGroup.filter(isTaskInTimeFilter);
  const displayedTasks = filteredByTime.filter((task) => !task.onHold);
  const pendingTasks = displayedTasks.filter((task) => !task.completed);
  const completedTasks = displayedTasks.filter((task) => task.completed);
  const leftPendingTasks = filteredByTime.filter((task) => !task.completed);
  const leftCompletedTasks = filteredByTime.filter((task) => task.completed);
  const leftPanelTasks = [...leftPendingTasks, ...leftCompletedTasks];

  const onHoldTasks = tasks.filter((task) => task.onHold);

  function assignDatesToSelected(period) {
    let dueDate = "";
    if (period === "This Week") dueDate = getWednesdayThisWeek();
    if (period === "Next Week") dueDate = getWednesdayNextWeek();
    if (period === "Entire Month") dueDate = get20thOfMonth();

    setTasks((prev) =>
      prev.map((task) => (selectedTasks.has(task.id) ? { ...task, date: dueDate } : task))
    );
    setSelectedTasks(new Set());
  }

  function toggleSelectAll() {
    if (selectedTasks.size === pendingTasks.length) {
      setSelectedTasks(new Set());
      return;
    }
    setSelectedTasks(new Set(pendingTasks.map((task) => task.id)));
  }

  function toggleTaskSelection(id) {
    const next = new Set(selectedTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTasks(next);
  }

  return (
    <div className="app-container">
      {/* LEFT PANEL - Calendar & Groups */}
      <div className="left-panel" style={{ width: `${leftPanelWidth}px` }}>
        {/* Time Filter Buttons */}
        <div className="filters-section">
          <button className={`filter-btn ${timeFilter === "This Week" ? "active" : ""}`} onClick={() => setTimeFilter("This Week")}>This Week</button>
          <button className={`filter-btn ${timeFilter === "Next Week" ? "active" : ""}`} onClick={() => setTimeFilter("Next Week")}>Next Week</button>
          <button className={`filter-btn ${timeFilter === "Entire Month" ? "active" : ""}`} onClick={() => setTimeFilter("Entire Month")}>Entire Month</button>
        </div>

        {/* Tasks List */}
        <div className="left-reflect-list">
          {leftPanelTasks.length === 0 ? (
            <div className="left-reflect-empty">No tasks in selected period</div>
          ) : (
            leftPanelTasks.map((task) => (
              <div key={`left-${task.id}`} className={`left-reflect-item ${task.completed ? "completed" : ""}`}>
                <span className="left-reflect-text">{task.text}</span>
              </div>
            ))
          )}
        </div>

        {/* Saved Notes */}
        {savedNotesList.length > 0 && (
          <div className="left-notes-section">
            <div className="left-notes-header">Saved Notes</div>
            <div className="left-notes-list">
              {savedNotesList.map((note) => (
                <div
                  key={note.id}
                  className={`left-note-item ${openedNoteId === note.id ? "active" : ""}`}
                >
                  <div
                    className="left-note-row"
                    onClick={() => openNoteFromLeft(note.id)}
                  >
                    {editingNoteId === note.id ? (
                      <input
                        type="text"
                        className="left-note-title-input"
                        value={editingNoteTitle}
                        onChange={(e) => setEditingNoteTitle(e.target.value)}
                        onBlur={() => saveRenameNote(note.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRenameNote(note.id);
                          if (e.key === "Escape") { setEditingNoteId(null); setEditingNoteTitle(""); }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="left-note-title"
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startRenameNote(note.id, note.title);
                        }}
                      >
                        {note.title}
                      </span>
                    )}
                    <button
                      type="button"
                      className="left-reflect-delete-btn"
                      onClick={(e) => { e.stopPropagation(); deleteSavedNote(note.id); }}
                      title="Delete note"
                      aria-label="Delete"
                    >
                      ✕
                    </button>
                  </div>
                  {openedNoteId === note.id && (
                    <button
                      type="button"
                      className="left-note-close-btn"
                      onClick={(e) => { e.stopPropagation(); closeOpenedNote(); }}
                    >
                      Close note
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups Section */}
        <div className="filters-section">
          {groups.map((group) => (
            <button
              key={group.id}
              className={`filter-btn ${activeGroupId === group.id ? "active" : ""}`}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startRenameGroup(group.id, group.name);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                deleteGroup(group.id);
              }}
              onClick={() => setActiveGroupId(group.id)}
            >
              {editingGroupId === group.id ? (
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  onBlur={() => saveRenameGroup(group.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRenameGroup(group.id);
                    if (e.key === "Escape") setEditingGroupId(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className="group-inline-input"
                />
              ) : (
                group.name
              )}
            </button>
          ))}
        </div>

        {/* Create Group Section */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createGroup();
            }}
            placeholder="Create group"
            style={{
              flex: 1,
              border: "1px solid #dae5ec",
              borderRadius: "6px",
              padding: "8px 10px",
              fontSize: "12px",
              outline: "none",
            }}
          />
          <button
            onClick={createGroup}
            style={{
              border: "none",
              background: "#7ab8c4",
              color: "white",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Resize handle between left and center */}
      <div
        className="resize-handle vertical"
        onMouseDown={() => setIsResizing("left")}
        style={{ cursor: isResizing === "left" ? "col-resize" : "default" }}
      />

      {/* CENTER PANEL - Notepad */}
      <div className="center-panel">
        {/* Calendar Week View */}
        <div className="calendar-section" ref={calendarSectionRef}>
          <button 
            className="calendar-nav-btn left" 
            onClick={scrollCalendarLeft}
            title="Scroll left"
          >
            ‹
          </button>
          <div className="calendar-view">
            {timelineDates.map((date, idx) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const isSelected = selectedDate.toDateString() === date.toDateString();
              return (
                <div
                  key={idx}
                  ref={isToday ? todayCardRef : null}
                  className={`date-card ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedDate(new Date(date))}
                >
                  <div className="date-month">{months[date.getMonth()]}</div>
                  <div className="date-day">{date.getDate()}</div>
                  <div className="date-name">{dayNames[date.getDay()]}</div>
                </div>
              );
            })}
          </div>
          <button 
            className="calendar-nav-btn right" 
            onClick={scrollCalendarRight}
            title="Scroll right"
          >
            ›
          </button>
          {showGoToToday && (
            <div className="go-today-button-wrapper">
              <button className="go-today-btn" onClick={centerTodayInCalendar}>
                Go to Today
              </button>
            </div>
          )}
        </div>

        <div className="notepad-section">
          <div className="notepad-header">
            <h2>NOTEPAD</h2>
            <div className="notepad-tools">⋯</div>
          </div>
          <div className="notepad-tabs">
            {notepadTabs.map((tab) => (
              <div
                key={tab.id}
                className={`notepad-tab ${activeTabId === tab.id && openedNoteId === null ? "active" : ""}`}
                onClick={() => { setOpenedNoteId(null); setActiveTabId(tab.id); }}
              >
                {editingTabId === tab.id ? (
                  <input
                    type="text"
                    className="notepad-tab-title-input"
                    value={editingTabTitle}
                    onChange={(e) => setEditingTabTitle(e.target.value)}
                    onBlur={() => saveRenameTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRenameTab(tab.id);
                      if (e.key === "Escape") { setEditingTabId(null); setEditingTabTitle(""); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="notepad-tab-title"
                    onDoubleClick={(e) => { e.stopPropagation(); startRenameTab(tab.id, tab.title); }}
                  >
                    {tab.title}
                  </span>
                )}
                <button
                  type="button"
                  className="notepad-tab-close"
                  onClick={(e) => { e.stopPropagation(); removeNotepadTab(tab.id); }}
                  aria-label="Close tab"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="notepad-tab-add" onClick={addNotepadTab} aria-label="Add tab">
              +
            </button>
          </div>
          <textarea
            className="notepad-area"
            placeholder="Write your notes here..."
            value={getCurrentContent()}
            onChange={(e) => setCurrentContent(e.target.value)}
          />
          <div className="notepad-action-buttons">
            <button className="add-as-task-btn" onClick={addNoteAsTask}>
              Add as Task
            </button>
            <button
              className="save-as-notes-btn"
              onClick={() => (openedNoteId !== null ? updateOpenedNote() : setShowSaveNoteModal(true))}
            >
              {openedNoteId !== null ? "Update note" : "Save as Note"}
            </button>
          </div>
          {showSaveNoteModal && (
            <div className="confirmation-overlay" onClick={() => setShowSaveNoteModal(false)}>
              <div className="save-note-modal" onClick={(e) => e.stopPropagation()}>
                <div className="save-note-modal-title">Save as Note</div>
                <p className="save-note-modal-desc">
                  Save current notepad to the left panel. Title will be: <strong>{getCurrentTabTitle() || "Untitled"}</strong>
                </p>
                <div className="save-note-modal-actions">
                  <button className="save-note-standalone-btn" onClick={saveAsNote}>Save</button>
                  <button className="save-note-cancel-btn" onClick={() => setShowSaveNoteModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resize handle between center and right */}
      <div
        className="resize-handle vertical"
        onMouseDown={() => setIsResizing("right")}
        style={{ cursor: isResizing === "right" ? "col-resize" : "default" }}
      />

      {/* RIGHT PANEL - To Do List */}
      <div className="right-panel" style={{ width: `${rightPanelWidth}px` }}>
        <div className="task-panel">
          <div className="task-panel-header">
            <span>PENDING TO-DO</span>
            <button className="add-icon">+</button>
          </div>
          <input
            type="text"
            value={projectBrief}
            onChange={(e) => setProjectBrief(e.target.value)}
            placeholder="Enter project brief..."
            className="brief-input-right"
          />
          {pendingTasks.length > 0 && (
            <div className="task-header-actions">
              <button
                className={`select-all-btn ${selectedTasks.size > 0 ? "active" : ""}`}
                onClick={toggleSelectAll}
              >
                {selectedTasks.size === pendingTasks.length && pendingTasks.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </button>
              {selectedTasks.size > 1 && (
                <div className="bulk-action-buttons">
                  <button className="bulk-btn" onClick={() => assignDatesToSelected("This Week")}>
                    This Week
                  </button>
                  <button className="bulk-btn" onClick={() => assignDatesToSelected("Next Week")}>
                    Next Week
                  </button>
                  <button className="bulk-btn" onClick={() => assignDatesToSelected("Entire Month")}>
                    Month
                  </button>
                  <button className="bulk-btn bulk-done-btn" onClick={markSelectedAsDone}>
                    Mark Done
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="task-panel-list">
            {pendingTasks.length === 0 ? (
              <div className="no-tasks">No pending tasks for selected period</div>
            ) : (
              pendingTasks.map((task) => (
                <div key={task.id} className="task-panel-item">
                  <div className="task-content">
                    <div className="task-main">
                      <input
                        type="checkbox"
                        id={`task-${task.id}`}
                        checked={selectedTasks.size > 0 ? selectedTasks.has(task.id) : task.completed}
                        onChange={() => {
                          if (selectedTasks.size > 0) {
                            toggleTaskSelection(task.id);
                          } else {
                            toggleTask(task.id);
                          }
                        }}
                        className="task-checkbox"
                      />
                      {editingId === task.id ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={() => saveEditTask(task.id)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") saveEditTask(task.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="task-edit-input"
                          autoFocus
                        />
                      ) : (
                        <>
                          <label
                            htmlFor={`task-${task.id}`}
                            className={`task-label ${task.completed ? "completed" : ""}`}
                            onClick={() => startEditTask(task.id, task.text)}
                          >
                            {task.text}
                          </label>
                          <button
                            className="task-delete-btn"
                            onClick={() => deleteTask(task.id)}
                            title="Delete task"
                          >
                            ✕
                          </button>
                          <button
                            className="task-dropdown-btn"
                            onClick={() => setTaskDropdown(taskDropdown === task.id ? null : task.id)}
                            title="Task options"
                          >
                            ▼
                          </button>
                        </>
                      )}
                    </div>
                    {taskDropdown === task.id && (
                      <div className="task-dropdown-menu">
                        <div className="task-dropdown-item">
                          <label>Due Date:</label>
                          <input
                            type="date"
                            value={task.date || ""}
                            onChange={(e) => {
                              assignTaskDate(task.id, e.target.value);
                              setTaskDropdown(null);
                            }}
                            className="task-dropdown-input"
                          />
                        </div>
                        <div className="task-dropdown-item">
                          <label>Group:</label>
                          <select
                            value={task.groupId || ""}
                            onChange={(e) => {
                              assignTaskGroup(task.id, e.target.value ? parseInt(e.target.value) : null);
                              setTaskDropdown(null);
                            }}
                            className="task-dropdown-select"
                          >
                            <option value="">No Group</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div
                          className="task-dropdown-item task-dropdown-action"
                          onClick={() => {
                            toggleTaskOnHold(task.id);
                          }}
                        >
                          Keep On Hold
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* On Hold Tasks Section */}
          {onHoldTasks.length > 0 && (
            <div className="on-hold-section">
              <div className="on-hold-header">On Hold</div>
              <div className="on-hold-list">
                {onHoldTasks.map((task) => (
                  <div key={task.id} className="task-panel-item on-hold-item">
                    <div className="task-content">
                      <div className="task-main">
                        <input
                          type="checkbox"
                          id={`task-${task.id}`}
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          className="task-checkbox"
                        />
                        <label
                          htmlFor={`task-${task.id}`}
                          className={`task-label ${task.completed ? "completed" : ""}`}
                          onClick={() => startEditTask(task.id, task.text)}
                        >
                          {task.text}
                        </label>
                        <button
                          className="task-delete-btn"
                          onClick={() => deleteTask(task.id)}
                          title="Delete task"
                        >
                          ✕
                        </button>
                        <button
                          className="task-dropdown-btn"
                          onClick={() => toggleTaskOnHold(task.id)}
                          title="Resume task"
                        >
                          ⟲
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Task Input in task panel */}
          <div className="add-task-bottom">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") addNewTask();
              }}
              placeholder="+ Add task"
              className="add-task-inline"
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation !== null && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <div className="confirmation-title">Delete Group?</div>
            <div className="confirmation-message">Are you sure you want to delete this group?</div>
            <div className="confirmation-buttons">
              <button
                className="confirmation-btn confirmation-yes"
                onClick={() => confirmDeleteGroup(deleteConfirmation)}
              >
                Yes
              </button>
              <button
                className="confirmation-btn confirmation-no"
                onClick={() => setDeleteConfirmation(null)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}