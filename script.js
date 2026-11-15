const $ = (id) => document.getElementById(id);

// Mantém a mesma chave de armazenamento da versão 1.0 para preservar as tarefas existentes.
let tasks = JSON.parse(localStorage.getItem("iagenda_tasks") || "[]");
const today = new Date();
const todayKey = dateKey(today);
let selectedDate = todayKey;
let monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
const weekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(date) {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function saveTasks() {
  localStorage.setItem("iagenda_tasks", JSON.stringify(tasks));
}

function taskTimeLabel(task) {
  const start = task.startTime || "";
  const end = task.endTime || "";
  if (start && end) return `${start} às ${end}`;
  if (start) return `A partir de ${start}`;
  if (end) return `Até ${end}`;
  return "";
}

function sortTasks(list) {
  const priorityOrder = { Urgente: 0, Alta: 1, Normal: 2 };
  return [...list].sort((a, b) => {
    const aTime = a.startTime || a.endTime || "99:99";
    const bTime = b.startTime || b.endTime || "99:99";
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
  });
}

function renderWeek() {
  const container = $("week-days");
  container.innerHTML = "";
  const weekStart = getMonday(parseDate(selectedDate));
  $("week-label").textContent = `${formatDate(weekStart)} – ${formatDate(new Date(weekStart.getTime() + 6 * 86400000))}`;

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const key = dateKey(date);
    const button = document.createElement("button");
    button.className = "day";
    button.type = "button";
    if (key === selectedDate) button.classList.add("selected");
    if (key === todayKey) button.classList.add("today");
    button.innerHTML = `<span>${weekNames[date.getDay()]}</span><strong>${date.getDate()}</strong>`;
    button.addEventListener("click", () => {
      selectedDate = key;
      renderWeek();
      renderTasksInto("task-list", selectedDate, "selected-day-title");
    });
    container.appendChild(button);
  }
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  if (task.completed) card.classList.add("completed");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = Boolean(task.completed);
  checkbox.setAttribute("aria-label", "Concluir atividade");
  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;
    saveTasks();
    renderAll();
  });

  const info = document.createElement("div");
  info.className = "task-info";
  const title = document.createElement("h3");
  title.textContent = task.title;
  const details = document.createElement("p");
  const time = taskTimeLabel(task);
  details.textContent = time ? `${task.category} • ${time}` : task.category;
  info.append(title, details);

  const priority = document.createElement("span");
  priority.className = `priority ${task.priority}`;
  priority.textContent = task.priority;

  const remove = document.createElement("button");
  remove.className = "delete-button";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Excluir atividade");
  remove.addEventListener("click", () => {
    if (confirm("Deseja excluir esta atividade?")) {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      renderAll();
    }
  });

  card.append(checkbox, info, priority, remove);
  return card;
}

function renderTasksInto(containerId, date, titleId) {
  const container = $(containerId);
  const dayDate = parseDate(date);
  if (titleId) {
    $(titleId).textContent = date === todayKey ? "Atividades de hoje" : `Atividades de ${formatDate(dayDate)}`;
  }
  const dayTasks = sortTasks(tasks.filter(task => task.date === date));
  container.innerHTML = "";

  if (dayTasks.length === 0) {
    container.innerHTML = `<div class="empty-state"><div>📅</div><p>Nenhuma atividade neste dia.</p><p>Toque em "+ Adicionar" para começar.</p></div>`;
  } else {
    dayTasks.forEach(task => container.appendChild(createTaskCard(task)));
  }
  updateProgress();
}

function renderTasks() {
  renderTasksInto("task-list", selectedDate, "selected-day-title");
}

function renderCalendar() {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  $("month-title").textContent = monthCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7; // Semana começa na segunda-feira.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = $("calendar-days");
  grid.innerHTML = "";

  for (let i = 0; i < offset; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-blank";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const dayTasks = tasks.filter(task => task.date === key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    if (key === selectedDate) button.classList.add("selected");
    if (key === todayKey) button.classList.add("today");
    button.setAttribute("aria-label", `${day} de ${month + 1}, ${dayTasks.length} atividades`);
    button.innerHTML = `<span>${day}</span>${dayTasks.length ? '<i class="calendar-mark"></i>' : '<i class="calendar-mark empty"></i>'}`;
    button.addEventListener("click", () => {
      selectedDate = key;
      renderCalendar();
      renderTasksInto("calendar-task-list", selectedDate, "calendar-selected-title");
    });
    grid.appendChild(button);
  }
  $("calendar-selected-title").textContent = `Atividades de ${formatDate(parseDate(selectedDate))}`;
}

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  $("total-count").textContent = total;
  $("progress-percent").textContent = `${percentage}%`;
  $("progress-bar").style.width = `${percentage}%`;
  $("progress-text").textContent = total ? `${completed} de ${total} atividades concluídas.` : "Vamos começar!";
}

function renderAll() {
  renderWeek();
  renderTasks();
  renderCalendar();
  renderTasksInto("calendar-task-list", selectedDate, "calendar-selected-title");
}

function openModal() {
  $("task-date").value = selectedDate;
  $("task-start").value = "";
  $("task-end").value = "";
  $("task-modal").classList.add("open");
  $("task-title").focus();
}

function closeModal() {
  $("task-modal").classList.remove("open");
  $("task-form").reset();
}

function showView(view) {
  const home = view === "home";
  const calendar = view === "calendar";
  $("home-view").hidden = !home;
  $("calendar-view").hidden = !calendar;
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view === "assistant") {
    alert("O assistente com inteligência artificial será desenvolvido na versão 3.0.");
    showView("home");
  }
  if (calendar) {
    renderCalendar();
    renderTasksInto("calendar-task-list", selectedDate, "calendar-selected-title");
  }
}

$("open-form").addEventListener("click", openModal);
$("calendar-add").addEventListener("click", openModal);
$("close-form").addEventListener("click", closeModal);
$("task-modal").addEventListener("click", event => {
  if (event.target === $("task-modal")) closeModal();
});

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$("prev-month").addEventListener("click", () => {
  monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1);
  renderCalendar();
});
$("next-month").addEventListener("click", () => {
  monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
  renderCalendar();
});

$("task-form").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("task-title").value.trim();
  const date = $("task-date").value;
  const startTime = $("task-start").value;
  const endTime = $("task-end").value;
  if (!title || !date) return;
  if (startTime && endTime && endTime <= startTime) {
    alert("O horário de término precisa ser posterior ao horário de início.");
    return;
  }

  tasks.push({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    title,
    date,
    startTime,
    endTime,
    category: $("task-category").value,
    priority: $("task-priority").value,
    completed: false
  });

  selectedDate = date;
  monthCursor = new Date(parseDate(date).getFullYear(), parseDate(date).getMonth(), 1);
  saveTasks();
  closeModal();
  renderAll();
});

$("today-date").textContent = today.toLocaleDateString("pt-BR", {
  weekday: "long", day: "numeric", month: "long"
});

renderAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.error("Erro no Service Worker:", error));
  });
}
