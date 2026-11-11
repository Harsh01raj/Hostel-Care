// HostelCare - front-end demo using browser localStorage.
// Data is stored in this browser only; it is not shared with an admin or other devices.
const STORAGE_KEY = "hostelcare_records_v1";

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function makeId(prefix) {
  return prefix + "-" + Date.now().toString().slice(-8) + "-" + Math.floor(100 + Math.random() * 900);
}

function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = "form-message " + type;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
}

function cleanText(value) {
  return String(value || "").trim();
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

// Set the earliest selectable cleaning date to today.
const dateInput = document.getElementById("cleaningDate");
if (dateInput) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  dateInput.min = localToday;
}

document.getElementById("cleaningForm").addEventListener("submit", function (event) {
  event.preventDefault();
  if (!this.reportValidity()) return;
  const data = formData(this);
  if (data.date < dateInput.min) {
    showMessage("cleaningMessage", "Please choose today or a future date.", "error");
    return;
  }
  const record = {
    id: makeId("HC"),
    type: "Cleaning request",
    name: cleanText(data.studentName),
    email: cleanText(data.email).toLowerCase(),
    hostel: cleanText(data.hostel),
    room: cleanText(data.room),
    date: data.date,
    time: data.time,
    details: cleanText(data.notes) || "No additional instructions",
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  const records = getRecords();
  records.unshift(record);
  saveRecords(records);
  this.reset();
  dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  showMessage("cleaningMessage", "Success! Your request ID is " + record.id + ". Track it below using your email.", "success");
  document.getElementById("trackEmail").value = record.email;
  renderRecords(record.email);
  showToast("Cleaning request submitted successfully.");
});

document.getElementById("complaintForm").addEventListener("submit", function (event) {
  event.preventDefault();
  if (!this.reportValidity()) return;
  const data = formData(this);
  const record = {
    id: makeId("HC"),
    type: "Cleaning complaint",
    name: cleanText(data.studentName),
    email: cleanText(data.email).toLowerCase(),
    hostel: cleanText(data.hostel),
    room: cleanText(data.room),
    category: data.category,
    details: cleanText(data.description),
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  const records = getRecords();
  records.unshift(record);
  saveRecords(records);
  this.reset();
  showMessage("complaintMessage", "Complaint submitted! Your complaint ID is " + record.id + ".", "success");
  document.getElementById("trackEmail").value = record.email;
  renderRecords(record.email);
  showToast("Complaint submitted successfully.");
});

function renderRecords(email) {
  const results = document.getElementById("trackingResults");
  const matching = getRecords().filter(record => record.email === email.toLowerCase());
  if (!matching.length) {
    results.innerHTML = '<div class="empty-state"><span>🔎</span><strong>No requests found</strong><p>Check the email address or submit a new request.</p></div>';
    return;
  }

  const list = document.createElement("div");
  list.className = "request-list";
  matching.forEach(record => {
    const item = document.createElement("article");
    item.className = "request-item";
    const details = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = record.type + " · " + record.hostel + ", Room " + record.room;
    const description = document.createElement("p");
    description.textContent = record.type === "Cleaning complaint"
      ? record.category + ": " + record.details
      : "Preferred date: " + record.date + " · " + record.time + (record.details !== "No additional instructions" ? " · " + record.details : "");
    const meta = document.createElement("div");
    meta.className = "request-meta";
    meta.textContent = "ID: " + record.id + " · Submitted: " + new Date(record.createdAt).toLocaleString();
    const status = document.createElement("span");
    status.className = "status" + (record.status === "Completed" ? " completed" : record.status === "In Progress" ? " in-progress" : "");
    status.textContent = record.status;
    details.append(heading, description);
    item.append(details, status, meta);
    list.appendChild(item);
  });
  results.replaceChildren(list);
}

document.getElementById("trackForm").addEventListener("submit", function (event) {
  event.preventDefault();
  const email = cleanText(document.getElementById("trackEmail").value).toLowerCase();
  if (email) renderRecords(email);
});

document.getElementById("year").textContent = new Date().getFullYear();

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});
navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});
