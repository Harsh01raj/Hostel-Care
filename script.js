const supabaseConfig = window.HOSTELCARE_SUPABASE;
const supabaseClient = window.supabase && supabaseConfig
  && supabaseConfig.url && !supabaseConfig.url.includes("YOUR_PROJECT")
  && supabaseConfig.anonKey && !supabaseConfig.anonKey.includes("YOUR_SUPABASE")
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

function cleanText(value) {
  return String(value || "").trim();
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.className = "form-message " + (type || "");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
}

const dateInput = document.getElementById("cleaningDate");
if (dateInput) {
  const today = new Date();
  dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

const emailForm = document.getElementById("emailForm");
const otpForm = document.getElementById("otpForm");
const authEmail = document.getElementById("authEmail");
const authOtp = document.getElementById("authOtp");
const accountDetails = document.getElementById("accountDetails");
const accountRoom = document.getElementById("accountRoom");
let currentUser = null;
let assignedRoom = null;
let accountRequestSequence = 0;

function displayAuthState(user, assignment) {
  currentUser = user;
  assignedRoom = assignment;
  if (!emailForm || !otpForm || !accountDetails || !accountRoom) return;
  const hasAssignment = Boolean(user && assignment);
  emailForm.hidden = Boolean(user);
  otpForm.hidden = true;
  accountDetails.hidden = !user;

  if (!user) {
    accountRoom.textContent = "";
    return;
  }

  accountRoom.textContent = hasAssignment
    ? "Verified: " + user.email + " · " + assignment.hostel + ", Room " + assignment.room
    : "Verified: " + user.email + ". This email does not have an approved room assignment yet. Contact hostel staff.";
}

async function loadAccount(user) {
  const requestSequence = ++accountRequestSequence;
  if (!user || !supabaseClient) {
    displayAuthState(null, null);
    return;
  }

  displayAuthState(user, null);
  const { data: assignment, error } = await supabaseClient
    .from("room_assignments")
    .select("hostel, room")
    .maybeSingle();

  if (requestSequence !== accountRequestSequence) return;
  if (error) {
    showMessage("authMessage", "Could not load your room assignment: " + error.message, "error");
    return;
  }

  displayAuthState(user, assignment);
  if (assignment) {
    showMessage("authMessage", "Email verified. You can now submit and track requests.", "success");
    await renderRecords();
  } else {
    showMessage("authMessage", "Your email is verified, but no room is assigned to it yet. Please contact hostel staff.", "error");
    showTrackingMessage("No approved room assignment was found for this email.");
  }
}

function showTrackingMessage(message) {
  const results = document.getElementById("trackingResults");
  if (!results) return;
  const state = document.createElement("div");
  state.className = "empty-state";
  const text = document.createElement("p");
  text.textContent = message;
  state.appendChild(text);
  results.replaceChildren(state);
}

if (!supabaseClient) {
  showMessage("authMessage", "Email verification is not configured yet. Add your Supabase project URL and publishable/anon key to js/supabase-config.js, then run the setup instructions in README.md.", "error");
}

if (emailForm) emailForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!this.reportValidity()) return;
  if (!supabaseClient) return;

  const email = cleanText(authEmail.value).toLowerCase();
  const button = this.querySelector('button[type="submit"]');
  button.disabled = true;
  showMessage("authMessage", "Sending a verification code...", "");

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });
  button.disabled = false;

  if (error) {
    showMessage("authMessage", "Could not send the code: " + error.message, "error");
    return;
  }

  authEmail.value = email;
  this.hidden = true;
  otpForm.hidden = false;
  authOtp.focus();
  showMessage("authMessage", "A one-time code was sent to " + email + ". Check your inbox and spam folder.", "success");
});

if (otpForm) otpForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!this.reportValidity()) return;
  if (!supabaseClient) return;

  const button = this.querySelector('button[type="submit"]');
  button.disabled = true;
  showMessage("authMessage", "Verifying your code...", "");

  const { data, error } = await supabaseClient.auth.verifyOtp({
    email: cleanText(authEmail.value).toLowerCase(),
    token: cleanText(authOtp.value),
    type: "email"
  });
  button.disabled = false;

  if (error) {
    showMessage("authMessage", "The code could not be verified: " + error.message, "error");
    return;
  }

  authOtp.value = "";
  await loadAccount(data.user);
});

const signOutButton = document.getElementById("signOutButton");
if (signOutButton) signOutButton.addEventListener("click", async function () {
  if (!supabaseClient) return;
  this.disabled = true;
  const { error } = await supabaseClient.auth.signOut();
  this.disabled = false;
  if (error) {
    showMessage("authMessage", "Could not sign out: " + error.message, "error");
  } else {
    showMessage("authMessage", "You have signed out.", "success");
    showTrackingMessage("Sign in with your verified email to view your requests.");
  }
});

const resendOtpButton = document.getElementById("resendOtpButton");
if (resendOtpButton) resendOtpButton.addEventListener("click", async function () {
  if (!supabaseClient) return;
  this.disabled = true;
  const { error } = await supabaseClient.auth.signInWithOtp({
    email: cleanText(authEmail.value).toLowerCase(),
    options: { shouldCreateUser: true }
  });
  this.disabled = false;
  showMessage("authMessage", error
    ? "Could not send a new code: " + error.message
    : "A new one-time code was sent to " + cleanText(authEmail.value) + ".", error ? "error" : "success");
});

const changeEmailButton = document.getElementById("changeEmailButton");
if (changeEmailButton) changeEmailButton.addEventListener("click", function () {
  otpForm.hidden = true;
  emailForm.hidden = false;
  authOtp.value = "";
  authEmail.focus();
  showMessage("authMessage", "Enter the email address you want to verify.", "");
});

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      showMessage("authMessage", "Could not restore your sign-in: " + error.message, "error");
      return;
    }
    if (data.session) loadAccount(data.session.user);
  });

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      accountRequestSequence += 1;
      displayAuthState(null, null);
      showTrackingMessage("Sign in with your verified email to view your requests.");
    } else if (event === "SIGNED_IN" && session) {
      window.setTimeout(() => loadAccount(session.user), 0);
    }
  });
}

async function insertRequest(form, payload, messageId, successText) {
  if (!currentUser || !assignedRoom) {
    showMessage(messageId, "Verify an email with an approved room assignment above before submitting.", "error");
    return;
  }

  const { data, error } = await supabaseClient
    .from("service_requests")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    showMessage(messageId, "Could not save your request: " + error.message, "error");
    return;
  }

  form.reset();
  showMessage(messageId, successText + " Your request ID is " + data.id + ".", "success");
  showToast("Request submitted successfully.");
  await renderRecords();
}

const cleaningForm = document.getElementById("cleaningForm");
if (cleaningForm) cleaningForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!this.reportValidity()) return;
  if (!supabaseClient) {
    showMessage("cleaningMessage", "Request submission is unavailable until Supabase is configured.", "error");
    return;
  }

  const data = formData(this);
  if (data.date < dateInput.min) {
    showMessage("cleaningMessage", "Please choose today or a future date.", "error");
    return;
  }

  const button = this.querySelector('button[type="submit"]');
  button.disabled = true;
  await insertRequest(this, {
    type: "Cleaning request",
    name: cleanText(data.studentName),
    date: data.date,
    time: data.time,
    details: cleanText(data.notes) || "No additional instructions"
  }, "cleaningMessage", "Success! Your cleaning request was submitted.");
  button.disabled = false;
});

const complaintForm = document.getElementById("complaintForm");
if (complaintForm) complaintForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!this.reportValidity()) return;
  if (!supabaseClient) {
    showMessage("complaintMessage", "Complaint submission is unavailable until Supabase is configured.", "error");
    return;
  }

  const data = formData(this);
  const button = this.querySelector('button[type="submit"]');
  button.disabled = true;
  await insertRequest(this, {
    type: "Cleaning complaint",
    name: cleanText(data.studentName),
    category: data.category,
    details: cleanText(data.description)
  }, "complaintMessage", "Complaint submitted.");
  button.disabled = false;
});

async function renderRecords() {
  const results = document.getElementById("trackingResults");
  if (!results) return;
  if (!currentUser || !assignedRoom || !supabaseClient) {
    showTrackingMessage("Verify your email and confirm your room assignment to see your requests.");
    return;
  }

  const { data: records, error } = await supabaseClient
    .from("service_requests")
    .select("id, type, hostel, room, date, time, details, category, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showTrackingMessage("Could not load your requests: " + error.message);
    return;
  }

  if (!records.length) {
    showTrackingMessage("No requests yet. Submit a cleaning request or complaint to see it here.");
    return;
  }

  const list = document.createElement("div");
  list.className = "request-list";
  records.forEach(record => {
    const item = document.createElement("article");
    item.className = "request-item";
    const details = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = record.type + " · " + record.hostel + ", Room " + record.room;
    const description = document.createElement("p");
    description.textContent = record.type === "Cleaning complaint"
      ? record.category + ": " + record.details
      : "Preferred date: " + record.date + " · " + record.time
        + (record.details !== "No additional instructions" ? " · " + record.details : "");
    const meta = document.createElement("div");
    meta.className = "request-meta";
    meta.textContent = "ID: " + record.id + " · Submitted: " + new Date(record.created_at).toLocaleString();
    const status = document.createElement("span");
    status.className = "status" + (record.status === "Completed" ? " completed" : record.status === "In Progress" ? " in-progress" : "");
    status.textContent = record.status;
    details.append(heading, description);
    item.append(details, status, meta);
    list.appendChild(item);
  });
  results.replaceChildren(list);
}

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
if (menuToggle && navLinks) menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});
if (navLinks && menuToggle) navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});
