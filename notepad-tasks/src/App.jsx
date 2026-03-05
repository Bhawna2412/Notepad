import { useState, useEffect, useRef } from "react";
import "./App.css";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export default function App() {
  const [projectBrief, setProjectBrief] = useState("");
  const [notes, setNotes] = useState("");
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
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showGoToToday, setShowGoToToday] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [taskDeleteConfirmation, setTaskDeleteConfirmation] = useState(null);
  const [showBulkDatePicker, setShowBulkDatePicker] = useState(false);
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [expandedLeftTaskId, setExpandedLeftTaskId] = useState(null);
  const [expandedChecklistTaskIds, setExpandedChecklistTaskIds] = useState(new Set());
  const [editingChecklistKey, setEditingChecklistKey] = useState(null);
  const [editingChecklistLabel, setEditingChecklistLabel] = useState("");
  const [taskDetailModalId, setTaskDetailModalId] = useState(null);
  const [expandedTextView, setExpandedTextView] = useState(null); // { taskId, field: 'title' | 'details', itemId? }
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [calendarPickerViewDate, setCalendarPickerViewDate] = useState(new Date());
  const [savedNotes, setSavedNotes] = useState([]); // { id, content, createdAt }
  const [saveNoteModal, setSaveNoteModal] = useState(null);
  const [showAttachToTaskPanel, setShowAttachToTaskPanel] = useState(false);
  const [clearNotepadConfirm, setClearNotepadConfirm] = useState(false);
  const [noteContextMenu, setNoteContextMenu] = useState(null); // { noteId, x, y } for right-click "Attach to task"
  const [attachNoteToTaskId, setAttachNoteToTaskId] = useState(null); // when attaching a saved note from context menu
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [notepadTabs, setNotepadTabs] = useState([{ id: 1, title: "Untitled", content: "", savedNoteId: null }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileIdState] = useState(null);
  const [theme, setTheme] = useState("light");
  const [templates, setTemplates] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSubtasks, setNewTemplateSubtasks] = useState([{ label: "", detailsPlaceholder: "" }]);
  const [highlighterColors, setHighlighterColors] = useState(["#ff0000", "#ffff00", "#00ff00", "", "", "", ""]);
  const [highlighterIndex, setHighlighterIndex] = useState(1);
  const [defaultHighlighterIndex, setDefaultHighlighterIndex] = useState(1);
  const [showHighlighterPanel, setShowHighlighterPanel] = useState(false);
  const [highlighterMode, setHighlighterMode] = useState(false);
  const [highlighterCustomHex, setHighlighterCustomHex] = useState(["", "", "", ""]);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabTitle, setEditingTabTitle] = useState("");
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authFullName, setAuthFullName] = useState("");
  const [accountDisplayName, setAccountDisplayName] = useState("");
  const [accountNameSaving, setAccountNameSaving] = useState(false);
  const [editingDisplayNameInBar, setEditingDisplayNameInBar] = useState(false);
  const [displayNameEditValue, setDisplayNameEditValue] = useState("");
  const displayNameInputRef = useRef(null);
  const tabTitleInputRef = useRef(null);
  const calendarSectionRef = useRef(null);
  const calendarViewRef = useRef(null);
  const todayCardRef = useRef(null);
  const notepadEditorRef = useRef(null);
  const notepadInitializedRef = useRef(false);
  const highlighterPanelRef = useRef(null);
  const highlighterModeRef = useRef(highlighterMode);
  highlighterModeRef.current = highlighterMode;
  const goToTodayRequestedRef = useRef(false);
  const hasLoadedFromStorageRef = useRef(false);

  const TASKS_STORAGE_KEY = "notepad_tasks_v1";
  const GROUPS_STORAGE_KEY = "notepad_groups_v1";
  const NOTES_STORAGE_KEY = "notepad_notes_v1";
  const BRIEF_STORAGE_KEY = "notepad_brief_v1";
  const SAVED_NOTES_STORAGE_KEY = "notepad_saved_notes_v1";
  const PROFILE_LIST_KEY = "notepad_profiles_v1";
  const ACTIVE_PROFILE_KEY = "notepad_active_profile_v1";
  const PROFILE_DATA_PREFIX = "notepad_profile_data_";

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

  function getCalendarPickerDays(viewDate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const daysInMonth = last.getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length < 42) cells.push(null);
    return cells.slice(0, 42);
  }

  function getNextTaskId(currentTasks) {
    return currentTasks.length > 0 ? Math.max(...currentTasks.map((task) => task.id)) + 1 : 1;
  }

  function getChecklistDetailsSize(label) {
    if (!label) return null;
    const LARGE = ["Add Source Material", "Generate Prompt for writing", "Notes"];
    const SMALL = ["Confluence Draft", "Galaxy Draft"];
    if (LARGE.some((l) => label.trim() === l)) return "large";
    if (SMALL.some((l) => label.trim() === l)) return "small";
    return null;
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
    const container = calendarViewRef.current;
    const todayCard = todayCardRef.current;
    if (!container || !todayCard) return;

    const targetScrollLeft = todayCard.offsetLeft - container.clientWidth / 2 + todayCard.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: "smooth" });
  }

  function scrollCalendarLeft() {
    const container = calendarViewRef.current;
    if (!container) return;
    container.scrollBy({ left: -150, behavior: "smooth" });
  }

  function scrollCalendarRight() {
    const container = calendarViewRef.current;
    if (!container) return;
    container.scrollBy({ left: 150, behavior: "smooth" });
  }

  // Generate one task with checklist (subtasks) from project brief. Used when user submits brief (e.g. Enter).
  function generateTaskWithChecklist(brief) {
    if (!brief.trim()) return null;

    const lowerBrief = brief.toLowerCase();
    const title = brief.trim().slice(0, 120);
    let steps = [];

    if (lowerBrief.includes("article") || lowerBrief.includes("blog") || lowerBrief.includes("post")) {
      steps = [
        "Add Source Material",
        "Generate Prompt for writing",
        "Confluence Draft",
        "Galaxy Draft",
      ];
    } else if (lowerBrief.includes("website") || lowerBrief.includes("web")) {
      steps = [
        "Gather requirements & content",
        "Create page structure",
        "Add styling and assets",
        "Test and publish",
      ];
    } else if (lowerBrief.includes("presentation") || lowerBrief.includes("slides")) {
      steps = [
        "Gather key points",
        "Create outline",
        "Design slides",
        "Rehearse and deliver",
      ];
    } else if (lowerBrief.includes("report")) {
      steps = [
        "Collect data and sources",
        "Create structure",
        "Write draft",
        "Review and submit",
      ];
    } else if (lowerBrief.includes("integration") || lowerBrief.includes("api")) {
      steps = [
        "Review documentation",
        "Set up connection",
        "Implement and test",
        "Document and deploy",
      ];
    } else {
      steps = [
        "Gather requirements",
        "Create structure or plan",
        "Do the main work",
        "Review and finalize",
      ];
    }

    return { title, steps };
  }

  function addBriefAsTaskWithChecklist() {
    const title = projectBrief.trim().slice(0, 120);
    if (!title) return;

    const briefLower = projectBrief.trim().toLowerCase();
    const matchingTemplates = templates.filter(
      (t) => t.name && briefLower.includes(t.name.trim().toLowerCase())
    );
    const bestTemplate = matchingTemplates.length > 0
      ? matchingTemplates.reduce((a, b) => (a.name.length >= b.name.length ? a : b))
      : null;

    let steps = [];
    if (bestTemplate && bestTemplate.subtasks && bestTemplate.subtasks.length > 0) {
      steps = bestTemplate.subtasks.map((s) => ({
        label: s.label || "Subtask",
        details: s.detailsPlaceholder || "",
      }));
    }
    if (steps.length === 0) {
      const result = generateTaskWithChecklist(projectBrief);
      if (!result) return;
      steps = result.steps.map((label) => ({ label, details: "" }));
    }

    const newId = getNextTaskId(tasks);
    const checklistIds = steps.map((_, i) => newId * 100 + i);
    const checklist = steps.map((step, i) => ({
      id: checklistIds[i],
      label: typeof step === "string" ? step : step.label,
      details: typeof step === "string" ? "" : step.details || "",
      completed: false,
    }));

    setTasks((prev) => [
      ...prev,
      {
        id: newId,
        text: title,
        completed: false,
        groupId: activeGroupId,
        date: new Date().toISOString().split("T")[0],
        onHold: false,
        checklist,
      },
    ]);
    setProjectBrief("");
  }

  function updateChecklistItem(taskId, itemId, field, value) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.checklist) return t;
        return {
          ...t,
          checklist: t.checklist.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item
          ),
        };
      })
    );
  }

  function toggleChecklistItemComplete(taskId, itemId) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.checklist) return t;
        return {
          ...t,
          checklist: t.checklist.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          ),
        };
      })
    );
  }

  function removeChecklistItem(taskId, itemId) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.checklist) return t;
        const next = t.checklist.filter((item) => item.id !== itemId);
        return { ...t, checklist: next.length > 0 ? next : undefined };
      })
    );
    if (editingChecklistKey === `${taskId}-${itemId}`) {
      setEditingChecklistKey(null);
      setEditingChecklistLabel("");
    }
  }

  function startEditChecklistLabel(taskId, itemId, currentLabel) {
    setEditingChecklistKey(`${taskId}-${itemId}`);
    setEditingChecklistLabel(currentLabel || "");
  }

  function saveEditChecklistLabel(taskId, itemId) {
    const trimmed = editingChecklistLabel.trim();
    if (trimmed === "") {
      removeChecklistItem(taskId, itemId);
    } else {
      updateChecklistItem(taskId, itemId, "label", trimmed);
    }
    setEditingChecklistKey(null);
    setEditingChecklistLabel("");
  }

  function addChecklistItem(taskId) {
    const newItem = {
      id: Date.now(),
      label: "",
      details: "",
      completed: false,
    };
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextList = t.checklist ? [...t.checklist, newItem] : [newItem];
        return { ...t, checklist: nextList };
      })
    );
    setExpandedChecklistTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    setEditingChecklistKey(`${taskId}-${newItem.id}`);
    setEditingChecklistLabel("");
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

  function deleteSelectedTasks() {
    setTasks((prev) => prev.filter((task) => !selectedTasks.has(task.id)));
    setSelectedTasks(new Set());
  }

  function assignBulkDueDate() {
    if (!bulkDueDate) return;
    setTasks((prev) =>
      prev.map((task) => (selectedTasks.has(task.id) ? { ...task, date: bulkDueDate } : task))
    );
    setSelectedTasks(new Set());
    setBulkDueDate("");
    setShowBulkDatePicker(false);
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

  function loadProfileDataIntoState(profileId) {
    const key = PROFILE_DATA_PREFIX + profileId + "_v1";
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.tasks) setTasks(data.tasks);
        if (data.groups) setGroups(data.groups);
        if (data.notes != null) setNotes(data.notes);
        if (data.projectBrief != null) setProjectBrief(data.projectBrief);
        if (data.savedNotes) setSavedNotes(data.savedNotes);
        if (data.theme) setTheme(data.theme);
        if (data.templates) setTemplates(data.templates);
        if (data.notepadTabs && data.notepadTabs.length > 0) {
          setNotepadTabs(data.notepadTabs);
          if (data.activeTabId != null) setActiveTabId(data.activeTabId);
        }
      } catch {
        // keep defaults
      }
    } else {
      setTasks([]);
      setGroups([]);
      setNotes("");
      setProjectBrief("");
      setSavedNotes([]);
      setNotepadTabs([{ id: 1, title: "Untitled", content: "", savedNoteId: null }]);
      setActiveTabId(1);
    }
  }

  function setActiveProfileId(profileId) {
    setActiveProfileIdState(profileId);
    localStorage.setItem(ACTIVE_PROFILE_KEY, String(profileId));
    loadProfileDataIntoState(profileId);
  }

  function createNewProfileAndSwitch(id, name) {
    setProfiles((prev) => [...prev, { id, name }]);
    setActiveProfileIdState(id);
    localStorage.setItem(ACTIVE_PROFILE_KEY, String(id));
    setTasks([]);
    setGroups([]);
    setNotes("");
    setProjectBrief("");
    setSavedNotes([]);
    setNotepadTabs([{ id: 1, title: "Untitled", content: "", savedNoteId: null }]);
    setActiveTabId(1);
    setTheme("light");
    setTemplates([]);
    const key = PROFILE_DATA_PREFIX + id + "_v1";
    localStorage.setItem(key, JSON.stringify({
      tasks: [],
      groups: [],
      notes: "",
      projectBrief: "",
      savedNotes: [],
      notepadTabs: [{ id: 1, title: "Untitled", content: "", savedNoteId: null }],
      activeTabId: 1,
      theme: "light",
      templates: [],
    }));
  }

  async function loadUserDataFromSupabase(userId) {
    if (!supabase) return;
    const { data, error } = await supabase.from("user_data").select("data").eq("id", userId).single();
    if (error && error.code !== "PGRST116") return;
    const payload = data?.data || {};
    if (payload.tasks) setTasks(payload.tasks);
    if (payload.groups) setGroups(payload.groups || []);
    if (payload.notes != null) setNotes(payload.notes);
    if (payload.projectBrief != null) setProjectBrief(payload.projectBrief);
    if (payload.savedNotes) setSavedNotes(payload.savedNotes);
    if (payload.theme) setTheme(payload.theme);
    if (payload.templates) setTemplates(payload.templates);
    if (payload.notepadTabs?.length) {
      setNotepadTabs(payload.notepadTabs);
      if (payload.activeTabId != null) setActiveTabId(payload.activeTabId);
    }
  }

  async function saveUserDataToSupabase(userId, data) {
    if (!supabase) return;
    await supabase.from("user_data").upsert(
      { id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  }

  function loadLocalProfilesAndData() {
    let savedProfiles = [];
    try {
      const p = localStorage.getItem(PROFILE_LIST_KEY);
      if (p) savedProfiles = JSON.parse(p);
    } catch {}
    let savedActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (savedProfiles.length === 0) {
      const defaultProfile = { id: "default", name: "Default" };
      setProfiles([defaultProfile]);
      localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify([defaultProfile]));
      setActiveProfileIdState("default");
      loadProfileDataIntoState("default");
      return;
    }
    setProfiles(savedProfiles);
    if (savedActiveId && savedProfiles.some((pr) => String(pr.id) === String(savedActiveId))) {
      setActiveProfileIdState(savedActiveId);
      loadProfileDataIntoState(savedActiveId);
    } else {
      const firstId = savedProfiles[0].id;
      setActiveProfileIdState(firstId);
      localStorage.setItem(ACTIVE_PROFILE_KEY, String(firstId));
      loadProfileDataIntoState(firstId);
    }
  }

  // Load profiles and active profile once; then load profile data
  useEffect(() => {
    let savedProfiles = [];
    try {
      const p = localStorage.getItem(PROFILE_LIST_KEY);
      if (p) savedProfiles = JSON.parse(p);
    } catch {}
    let savedActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY);

    if (savedProfiles.length === 0) {
      const defaultProfile = { id: "default", name: "Default" };
      setProfiles([defaultProfile]);
      localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify([defaultProfile]));
      savedActiveId = "default";
      setActiveProfileIdState("default");
      localStorage.setItem(ACTIVE_PROFILE_KEY, "default");
      const oldTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      const oldGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
      const oldNotes = localStorage.getItem(NOTES_STORAGE_KEY);
      const oldBrief = localStorage.getItem(BRIEF_STORAGE_KEY);
      const oldSavedNotes = localStorage.getItem(SAVED_NOTES_STORAGE_KEY);
      const data = {
        tasks: oldTasks ? JSON.parse(oldTasks) : [],
        groups: oldGroups ? JSON.parse(oldGroups) : [],
        notes: oldNotes || "",
        projectBrief: oldBrief ? JSON.parse(oldBrief) : "",
        savedNotes: oldSavedNotes ? JSON.parse(oldSavedNotes) : [],
        notepadTabs: [{ id: 1, title: "Untitled", content: oldNotes || "", savedNoteId: null }],
        activeTabId: 1,
        theme: "light",
        templates: [],
      };
      localStorage.setItem(PROFILE_DATA_PREFIX + "default_v1", JSON.stringify(data));
      setTasks(data.tasks);
      setGroups(data.groups);
      setNotes(data.notes);
      setProjectBrief(data.projectBrief);
      setSavedNotes(data.savedNotes);
      setNotepadTabs(data.notepadTabs);
      setActiveTabId(1);
      setTheme("light");
      setTemplates([]);
      hasLoadedFromStorageRef.current = true;
      return;
    }
    setProfiles(savedProfiles);
    if (savedActiveId && savedProfiles.some((pr) => String(pr.id) === String(savedActiveId))) {
      setActiveProfileIdState(savedActiveId);
      loadProfileDataIntoState(savedActiveId);
    } else {
      const firstId = savedProfiles[0].id;
      setActiveProfileIdState(firstId);
      localStorage.setItem(ACTIVE_PROFILE_KEY, String(firstId));
      loadProfileDataIntoState(firstId);
    }
    hasLoadedFromStorageRef.current = true;
  }, []);

  // Auth state: when logged in, use Supabase data; when logged out, use local
  async function setUserFromSession(session) {
    if (!session?.user) return;
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    const u = freshUser || session.user;
    setUser(u);
    setProfiles([{ id: u.id, name: u.email || "Account" }]);
    setActiveProfileIdState(u.id);
    loadUserDataFromSupabase(u.id);
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserFromSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUserFromSession(session);
      else {
        setUser(null);
        loadLocalProfilesAndData();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Persist current profile data when app state changes (only after initial load to avoid overwriting saved data)
  useEffect(() => {
    if (!hasLoadedFromStorageRef.current || activeProfileId == null) return;
    const data = {
      tasks,
      groups,
      notes,
      projectBrief,
      savedNotes,
      notepadTabs,
      activeTabId,
      theme,
      templates,
    };
    const key = PROFILE_DATA_PREFIX + activeProfileId + "_v1";
    localStorage.setItem(key, JSON.stringify(data));
    if (user?.id && String(activeProfileId) === String(user.id)) {
      saveUserDataToSupabase(user.id, data);
    }
  }, [
    activeProfileId,
    user?.id,
    tasks,
    groups,
    notes,
    projectBrief,
    savedNotes,
    notepadTabs,
    activeTabId,
    theme,
    templates,
  ]);

  useEffect(() => {
    if (!hasLoadedFromStorageRef.current) return;
    if (profiles.length > 0) localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (showProfileModal && user) setAccountDisplayName(user.user_metadata?.full_name || "");
  }, [showProfileModal, user]);

  useEffect(() => {
    if (!showHighlighterPanel) return;
    const close = (e) => {
      if (highlighterPanelRef.current && !highlighterPanelRef.current.contains(e.target)) setShowHighlighterPanel(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showHighlighterPanel]);

  useEffect(() => {
    const container = calendarViewRef.current;
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

  useEffect(() => {
    if (goToTodayRequestedRef.current) {
      goToTodayRequestedRef.current = false;
      requestAnimationFrame(() => centerTodayInCalendar());
    }
  }, [selectedDate]);

  useEffect(() => {
    if (
      taskDetailModalId !== null &&
      !tasks.some((t) => t.id === taskDetailModalId)
    ) {
      setTaskDetailModalId(null);
    }
  }, [taskDetailModalId, tasks]);

  useEffect(() => {
    if (
      expandedTextView !== null &&
      !tasks.some((t) => t.id === expandedTextView.taskId)
    ) {
      setExpandedTextView(null);
    }
  }, [expandedTextView, tasks]);

  // Tasks from brief are created only when user presses Enter in the brief input (addBriefAsTaskWithChecklist).

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
    setTaskDeleteConfirmation(null);
  }

  function confirmDeleteTask() {
    if (taskDeleteConfirmation !== null) {
      deleteTask(taskDeleteConfirmation);
    }
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

  function getNotepadPlainText() {
    const html = notes.trim();
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html.replace(/<br\s*\/?>/gi, "\n");
    return (temp.textContent || temp.innerText || "").trim();
  }

  function addNoteAsTask() {
    const plainText = getNotepadPlainText();
    if (!plainText) return;
    const lines = plainText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const dateStr = new Date().toISOString().split("T")[0];
    let nextId = getNextTaskId(tasks);

    const newTasks = lines.map((line) => ({
      id: nextId++,
      text: line.slice(0, 120),
      completed: false,
      groupId: activeGroupId,
      date: dateStr,
      onHold: false,
    }));

    setTasks((prevTasks) => [...prevTasks, ...newTasks]);
    setNotes("");
    if (notepadEditorRef.current) notepadEditorRef.current.innerHTML = "";
  }

  useEffect(() => {
    if (!notepadEditorRef.current) return;
    if (notes === "") {
      notepadEditorRef.current.innerHTML = "";
      return;
    }
    if (!notepadInitializedRef.current) {
      notepadEditorRef.current.innerHTML = notes;
      notepadInitializedRef.current = true;
    }
  }, [notes]);

  function execNotepadCommand(cmd, value = null) {
    notepadEditorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (notepadEditorRef.current) setNotes(notepadEditorRef.current.innerHTML);
  }

  function normalizeHexInput(v) {
    const s = (v || "").trim().replace(/^#/, "");
    if (/^[0-9A-Fa-f]{6}$/.test(s)) return "#" + s.toLowerCase();
    if (/^[0-9A-Fa-f]{3}$/.test(s))
      return "#" + s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    return null;
  }

  function getHighlighterColor() {
    const color = highlighterColors[highlighterIndex];
    return color || highlighterColors[defaultHighlighterIndex] || "#ffff00";
  }

  function applyHighlightToLine(el) {
    const editor = notepadEditorRef.current;
    if (!el || !editor || el === editor || !editor.contains(el)) return;
    const color = getHighlighterColor();
    const current = el.style.backgroundColor;
    if (current && current !== "transparent" && current !== "") {
      el.style.backgroundColor = "";
    } else {
      el.style.backgroundColor = color;
    }
    if (notepadEditorRef.current) setNotes(notepadEditorRef.current.innerHTML);
  }

  const BLOCK_TAGS = ["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6"];

  function findLineElementFromNode(editor, target) {
    if (!target || !editor.contains(target)) return null;
    let node = target;
    while (node && node !== editor) {
      if (node.nodeType === 1) {
        const tag = node.tagName?.toUpperCase();
        if (BLOCK_TAGS.includes(tag)) return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function findLineElementFromSelection(editor) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node = sel.anchorNode;
    if (!node || !editor.contains(node)) return null;
    while (node && node !== editor) {
      if (node.nodeType === 1) {
        const tag = node.tagName?.toUpperCase();
        if (BLOCK_TAGS.includes(tag)) return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function applyHighlightToLineBlock(editor, range, color) {
    const div = document.createElement("div");
    div.style.backgroundColor = color;
    div.className = "notepad-line-highlight";
    range.collapse(true);
    const contents = range.extractContents();
    div.appendChild(contents);
    range.insertNode(div);
    if (editor) setNotes(editor.innerHTML);
  }

  function stripHighlightFromEmptyBlocks(editor) {
    if (!editor) return;
    editor.querySelectorAll(".notepad-line-highlight").forEach((el) => {
      if ((el.textContent || "").trim() !== "") return;
      const frag = document.createDocumentFragment();
      while (el.firstChild) frag.appendChild(el.firstChild);
      el.parentNode?.replaceChild(frag, el);
    });
    editor.querySelectorAll(".notepad-line-highlight, [style*='background']").forEach((el) => {
      if (el === editor) return;
      if ((el.textContent || "").trim() !== "") return;
      const bg = el.style?.backgroundColor;
      if (bg && bg !== "transparent" && bg !== "") {
        el.style.backgroundColor = "";
        if (!el.style.length) el.removeAttribute("style");
      }
    });
  }

  function expandRangeToLine(editor, range) {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    if (!editor.contains(startContainer)) return false;

    function findLineStart(node, offset) {
      if (node === editor) return { node: editor, offset: 0 };
      if (node.nodeType === 3) {
        let current = node;
        while (current) {
          const prev = current.previousSibling;
          if (!prev) {
            if (current.parentNode === editor) return { node: editor, offset: 0 };
            const parent = current.parentNode;
            const idx = Array.from(parent.childNodes).indexOf(current);
            return findLineStart(parent, idx);
          }
          if (prev.nodeName === "BR") return { node: current, offset: 0 };
          if (prev.nodeType === 3) current = prev;
          else current = prev.lastChild || prev;
        }
        return { node: editor, offset: 0 };
      }
      const idx = offset > 0 ? offset - 1 : 0;
      const child = node.childNodes[idx];
      if (!child) return { node, offset: 0 };
      return findLineStart(child, child.nodeType === 3 ? child.length : child.childNodes.length);
    }

    function findLineEnd(node, offset) {
      if (node === editor) return { node: editor, offset: editor.childNodes.length };
      if (node.nodeType === 3) {
        let current = node;
        while (current) {
          const next = current.nextSibling;
          if (!next) {
            if (current.parentNode === editor) return { node: current, offset: current.length };
            const parent = current.parentNode;
            const idx = Array.from(parent.childNodes).indexOf(current) + 1;
            return findLineEnd(parent, idx);
          }
          if (next.nodeName === "BR") return { node: current, offset: current.length };
          if (next.nodeType === 3) current = next;
          else current = next.firstChild || next;
        }
        return { node: editor, offset: editor.childNodes.length };
      }
      const child = node.childNodes[offset];
      if (!child) return { node, offset: node.nodeType === 3 ? node.length : node.childNodes.length };
      return findLineEnd(child, 0);
    }

    try {
      const start = findLineStart(startContainer, range.startOffset);
      const end = findLineEnd(endContainer, range.endOffset);
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      return true;
    } catch (_) {
      return false;
    }
  }

  function isSingleLineBlock(editor, blockEl) {
    if (!blockEl || blockEl.parentNode !== editor) return true;
    return !blockEl.innerHTML.includes("<br");
  }

  function handleNotepadClickForHighlighter(e) {
    if (!highlighterModeRef.current || !notepadEditorRef.current) return;
    const editor = notepadEditorRef.current;
    if (!editor.contains(e.target)) return;

    let lineEl = findLineElementFromNode(editor, e.target);
    if (lineEl && !isSingleLineBlock(editor, lineEl)) lineEl = null;
    if (lineEl) {
      e.preventDefault();
      e.stopPropagation();
      applyHighlightToLine(lineEl);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(() => {
      if (!highlighterModeRef.current || !notepadEditorRef.current) return;
      const ed = notepadEditorRef.current;
      let blockEl = findLineElementFromSelection(ed);
      if (blockEl && !isSingleLineBlock(ed, blockEl)) blockEl = null;
      if (blockEl) {
        applyHighlightToLine(blockEl);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !ed.contains(sel.anchorNode)) return;
      const range = sel.getRangeAt(0).cloneRange();
      if (!expandRangeToLine(ed, range)) return;
      const color = getHighlighterColor();
      const startNode = range.startContainer;
      const startEl = startNode.nodeType === 3 ? startNode.parentElement : startNode;
      const existing = startEl?.closest?.(".notepad-line-highlight");
      if (existing && existing.style?.backgroundColor) {
        existing.style.backgroundColor = "";
        if (!existing.style.length) existing.removeAttribute("style");
        const frag = document.createDocumentFragment();
        while (existing.firstChild) frag.appendChild(existing.firstChild);
        existing.parentNode?.replaceChild(frag, existing);
      } else {
        applyHighlightToLineBlock(ed, range, color);
      }
      setNotes(ed.innerHTML);
    });
  }

  function clearNotepad() {
    setNotes("");
    if (notepadEditorRef.current) notepadEditorRef.current.innerHTML = "";
  }

  function plainTextToHtml(plain) {
    return plain.replace(/\n/g, "<br>");
  }

  function switchNotepadTab(tabId) {
    const tab = notepadTabs.find((t) => t.id === tabId);
    if (!tab) return;
    setActiveTabId(tabId);
    setNotes(tab.content);
    notepadInitializedRef.current = false;
  }

  function addNewNotepadTab() {
    const newId = Date.now();
    const newTab = { id: newId, title: "Untitled", content: "", savedNoteId: null };
    setNotepadTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setNotes("");
    notepadInitializedRef.current = false;
    if (notepadEditorRef.current) notepadEditorRef.current.innerHTML = "";
  }

  function closeNotepadTab(tabId, e) {
    e.stopPropagation();
    const idx = notepadTabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    const nextTabs = notepadTabs.filter((t) => t.id !== tabId);
    if (nextTabs.length === 0) {
      const newTab = { id: Date.now(), title: "Untitled", content: "", savedNoteId: null };
      setNotepadTabs([newTab]);
      setActiveTabId(newTab.id);
      setNotes("");
      if (notepadEditorRef.current) notepadEditorRef.current.innerHTML = "";
      return;
    }
    setNotepadTabs(nextTabs);
    if (activeTabId === tabId) {
      const newActive = nextTabs[Math.max(0, idx - 1)];
      setActiveTabId(newActive.id);
      setNotes(newActive.content);
      notepadInitializedRef.current = false;
    }
  }

  function openNoteInNotepad(note) {
    const existing = notepadTabs.find((t) => t.savedNoteId === note.id);
    const title = note.title || note.content.split("\n")[0]?.slice(0, 60) || "Note";
    const content = plainTextToHtml(note.content);
    if (existing) {
      setNotepadTabs((prev) =>
        prev.map((t) => (t.id === existing.id ? { ...t, title, content } : t))
      );
      setActiveTabId(existing.id);
      setNotes(content);
      notepadInitializedRef.current = false;
      return;
    }
    const newId = Date.now();
    const newTab = { id: newId, title, content, savedNoteId: note.id };
    setNotepadTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setNotes(content);
    notepadInitializedRef.current = false;
  }

  function startRenameNote(id, title) {
    setEditingNoteId(id);
    setEditingNoteTitle(title || "");
  }

  function saveRenameNote(id) {
    setSavedNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const newTitle = (editingNoteTitle || n.title || "").trim();
        return { ...n, title: newTitle || n.content?.split("\n")[0]?.slice(0, 60) || "Untitled" };
      })
    );
    setEditingNoteId(null);
    setEditingNoteTitle("");
  }

  function saveNoteAsStandalone() {
    const plainText = getNotepadPlainText();
    if (!plainText) return;
    const activeTab = notepadTabs.find((t) => t.id === activeTabId);
    const title = (activeTab?.title?.trim() || plainText.split("\n")[0]?.slice(0, 60) || "Untitled").trim();
    const newNote = {
      id: Date.now(),
      title,
      content: plainText,
      createdAt: new Date().toISOString(),
    };
    setSavedNotes((prev) => [newNote, ...prev]);
    if (activeTab) {
      setNotepadTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, savedNoteId: newNote.id } : t))
      );
    }
    setSaveNoteModal(false);
  }

  function updateLinkedNote() {
    const activeTab = notepadTabs.find((t) => t.id === activeTabId);
    if (!activeTab?.savedNoteId) return;
    const plainText = getNotepadPlainText();
    const title = (activeTab?.title?.trim() || plainText.split("\n")[0]?.slice(0, 60) || "Untitled").trim();
    setSavedNotes((prev) =>
      prev.map((n) =>
        n.id === activeTab.savedNoteId ? { ...n, title, content: plainText } : n
      )
    );
  }

  function clearCurrentTabContent() {
    setNotes("");
    if (notepadEditorRef.current) notepadEditorRef.current.innerHTML = "";
    setNotepadTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, content: "", title: "Untitled" } : t))
    );
    setClearNotepadConfirm(false);
  }

  function attachSavedNoteToTask(noteId, taskId) {
    const note = savedNotes.find((n) => n.id === noteId);
    if (!note || !taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const existingNotesItem = task.checklist?.find((item) => item.label === "Notes");
    if (existingNotesItem) {
      const appendedDetails = [existingNotesItem.details, note.content].filter(Boolean).join("\n\n");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                checklist: t.checklist.map((item) =>
                  item.id === existingNotesItem.id ? { ...item, details: appendedDetails } : item
                ),
              }
            : t
        )
      );
    } else {
      const newItemId = task.id * 1000 + (task.checklist?.length ?? 0);
      const notesItem = {
        id: newItemId,
        label: "Notes",
        details: note.content,
        completed: false,
      };
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, checklist: [...(t.checklist || []), notesItem] } : t
        )
      );
    }
    setExpandedChecklistTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    setNoteContextMenu(null);
    setAttachNoteToTaskId(null);
  }

  function saveNoteToTask(taskId) {
    const plainText = getNotepadPlainText();
    if (!plainText) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const existingNotesItem = task.checklist?.find((item) => item.label === "Notes");
    if (existingNotesItem) {
      const appendedDetails = [existingNotesItem.details, plainText].filter(Boolean).join("\n\n");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                checklist: t.checklist.map((item) =>
                  item.id === existingNotesItem.id ? { ...item, details: appendedDetails } : item
                ),
              }
            : t
        )
      );
    } else {
      const newItemId = task.id * 1000 + (task.checklist?.length ?? 0);
      const notesItem = {
        id: newItemId,
        label: "Notes",
        details: plainText,
        completed: false,
      };
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, checklist: [...(t.checklist || []), notesItem] }
            : t
        )
      );
    }
    setExpandedChecklistTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    clearNotepad();
    setSaveNoteModal(false);
    setShowAttachToTaskPanel(false);
  }

  function deleteSavedNote(id) {
    setSavedNotes((prev) => prev.filter((n) => n.id !== id));
    if (expandedNoteId === id) setExpandedNoteId(null);
  }

  // Assign task to on hold
  function toggleTaskOnHold(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, onHold: !t.onHold } : t)));
    setTaskDropdown(null);
  }

  // Right panel: pending to-do list shows ALL pending tasks (filtered by group only when a group is selected). Time filter does NOT apply here.
  const filteredByGroup = activeGroupId ? tasks.filter((task) => task.groupId === activeGroupId) : tasks;
  const pendingTasks = filteredByGroup.filter((task) => !task.onHold && !task.completed);
  // Left panel: This Week / Next Week / Entire Month act as filter only for the left panel task list
  const leftFilteredByTime = tasks.filter(isTaskInTimeFilter).filter((task) => !task.onHold);
  const leftCompletedTasks = leftFilteredByTime.filter((task) => task.completed);
  const leftPanelTasks = leftCompletedTasks;

  function toggleChecklistExpanded(taskId) {
    setExpandedChecklistTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  const onHoldTasks = tasks.filter((task) => task.onHold);


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
    <div className={`app-container theme-${theme}`}>
      {/* Profile & Settings entry */}
      <div className="app-top-bar">
        <div className="app-top-bar-left">
          {isSupabaseConfigured() && (
            user ? (
              <>
                {editingDisplayNameInBar ? (
                  <input
                    ref={displayNameInputRef}
                    type="text"
                    className="top-bar-display-name-input"
                    placeholder="Your name"
                    value={displayNameEditValue}
                    onChange={(e) => setDisplayNameEditValue(e.target.value)}
                    onBlur={async () => {
                      const name = displayNameEditValue.trim();
                      const { data } = await supabase.auth.updateUser({ data: { full_name: name || null } });
                      if (data?.user) setUser(data.user);
                      setEditingDisplayNameInBar(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.target.blur();
                      } else if (e.key === "Escape") {
                        setDisplayNameEditValue(user.user_metadata?.full_name || user.user_metadata?.name || "");
                        setEditingDisplayNameInBar(false);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className="top-bar-display-name-btn"
                    onClick={() => {
                      setDisplayNameEditValue(user.user_metadata?.full_name || user.user_metadata?.name || "");
                      setEditingDisplayNameInBar(true);
                      setTimeout(() => displayNameInputRef.current?.focus(), 0);
                    }}
                    title={user.user_metadata?.full_name ? "Click to change name" : "Click to set your name (instead of email)"}
                  >
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account"}
                  </button>
                )}
                <button type="button" className="top-bar-btn" onClick={async () => { await supabase.auth.signOut(); setShowAuthModal(false); }} title="Sign out">
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" className="top-bar-btn" onClick={() => { setAuthMode("signin"); setAuthError(""); setAuthEmail(""); setAuthPassword(""); setShowAuthModal(true); }} title="Sign in or create account">
                Login
              </button>
            )
          )}
          <button
            type="button"
            className="top-bar-btn"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          >
            {theme === "light" ? "Dark Theme" : "Light Theme"}
          </button>
          <button type="button" className="top-bar-btn" onClick={() => setShowSettingsModal(true)} title="Settings">
            Settings
          </button>
          <button
            type="button"
            className="top-bar-btn"
            onClick={() => {
              setCalendarPickerViewDate(new Date(selectedDate));
              setShowCalendarPicker(true);
            }}
          >
            View Calendar
          </button>
          {(showGoToToday || selectedDate.toDateString() !== new Date().toDateString()) && (
            <button
              type="button"
              className="top-bar-btn"
              onClick={() => {
                goToTodayRequestedRef.current = true;
                setSelectedDate(new Date());
              }}
            >
              Go to Today
            </button>
          )}
        </div>
        <div className="app-top-bar-right" style={{ width: `${rightPanelWidth + 4}px` }}>
          {user ? (
            <span className="app-current-profile" title="Signed in as">{user.email}</span>
          ) : activeProfileId ? (
            <span className="app-current-profile">
              {profiles.find((p) => String(p.id) === String(activeProfileId))?.name || "Profile"}
            </span>
          ) : null}
        </div>
      </div>
      <div className="app-main">
      {/* LEFT PANEL - Calendar & Groups */}
      <div className="left-panel" style={{ width: `${leftPanelWidth}px` }}>
        {/* Time Filter Buttons */}
        <div className="filters-section">
          <button className={`filter-btn ${timeFilter === "This Week" ? "active" : ""}`} onClick={() => setTimeFilter("This Week")}>This Week</button>
          <button className={`filter-btn ${timeFilter === "Next Week" ? "active" : ""}`} onClick={() => setTimeFilter("Next Week")}>Next Week</button>
          <button className={`filter-btn ${timeFilter === "Entire Month" ? "active" : ""}`} onClick={() => setTimeFilter("Entire Month")}>Entire Month</button>
        </div>

        {/* Saved Notes (standalone) */}
        {savedNotes.length > 0 && (
          <div className="left-notes-section">
            <div className="left-notes-header">Notes</div>
            <div className="left-notes-list">
              {savedNotes.map((note) => {
                const displayTitle = note.title || note.content.split("\n")[0]?.slice(0, 60) || "(Empty)";
                const isExpanded = expandedNoteId === note.id;
                const isEditing = editingNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className="left-note-item"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setNoteContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY });
                    }}
                  >
                    <div className="left-note-row">
                      <button
                        type="button"
                        className="left-reflect-expand-btn"
                        onClick={(e) => { e.stopPropagation(); setExpandedNoteId(isExpanded ? null : note.id); }}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                      {isEditing ? (
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
                          onClick={() => openNoteInNotepad(note)}
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startRenameNote(note.id, note.title || note.content.split("\n")[0]?.slice(0, 60) || "");
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openNoteInNotepad(note); }}
                        >
                          {displayTitle}{displayTitle.length > 60 ? "…" : ""}
                        </span>
                      )}
                      <button
                        type="button"
                        className="left-reflect-delete-btn"
                        onClick={(e) => { e.stopPropagation(); deleteSavedNote(note.id); }}
                        title="Delete note"
                      >
                        ✕
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="left-note-content">{note.content}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="left-tasks-section">
          <div className="left-tasks-header">Completed Tasks</div>
          <div className="left-reflect-list">
          {leftPanelTasks.length === 0 ? (
            <div className="left-reflect-empty">No tasks in selected period</div>
          ) : (
            leftPanelTasks.map((task) => {
              const isExpanded = expandedLeftTaskId === task.id;
              const hasChecklist = task.checklist && task.checklist.length > 0;
              return (
                <div key={`left-${task.id}`} className={`left-reflect-item ${task.completed ? "completed" : ""}`}>
                  <div className="left-reflect-row">
                    {hasChecklist && (
                      <button
                        type="button"
                        className="left-reflect-expand-btn"
                        onClick={() => setExpandedLeftTaskId(isExpanded ? null : task.id)}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                        title={isExpanded ? "Collapse" : "Expand details"}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    )}
                    <div className="left-reflect-heading-block">
                      <span className="left-reflect-text">{task.text}</span>
                      {task.completed && (
                        <button
                          type="button"
                          className="left-reflect-restore-btn"
                          onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                          title="Restore as task"
                        >
                          Restore as Task
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="left-reflect-delete-btn"
                      onClick={(e) => { e.stopPropagation(); setTaskDeleteConfirmation(task.id); }}
                      title="Delete task"
                      aria-label="Delete"
                    >
                      ✕
                    </button>
                  </div>
                  {hasChecklist && isExpanded && (
                    <div className="left-reflect-details">
                      {task.checklist.map((item) => (
                        <div key={item.id} className="left-reflect-subtask">
                          <span className={`left-reflect-subtask-label ${item.completed ? "completed" : ""}`}>
                            {item.label}
                          </span>
                          {item.details ? (
                            <span className="left-reflect-subtask-details">{item.details}</span>
                          ) : (
                            <span className="left-reflect-subtask-details empty">—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>

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
              onClick={() => setActiveGroupId((prev) => (prev === group.id ? null : group.id))}
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
            className="create-group-input"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createGroup();
            }}
            placeholder="Create group"
          />
          <button type="button" className="add-group-btn" onClick={createGroup}>
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
          <div className="calendar-view" ref={calendarViewRef}>
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
        </div>

        <div className="notepad-section">
          <div className="notepad-header notepad-header-with-tabs">
            <button
              type="button"
              className="notepad-heading-btn"
              onClick={addNewNotepadTab}
            >
              NOTEPAD
            </button>
            <div className="notepad-tabs">
              <div className="notepad-tabs-scroll">
                {notepadTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`notepad-tab ${tab.id === activeTabId ? "active" : ""}`}
                    onClick={() => editingTabId !== tab.id && switchNotepadTab(tab.id)}
                    onDoubleClick={(e) => {
                      if (e.target.closest(".notepad-tab-close")) return;
                      setEditingTabId(tab.id);
                      setEditingTabTitle(tab.title || "Untitled");
                      setTimeout(() => tabTitleInputRef.current?.focus(), 0);
                    }}
                  >
                    {editingTabId === tab.id ? (
                      <input
                        ref={tabTitleInputRef}
                        type="text"
                        className="notepad-tab-title-input"
                        value={editingTabTitle}
                        onChange={(e) => setEditingTabTitle(e.target.value)}
                        onBlur={() => {
                          const title = editingTabTitle.trim() || "Untitled";
                          setNotepadTabs((prev) =>
                            prev.map((t) => (t.id === tab.id ? { ...t, title } : t))
                          );
                          setEditingTabId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const title = editingTabTitle.trim() || "Untitled";
                            setNotepadTabs((prev) =>
                              prev.map((t) => (t.id === tab.id ? { ...t, title } : t))
                            );
                            setEditingTabId(null);
                          } else if (e.key === "Escape") {
                            setEditingTabId(null);
                          }
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="notepad-tab-title">{tab.title || "Untitled"}</span>
                    )}
                    <button
                      type="button"
                      className="notepad-tab-close"
                      onClick={(e) => closeNotepadTab(tab.id, e)}
                      aria-label="Close tab"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="notepad-tab-add" onClick={addNewNotepadTab} title="New tab">
                +
              </button>
            </div>
            <button
              type="button"
              className="clear-notepad-btn add-as-task-btn"
              onClick={() => setClearNotepadConfirm(true)}
              title="Clear notepad"
            >
              Clear notepad
            </button>
          </div>
          <div
            ref={notepadEditorRef}
            className={`notepad-area notepad-editor${highlighterMode ? " highlighter-cursor" : ""}`}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write your notes here..."
            onMouseDown={highlighterMode ? handleNotepadClickForHighlighter : undefined}
            onInput={() => {
              if (!notepadEditorRef.current) return;
              stripHighlightFromEmptyBlocks(notepadEditorRef.current);
              const html = notepadEditorRef.current.innerHTML;
              setNotes(html);
              setNotepadTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, content: html } : t))
              );
            }}
          />
          <div className="notepad-toolbar notepad-toolbar-below">
            <button
              type="button"
              className="notepad-toolbar-btn"
              onClick={() => execNotepadCommand("bold")}
              title="Bold"
            >
              <b>B</b>
            </button>
            <div className="highlighter-wrap" ref={highlighterPanelRef}>
              <button
                type="button"
                className={`notepad-toolbar-btn${highlighterMode ? " active" : ""}`}
                title="Highlighter (click to toggle, right-click for colours)"
                onClick={() => setHighlighterMode((v) => !v)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowHighlighterPanel(true);
                }}
              >
                <span className="highlighter-icon" style={{ backgroundColor: getHighlighterColor() }} />
              </button>
              {showHighlighterPanel && (
              <div className="highlighter-panel" role="dialog" aria-label="Highlighter colour">
                <div className="highlighter-swatches">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={`highlighter-swatch${highlighterIndex === i ? " selected" : ""}`}
                      style={{ backgroundColor: highlighterColors[i] }}
                      title={["Red", "Yellow", "Green"][i]}
                      onClick={() => {
                        setHighlighterIndex(i);
                        setShowHighlighterPanel(false);
                      }}
                    />
                  ))}
                  {[3, 4, 5, 6].map((i) => {
                    const hex = highlighterColors[i] || highlighterCustomHex[i - 3];
                    return (
                      <div key={i} className="highlighter-custom-slot">
                        <button
                          type="button"
                          className={`highlighter-swatch${highlighterIndex === i ? " selected" : ""}`}
                          style={{ backgroundColor: hex || "#eee", border: "1px solid #666" }}
                          onClick={() => {
                            if (hex) {
                              setHighlighterIndex(i);
                              setShowHighlighterPanel(false);
                            }
                          }}
                        />
                        <input
                          type="text"
                          placeholder="#hex or hex"
                          className="highlighter-hex-input"
                          value={highlighterCustomHex[i - 3]}
                          onChange={(e) => {
                            const v = e.target.value;
                            setHighlighterCustomHex((prev) => {
                              const next = [...prev];
                              next[i - 3] = v;
                              return next;
                            });
                            const normalized = normalizeHexInput(v);
                            if (normalized) {
                              setHighlighterColors((prev) => {
                                const next = [...prev];
                                next[i] = normalized;
                                return next;
                              });
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="highlighter-set-default"
                  onClick={() => setDefaultHighlighterIndex(highlighterIndex)}
                >
                  Set as default
                </button>
              </div>
            )}
            </div>
            <button
              type="button"
              className="notepad-toolbar-btn"
              onClick={() => execNotepadCommand("insertUnorderedList")}
              title="Bullet list"
            >
              •
            </button>
            <button
              type="button"
              className="notepad-toolbar-btn"
              onClick={() => execNotepadCommand("insertOrderedList")}
              title="Numbered list"
            >
              1.
            </button>
          </div>
          <div className="notepad-action-buttons">
            {notepadTabs.find((t) => t.id === activeTabId)?.savedNoteId ? (
              <button className="save-as-notes-btn update-note-btn" onClick={updateLinkedNote}>
                Update note
              </button>
            ) : (
              <button
                className="save-as-notes-btn"
                onClick={() => getNotepadPlainText() && saveNoteAsStandalone()}
                disabled={!getNotepadPlainText()}
              >
                Save as Notes
              </button>
            )}
            <button
              className="save-as-notes-btn attach-to-task-btn"
              onClick={() => setShowAttachToTaskPanel((v) => !v)}
              disabled={!getNotepadPlainText()}
            >
              Attach to a Task
            </button>
            {showAttachToTaskPanel && (
              <div className="attach-to-task-panel">
                <label>Select task:</label>
                <select
                  className="save-note-task-select"
                  onChange={(e) => {
                    const id = e.target.value ? parseInt(e.target.value, 10) : null;
                    if (id) {
                      saveNoteToTask(id);
                      setShowAttachToTaskPanel(false);
                    }
                  }}
                  value=""
                >
                  <option value="">Select task...</option>
                  {pendingTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.text.slice(0, 50)}{t.text.length > 50 ? "…" : ""}
                    </option>
                  ))}
                </select>
                <button type="button" className="attach-panel-cancel" onClick={() => setShowAttachToTaskPanel(false)}>
                  Cancel
                </button>
              </div>
            )}
            <div className="notepad-action-right">
              <button className="add-as-task-btn" onClick={addNoteAsTask}>
                Add as Task
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clear notepad confirmation */}
      {clearNotepadConfirm && (
        <div
          className="confirmation-overlay"
          onClick={(e) => e.target === e.currentTarget && setClearNotepadConfirm(false)}
        >
          <div className="save-note-modal clear-notepad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-note-modal-title">Clear notepad</div>
            <p className="save-note-modal-desc">All the text in this tab will be deleted.</p>
            <div className="save-note-modal-actions">
              <button type="button" className="save-note-standalone-btn" onClick={clearCurrentTabContent}>
                Clear
              </button>
              <button type="button" className="save-note-cancel-btn" onClick={() => setClearNotepadConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu for saved note */}
      {noteContextMenu && (
        <div
          className="confirmation-overlay note-context-overlay"
          onClick={() => setNoteContextMenu(null)}
        >
          <div
            className="note-context-menu"
            style={{ left: noteContextMenu.x, top: noteContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="note-context-menu-item"
              onClick={() => {
                setAttachNoteToTaskId(noteContextMenu.noteId);
                setNoteContextMenu(null);
              }}
            >
              Attach to task
            </button>
          </div>
        </div>
      )}

      {/* Attach saved note to task modal */}
      {attachNoteToTaskId != null && (
        <div
          className="confirmation-overlay"
          onClick={(e) => e.target === e.currentTarget && setAttachNoteToTaskId(null)}
        >
          <div className="save-note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-note-modal-title">Attach note to task</div>
            <p className="save-note-modal-desc">Select a task to attach this note to as a Notes subtask.</p>
            <div className="save-note-modal-actions">
              <div className="save-note-attach-row">
                <label>Task:</label>
                <select
                  className="save-note-task-select"
                  onChange={(e) => {
                    const id = e.target.value ? parseInt(e.target.value, 10) : null;
                    if (id) attachSavedNoteToTask(attachNoteToTaskId, id);
                  }}
                  value=""
                >
                  <option value="">Select task...</option>
                  {pendingTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.text.slice(0, 50)}{t.text.length > 50 ? "…" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" className="save-note-cancel-btn" onClick={() => setAttachNoteToTaskId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Auth modal (Login / Sign up) */}
      {showAuthModal && isSupabaseConfigured() && (
        <div
          className="confirmation-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAuthModal(false)}
        >
          <div className="save-note-modal profile-settings-modal auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-note-modal-title">{authMode === "forgot" ? "Reset password" : authMode === "signup" ? "Create account" : "Sign in"}</div>
            <p className="save-note-modal-desc">Use your email to sign in or create an account. Your notes and tasks are saved to your account.</p>
            <div className="auth-tabs">
              <button type="button" className={authMode === "signin" ? "active" : ""} onClick={() => { setAuthMode("signin"); setAuthError(""); setAuthFullName(""); }}>Sign in</button>
              <button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthError(""); }}>Sign up</button>
            </div>
            {authMode === "forgot" && (
              <p className="save-note-modal-desc" style={{ marginTop: 0 }}>Enter your email and we’ll send you a link to reset your password.</p>
            )}
            {authMode === "signup" && authMode !== "forgot" && (
              <input
                type="text"
                className="profile-name-input auth-input"
                placeholder="Full name (optional)"
                value={authFullName}
                onChange={(e) => setAuthFullName(e.target.value)}
                autoComplete="name"
              />
            )}
            <input
              type="email"
              className="profile-name-input auth-input"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              autoComplete="email"
            />
            {authMode !== "forgot" && (
              <input
                type="password"
                className="profile-name-input auth-input"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              />
            )}
            {authMode === "signin" && (
              <button type="button" className="auth-forgot-link" onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthPassword(""); }}>
                Forgot password?
              </button>
            )}
            {authMode === "forgot" && (
              <button type="button" className="auth-forgot-link" onClick={() => { setAuthMode("signin"); setAuthError(""); }}>
                ← Back to Sign in
              </button>
            )}
            {authError && <p className="auth-error">{authError}</p>}
            <div className="auth-actions">
              {authMode === "forgot" ? (
                <>
                  <button
                    type="button"
                    className="save-note-standalone-btn"
                    disabled={authLoading || !authEmail.trim()}
                    onClick={async () => {
                      setAuthError("");
                      setAuthLoading(true);
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
                          redirectTo: `${window.location.origin}${window.location.pathname || ""}`,
                        });
                        if (error) throw error;
                        setAuthError("Check your email for the reset link. You can close this and sign in after resetting.");
                      } catch (e) {
                        setAuthError(e?.message || "Something went wrong.");
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                  >
                    {authLoading ? "..." : "Send reset link"}
                  </button>
                  <button type="button" className="save-note-cancel-btn" onClick={() => { setAuthMode("signin"); setAuthError(""); }}>Back</button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="save-note-standalone-btn"
                    disabled={authLoading || !authEmail.trim() || !authPassword}
                    onClick={async () => {
                setAuthError("");
                setAuthLoading(true);
                try {
                  if (authMode === "signup") {
                    const { error } = await supabase.auth.signUp({
                      email: authEmail.trim(),
                      password: authPassword,
                      options: authFullName.trim() ? { data: { full_name: authFullName.trim() } } : undefined,
                    });
                    if (error) throw error;
                    setAuthError("Check your email to confirm your account, then sign in.");
                  } else {
                    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
                    if (error) throw error;
                    setShowAuthModal(false);
                    setAuthPassword("");
                  }
                } catch (e) {
                  setAuthError(e?.message || "Something went wrong.");
                } finally {
                  setAuthLoading(false);
                }
              }}
            >
                {authLoading ? "..." : authMode === "signup" ? "Create account" : "Sign in"}
              </button>
              <button type="button" className="save-note-cancel-btn" onClick={() => setShowAuthModal(false)}>Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfileModal && (
        <div
          className="confirmation-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowProfileModal(false)}
        >
          <div className="save-note-modal profile-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-note-modal-title">Profile</div>
            <p className="save-note-modal-desc">Switch or create a profile. Tasks, notes, and settings are saved per profile.</p>
            {user && (
              <div className="auth-modal account-name-section">
                <label className="settings-label">Display name</label>
                <p className="save-note-modal-desc" style={{ marginBottom: 8 }}>Shown on the left in the top bar. Email stays on the right.</p>
                <input
                  type="text"
                  className="profile-name-input auth-input"
                  placeholder="Your name"
                  value={accountDisplayName}
                  onChange={(e) => setAccountDisplayName(e.target.value)}
                />
                <button
                  type="button"
                  className="save-note-standalone-btn"
                  disabled={accountNameSaving}
                  onClick={async () => {
                    setAccountNameSaving(true);
                    try {
                      const { data, error } = await supabase.auth.updateUser({ data: { full_name: accountDisplayName.trim() || null } });
                      if (!error && data?.user) setUser(data.user);
                    } finally {
                      setAccountNameSaving(false);
                    }
                  }}
                >
                  {accountNameSaving ? "Saving…" : "Save name"}
                </button>
              </div>
            )}
            <div className="profile-list">
              {profiles.map((p) => (
                <div key={p.id} className="profile-list-item">
                  <button
                    type="button"
                    className={`profile-select-btn ${String(p.id) === String(activeProfileId) ? "active" : ""}`}
                    onClick={() => setActiveProfileId(p.id)}
                  >
                    {p.name}
                  </button>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      className="profile-delete-btn"
                      onClick={() => {
                        if (profiles.length <= 1) return;
                        setProfiles((prev) => prev.filter((x) => x.id !== p.id));
                        if (String(activeProfileId) === String(p.id)) {
                          const next = profiles.find((x) => x.id !== p.id);
                          if (next) setActiveProfileId(next.id);
                        }
                        localStorage.removeItem(PROFILE_DATA_PREFIX + p.id + "_v1");
                        setShowProfileModal(false);
                      }}
                      title="Delete profile"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="profile-add-row">
              <input
                type="text"
                className="profile-name-input"
                placeholder="New profile name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />
              <button
                type="button"
                className="save-note-standalone-btn"
                onClick={() => {
                  if (!newProfileName.trim()) return;
                  const id = "profile_" + Date.now();
                  createNewProfileAndSwitch(id, newProfileName.trim());
                  setNewProfileName("");
                  setShowProfileModal(false);
                }}
              >
                Add profile
              </button>
            </div>
            <button type="button" className="save-note-cancel-btn" onClick={() => setShowProfileModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettingsModal && (
        <div
          className="confirmation-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
        >
          <div className="save-note-modal profile-settings-modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-note-modal-title">Settings</div>
            <div className="settings-section">
              <label className="settings-label">Theme</label>
              <select
                className="save-note-task-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="light">Light (white)</option>
                <option value="dark">Dark (black)</option>
              </select>
            </div>
            <div className="settings-section">
              <h4 className="settings-subtitle">Templates</h4>
              <p className="save-note-modal-desc">Define task templates with subtasks. When you add a task and select a template, its subtasks are added automatically.</p>
              {!editingTemplateId ? (
                <>
                  <ul className="template-list">
                    {templates.map((t) => (
                      <li key={t.id} className="template-list-item">
                        <span>{t.name}</span>
                        <div>
                          <button type="button" className="template-edit-btn" onClick={() => {
                            setEditingTemplateId(t.id);
                            setNewTemplateName(t.name);
                            setNewTemplateSubtasks(
                              t.subtasks && t.subtasks.length > 0
                                ? t.subtasks.map((s) => ({ label: s.label || "", detailsPlaceholder: s.detailsPlaceholder || "" }))
                                : [{ label: "", detailsPlaceholder: "" }]
                            );
                          }}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="template-delete-btn"
                            onClick={() => setTemplates((prev) => prev.filter((x) => x.id !== t.id))}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="save-note-standalone-btn"
                    onClick={() => {
                      setEditingTemplateId("new");
                      setNewTemplateName("");
                      setNewTemplateSubtasks([{ label: "", detailsPlaceholder: "" }]);
                    }}
                  >
                    Add template
                  </button>
                </>
              ) : (
                <div className="template-editor">
                  <input
                    type="text"
                    className="profile-name-input"
                    placeholder="Template name (e.g. Write Article)"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <label className="settings-label">Subtasks</label>
                  {newTemplateSubtasks.map((st, idx) => (
                    <div key={idx} className="template-subtask-row">
                      <input
                        type="text"
                        placeholder="Subtask label"
                        value={st.label}
                        onChange={(e) => {
                          const next = [...newTemplateSubtasks];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setNewTemplateSubtasks(next);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Details placeholder (optional)"
                        value={st.detailsPlaceholder}
                        onChange={(e) => {
                          const next = [...newTemplateSubtasks];
                          next[idx] = { ...next[idx], detailsPlaceholder: e.target.value };
                          setNewTemplateSubtasks(next);
                        }}
                      />
                      <button
                        type="button"
                        className="template-remove-subtask"
                        onClick={() => setNewTemplateSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="template-add-subtask"
                    onClick={() => setNewTemplateSubtasks((prev) => [...prev, { label: "", detailsPlaceholder: "" }])}
                  >
                    + Add subtask
                  </button>
                  <div className="template-editor-actions">
                    <button
                      type="button"
                      className="save-note-standalone-btn"
                      onClick={() => {
                        const subtasks = newTemplateSubtasks.filter((s) => s.label.trim()).map((s) => ({ label: s.label.trim(), detailsPlaceholder: s.detailsPlaceholder || "" }));
                        if (editingTemplateId === "new") {
                          setTemplates((prev) => [...prev, { id: "tpl_" + Date.now(), name: newTemplateName.trim() || "Template", subtasks }]);
                        } else {
                          setTemplates((prev) => prev.map((t) => (t.id === editingTemplateId ? { ...t, name: newTemplateName.trim() || t.name, subtasks } : t)));
                        }
                        setEditingTemplateId(null);
                        setNewTemplateName("");
                        setNewTemplateSubtasks([{ label: "", detailsPlaceholder: "" }]);
                      }}
                    >
                      Save
                    </button>
                    <button type="button" className="save-note-cancel-btn" onClick={() => { setEditingTemplateId(null); setNewTemplateName(""); setNewTemplateSubtasks([{ label: "", detailsPlaceholder: "" }]); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="save-note-cancel-btn" onClick={() => setShowSettingsModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

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
          </div>
          <input
            type="text"
            value={projectBrief}
            onChange={(e) => setProjectBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addBriefAsTaskWithChecklist();
            }}
            placeholder="Enter project brief (e.g. Write article on X) and press Enter"
            className="brief-input-right"
          />
          <div className="task-panel-divider" />
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
              {selectedTasks.size > 0 && (
                <div className="bulk-action-buttons bulk-action-three">
                  <button className="bulk-btn bulk-done-btn" onClick={markSelectedAsDone}>
                    Mark as Done
                  </button>
                  <button
                    className="bulk-btn"
                    onClick={() => setShowBulkDatePicker((v) => !v)}
                  >
                    Assign due date
                  </button>
                  <button className="bulk-btn bulk-delete-btn" onClick={deleteSelectedTasks}>
                    Delete
                  </button>
                </div>
              )}
              {showBulkDatePicker && selectedTasks.size > 0 && (
                <div className="bulk-date-picker-row">
                  <input
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    className="bulk-date-input"
                  />
                  <button className="bulk-btn bulk-apply-date" onClick={assignBulkDueDate}>
                    Apply
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
                <div
                  key={task.id}
                  className="task-panel-item"
                  onDoubleClick={() => setTaskDetailModalId(task.id)}
                >
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
                          <div className="task-label-wrap">
                            <label
                              htmlFor={`task-${task.id}`}
                              className={`task-label ${task.completed ? "completed" : ""}`}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startEditTask(task.id, task.text);
                              }}
                            >
                              {task.text}
                            </label>
                          </div>
                          <button
                            className="task-delete-btn"
                            onClick={() => setTaskDeleteConfirmation(task.id)}
                            title="Delete task"
                          >
                            ✕
                          </button>
                          <div className="task-dropdown-wrap">
                            <button
                              className="task-dropdown-btn"
                              onClick={() => setTaskDropdown(taskDropdown === task.id ? null : task.id)}
                              title="Task options"
                            >
                              ▼
                            </button>
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
                        </>
                      )}
                    </div>
                    {task.checklist && task.checklist.length > 0 && (
                      <div className="task-checklist-wrapper">
                        <button
                          type="button"
                          className="task-checklist-toggle"
                          onClick={() => toggleChecklistExpanded(task.id)}
                          aria-expanded={expandedChecklistTaskIds.has(task.id)}
                        >
                          <span className="task-checklist-toggle-icon">
                            {expandedChecklistTaskIds.has(task.id) ? "▼" : "▶"}
                          </span>
                          <span>
                            {expandedChecklistTaskIds.has(task.id)
                              ? "Hide subtasks"
                              : `Show subtasks (${task.checklist.length})`}
                          </span>
                        </button>
                        {expandedChecklistTaskIds.has(task.id) && (
                          <div className="task-checklist">
                            {task.checklist.map((item) => {
                              const isEditingLabel = editingChecklistKey === `${task.id}-${item.id}`;
                              return (
                                <div key={item.id} className="task-checklist-item">
                                  <div className="task-checklist-item-heading">
                                    <input
                                      type="checkbox"
                                      checked={!!item.completed}
                                      onChange={() => toggleChecklistItemComplete(task.id, item.id)}
                                      className="task-checkbox task-checklist-checkbox"
                                    />
                                    {isEditingLabel ? (
                                      <input
                                        type="text"
                                        value={editingChecklistLabel}
                                        onChange={(e) => setEditingChecklistLabel(e.target.value)}
                                        onBlur={() => saveEditChecklistLabel(task.id, item.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") saveEditChecklistLabel(task.id, item.id);
                                          if (e.key === "Escape") {
                                            setEditingChecklistKey(null);
                                            setEditingChecklistLabel("");
                                          }
                                        }}
                                        className="task-checklist-label-input"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <span
                                        className={`task-checklist-label ${item.completed ? "completed" : ""}`}
                                        onClick={() => startEditChecklistLabel(task.id, item.id, item.label)}
                                        title="Click to edit"
                                      >
                                        {item.label || "(Untitled)"}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      className="task-checklist-remove-btn"
                                      onClick={() => removeChecklistItem(task.id, item.id)}
                                      title="Remove subtask"
                                      aria-label="Remove subtask"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={item.details || ""}
                                    onChange={(e) => updateChecklistItem(task.id, item.id, "details", e.target.value)}
                                    placeholder="Details... (right-click to expand)"
                                    className={`task-checklist-details-input ${getChecklistDetailsSize(item.label) === "large" ? "task-checklist-details-input--large" : getChecklistDetailsSize(item.label) === "small" ? "task-checklist-details-input--small" : ""}`}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setExpandedTextView({ taskId: task.id, field: "details", itemId: item.id });
                                    }}
                                  />
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              className="task-checklist-add-btn"
                              onClick={() => addChecklistItem(task.id)}
                            >
                              + Add a Subtask
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {(!task.checklist || task.checklist.length === 0) && (
                      <button
                        type="button"
                        className="task-add-subtask-standalone"
                        onClick={() => addChecklistItem(task.id)}
                      >
                        + Add a Subtask
                      </button>
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
                          onClick={() => setTaskDeleteConfirmation(task.id)}
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
      </div>

      {/* Task Detail Modal - resizable window for text-heavy details */}
      {taskDetailModalId !== null && (() => {
        const detailTask = tasks.find((t) => t.id === taskDetailModalId);
        if (!detailTask) return null;
        const task = detailTask;
        return (
          <div
            className="task-detail-overlay"
            onClick={(e) => e.target === e.currentTarget && setTaskDetailModalId(null)}
          >
            <div
              className="task-detail-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="task-detail-modal-header">
                <h3 className="task-detail-modal-title">Task details</h3>
                <button
                  type="button"
                  className="task-detail-modal-close"
                  onClick={() => setTaskDetailModalId(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="task-detail-modal-body">
                <div className="task-detail-field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={task.text}
                    onChange={(e) =>
                      setTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, text: e.target.value } : t))
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setExpandedTextView({ taskId: task.id, field: "title" });
                    }}
                    className="task-detail-input"
                    title="Right-click to open expanded view for long text"
                  />
                </div>
                <div className="task-detail-row">
                  <div className="task-detail-field">
                    <label>Due date</label>
                    <input
                      type="date"
                      value={task.date || ""}
                      onChange={(e) => assignTaskDate(task.id, e.target.value)}
                      className="task-detail-input"
                    />
                  </div>
                  <div className="task-detail-field">
                    <label>Group</label>
                    <select
                      value={task.groupId || ""}
                      onChange={(e) =>
                        assignTaskGroup(task.id, e.target.value ? parseInt(e.target.value) : null)
                      }
                      className="task-detail-select"
                    >
                      <option value="">No group</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {task.checklist && task.checklist.length > 0 && (
                  <div className="task-detail-checklist">
                    <h4 className="task-detail-subtitle">Subtasks</h4>
                    {task.checklist.map((item) => {
                      const isEditingLabel = editingChecklistKey === `${task.id}-${item.id}`;
                      return (
                      <div key={item.id} className="task-detail-checklist-item">
                        <div className="task-detail-checklist-heading">
                          <input
                            type="checkbox"
                            checked={!!item.completed}
                            onChange={() => toggleChecklistItemComplete(task.id, item.id)}
                            className="task-checkbox"
                          />
                          {isEditingLabel ? (
                            <input
                              type="text"
                              value={editingChecklistLabel}
                              onChange={(e) => setEditingChecklistLabel(e.target.value)}
                              onBlur={() => saveEditChecklistLabel(task.id, item.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditChecklistLabel(task.id, item.id);
                                if (e.key === "Escape") {
                                  setEditingChecklistKey(null);
                                  setEditingChecklistLabel("");
                                }
                              }}
                              className="task-detail-checklist-label-input"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`task-detail-checklist-label ${item.completed ? "completed" : ""}`}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                startEditChecklistLabel(task.id, item.id, item.label);
                              }}
                              title="Double-click to edit"
                            >
                              {item.label || "(Untitled)"}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={item.details || ""}
                          onChange={(e) =>
                            updateChecklistItem(task.id, item.id, "details", e.target.value)
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setExpandedTextView({ taskId: task.id, field: "details", itemId: item.id });
                          }}
                          placeholder="Details... (right-click to expand)"
                          className={`task-detail-details-textarea ${getChecklistDetailsSize(item.label) === "large" ? "task-detail-details-textarea--large" : getChecklistDetailsSize(item.label) === "small" ? "task-detail-details-textarea--small" : ""}`}
                          rows={getChecklistDetailsSize(item.label) === "large" ? 6 : getChecklistDetailsSize(item.label) === "small" ? 2 : 4}
                        />
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Expanded text view - double width, simple editable text with scroll (for title + all subtask details) */}
      {expandedTextView !== null && (() => {
        const task = tasks.find((t) => t.id === expandedTextView.taskId);
        if (!task) return null;
        const isTitle = expandedTextView.field === "title";
        const item = !isTitle && task.checklist
          ? task.checklist.find((i) => i.id === expandedTextView.itemId)
          : null;
        const label = isTitle ? "Task title" : (item?.label || "Details");
        const value = isTitle ? task.text : (item?.details ?? "");
        const onChange = (newValue) => {
          if (isTitle) {
            setTasks((prev) =>
              prev.map((t) => (t.id === task.id ? { ...t, text: newValue } : t))
            );
          } else if (item) {
            updateChecklistItem(task.id, item.id, "details", newValue);
          }
        };
        return (
          <div
            className="expanded-text-overlay"
            onClick={(e) => e.target === e.currentTarget && setExpandedTextView(null)}
          >
            <div
              className="expanded-text-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="expanded-text-header">
                <h3 className="expanded-text-title">{label}</h3>
                <div className="expanded-text-header-actions">
                  <button
                    type="button"
                    className="expanded-text-save-btn"
                    onClick={() => setExpandedTextView(null)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="expanded-text-close"
                    onClick={() => setExpandedTextView(null)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <textarea
                className="expanded-text-area"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={isTitle ? "Task title..." : "Enter details... (double-click in Task details to open this view for long text)"}
                autoFocus
              />
            </div>
          </div>
        );
      })()}

      {/* Calendar Picker Modal - choose year, month, then click date */}
      {showCalendarPicker && (
        <div
          className="calendar-picker-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowCalendarPicker(false)}
        >
          <div className="calendar-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-picker-header">
              <h3 className="calendar-picker-title">Select date</h3>
              <button
                type="button"
                className="calendar-picker-close"
                onClick={() => setShowCalendarPicker(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="calendar-picker-controls">
              <select
                value={calendarPickerViewDate.getFullYear()}
                onChange={(e) =>
                  setCalendarPickerViewDate(
                    new Date(parseInt(e.target.value, 10), calendarPickerViewDate.getMonth(), 1)
                  )
                }
                className="calendar-picker-select"
              >
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={calendarPickerViewDate.getMonth()}
                onChange={(e) =>
                  setCalendarPickerViewDate(
                    new Date(calendarPickerViewDate.getFullYear(), parseInt(e.target.value, 10), 1)
                  )
                }
                className="calendar-picker-select"
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="calendar-picker-weekdays">
              {dayNames.map((d) => (
                <div key={d} className="calendar-picker-weekday">
                  {d}
                </div>
              ))}
            </div>
            <div className="calendar-picker-grid">
              {getCalendarPickerDays(calendarPickerViewDate).map((date, idx) => {
                const isToday = date && new Date().toDateString() === date.toDateString();
                const isSelected = date && selectedDate.toDateString() === date.toDateString();
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`calendar-picker-day ${!date ? "empty" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                    disabled={!date}
                    onClick={() => {
                      if (date) {
                        setSelectedDate(new Date(date));
                        setShowCalendarPicker(false);
                      }
                    }}
                  >
                    {date ? date.getDate() : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
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

      {/* Delete Task Confirmation Modal */}
      {taskDeleteConfirmation !== null && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <div className="confirmation-title">Delete task?</div>
            <div className="confirmation-message">Are you sure you want to delete this task?</div>
            <div className="confirmation-buttons">
              <button
                className="confirmation-btn confirmation-yes"
                onClick={confirmDeleteTask}
              >
                Yes
              </button>
              <button
                className="confirmation-btn confirmation-no"
                onClick={() => setTaskDeleteConfirmation(null)}
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