document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const filterCategory = document.getElementById("filter-category");
  const sortActivities = document.getElementById("sort-activities");
  const searchActivities = document.getElementById("search-activities");

  let allActivities = {};
  let allCategories = new Set();

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      // Collect categories if present
      allCategories = new Set();
      Object.values(activities).forEach((details) => {
        if (details.category) allCategories.add(details.category);
      });
      renderCategoryOptions();
      renderActivities();
      renderActivitySelect();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Render category options in filter
  function renderCategoryOptions() {
    if (!filterCategory) return;
    filterCategory.innerHTML = '<option value="">All</option>';
    Array.from(allCategories)
      .sort()
      .forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        filterCategory.appendChild(opt);
      });
  }

  // Render activities with filters/sort/search
  function renderActivities() {
    let filtered = Object.entries(allActivities);
    // Filter by category
    const selectedCat = filterCategory && filterCategory.value;
    if (selectedCat) {
      filtered = filtered.filter(([, d]) => d.category === selectedCat);
    }
    // Search
    const searchVal = searchActivities && searchActivities.value.trim().toLowerCase();
    if (searchVal) {
      filtered = filtered.filter(([name, d]) =>
        name.toLowerCase().includes(searchVal) ||
        (d.description && d.description.toLowerCase().includes(searchVal))
      );
    }
    // Sort
    const sortVal = sortActivities && sortActivities.value;
    if (sortVal === "name") {
      filtered.sort(([a], [b]) => a.localeCompare(b));
    } else if (sortVal === "time") {
      filtered.sort(([, a], [, b]) => {
        if (a.schedule && b.schedule) {
          return a.schedule.localeCompare(b.schedule);
        }
        return 0;
      });
    }
    // Render
    activitiesList.innerHTML = "";
    if (filtered.length === 0) {
      activitiesList.innerHTML = "<p>No activities found.</p>";
      return;
    }
    filtered.forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Helper to render a single activity card (original logic)
  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const spotsLeft =
      details.max_participants - details.participants.length;

    const participantsHTML =
      details.participants.length > 0
        ? `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
        : `<p><em>No participants yet</em></p>`;

    activityCard.innerHTML = `
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p><strong>Schedule:</strong> ${details.schedule}</p>
      <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
      <div class="participants-container">
        ${participantsHTML}
      </div>
    `;

    activitiesList.appendChild(activityCard);
  }

  // Render activity select dropdown for signup form
  function renderActivitySelect() {
    if (!activitySelect) return;
    // Clear and add default option
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(allActivities).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Filter toolbar event listeners
  filterCategory && filterCategory.addEventListener("change", renderActivities);
  sortActivities && sortActivities.addEventListener("change", renderActivities);
  searchActivities && searchActivities.addEventListener("input", renderActivities);

  // Initialize app
  fetchActivities();
});
