
const $ = (id) => document.getElementById(id);

let tasks = JSON.parse(localStorage.getItem("iagenda_tasks") || "[]");

const today = new Date();

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

let selectedDate = dateKey(today);
const monday = getMonday(today);

const weekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDate(date) {
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long"
  });
}

function saveTasks() {
  localStorage.setItem("iagenda_tasks", JSON.stringify(tasks));
}

function renderWeek() {
  const container = $("week-days");
  container.innerHTML = "";

  $("week-label").textContent =
    `${formatDate(monday)} – ${formatDate(
      new Date(monday.getTime() + 6 * 86400000)
    )}`;

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const key = dateKey(date);
    const button = document.createElement("button");

    button.className = "day";
    button.type = "button";

    if (key === selectedDate) button.classList.add("selected");
    if (key === dateKey(today)) button.classList.add("today");

    button.innerHTML = `
      <span>${weekNames[date.getDay()]}</span>
      <strong>${date.getDate()}</strong>
    `;

    button.addEventListener("click", () => {
      selectedDate = key;
      renderWeek();
      renderTasks();
    });

    container.appendChild(button);
  }
}

function renderTasks() {
  const container = $("task-list");

  const dayDate = new Date(selectedDate + "T12:00:00");

  $("selected-day-title").textContent =
    selectedDate === dateKey(today)
      ? "Atividades de hoje"
      : `Atividades de ${formatDate(dayDate)}`;

  const dayTasks = tasks
    .filter(task => task.date === selectedDate)
    .sort((a, b) => {
      const order = { Urgente: 0, Alta: 1, Normal: 2 };
      return order[a.priority] - order[b.priority];
    });

  container.innerHTML = "";

  if (dayTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>📅</div>
        <p>Nenhuma atividade neste dia.</p>
        <p>Toque em "+ Adicionar" para começar.</p>
      </div>
    `;
  }

  dayTasks.forEach(task => {
    const card = document.createElement("div");
    card.className = "task-card";

    if (task.completed) card.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
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
    details.textContent = task.category;

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
    container.appendChild(card);
  });

  updateProgress();
}

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;

  const percentage = total
    ? Math.round((completed / total) * 100)
    : 0;

  $("total-count").textContent = total;
  $("progress-percent").textContent = `${percentage}%`;
  $("progress-bar").style.width = `${percentage}%`;

  $("progress-text").textContent = total
    ? `${completed} de ${total} atividades concluídas.`
    : "Vamos começar!";
}

function renderAll() {
  renderWeek();
  renderTasks();
}

function openModal() {
  $("task-date").value = selectedDate;
  $("task-modal").classList.add("open");
  $("task-title").focus();
}

function closeModal() {
  $("task-modal").classList.remove("open");
  $("task-form").reset();
}

$("open-form").addEventListener("click", openModal);
$("close-form").addEventListener("click", closeModal);

$("task-modal").addEventListener("click", (event) => {
  if (event.target === $("task-modal")) closeModal();
});

$("task-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const title = $("task-title").value.trim();
  const date = $("task-date").value;

  if (!title || !date) return;

  tasks.push({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    title,
    date,
    category: $("task-category").value,
    priority: $("task-priority").value,
    completed: false
  });

  selectedDate = date;

  saveTasks();
  closeModal();
  renderAll();
});

$("today-date").textContent =
  today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

renderAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.error("Erro no Service Worker:", error));
  });
}
