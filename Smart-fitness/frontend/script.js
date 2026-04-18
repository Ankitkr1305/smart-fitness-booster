const menuToggle = document.querySelector(".menu-toggle");
const navItems = document.querySelectorAll(".nav-links a, .nav-actions a");
const range = document.querySelector("#habitRange");
const scoreValue = document.querySelector("#scoreValue");
const minuteValue = document.querySelector("#minuteValue");
const navbar = document.querySelector(".navbar");
const API_BASE_URL =
    window.location.port === "5000" ? "" : "http://localhost:5000";

if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        const isOpen = document.body.classList.toggle("nav-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
}

navItems.forEach((item) => {
    item.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });
});

function updateBoosterScore() {
    const minutes = Number(range.value);
    const score = Math.min(100, Math.round(48 + minutes * 0.53));

    scoreValue.textContent = score;
    minuteValue.textContent = `${minutes} min`;
}

if (range && scoreValue && minuteValue) {
    range.addEventListener("input", updateBoosterScore);
    updateBoosterScore();
}

function updateNavbarState() {
    if (!navbar) {
        return;
    }

    navbar.classList.toggle("scrolled", window.scrollY > 24);
}

window.addEventListener("scroll", updateNavbarState);
updateNavbarState();

const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.18 }
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

function setMessage(element, message, type) {
    if (!element) {
        return;
    }

    if (!message) {
        element.textContent = "";
        element.className = "form-message";
        return;
    }

    element.textContent = message;
    element.className = `form-message show ${type}`;
}

function saveSession(data) {
    localStorage.setItem("smartTrackerToken", data.token);
    localStorage.setItem("smartTrackerUser", JSON.stringify(data.user));
}

function getToken() {
    return localStorage.getItem("smartTrackerToken");
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.querySelector("#loginMessage");
        const formData = new FormData(loginForm);

        try {
            setMessage(message, "Logging in...", "success");
            const data = await apiRequest("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    username: formData.get("username"),
                    password: formData.get("password")
                })
            });

            saveSession(data);
            window.location.href = "dashboard.html";
        } catch (error) {
            setMessage(message, error.message, "error");
        }
    });
}

if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.querySelector("#signupMessage");
        const formData = new FormData(signupForm);

        try {
            setMessage(message, "Creating your account...", "success");
            const data = await apiRequest("/api/auth/signup", {
                method: "POST",
                body: JSON.stringify({
                    fullName: formData.get("fullName"),
                    goal: formData.get("goal"),
                    email: formData.get("email"),
                    password: formData.get("newPassword")
                })
            });

            saveSession(data);
            window.location.href = "dashboard.html";
        } catch (error) {
            setMessage(message, error.message, "error");
        }
    });
}

const socialLoginButtons = document.querySelectorAll("[data-social-login]");
const socialLoginForm = document.querySelector("#socialLoginForm");
const socialProviderInput = document.querySelector("#socialProvider");
const socialProviderLabel = document.querySelector("#socialProviderLabel");
const socialLoginMessage = document.querySelector("#socialLoginMessage");

function openSocialLogin(provider) {
    if (socialProviderInput) {
        socialProviderInput.value = provider;
    }
    if (socialProviderLabel) {
        socialProviderLabel.textContent = `${provider} login`;
    }
    setMessage(socialLoginMessage, "", "");
    openModal("#socialLoginModal");
    document.querySelector("#socialEmail")?.focus();
}

function closeSocialLogin() {
    closeModal("#socialLoginModal");
}

socialLoginButtons.forEach((button) => {
    button.addEventListener("click", () => {
        openSocialLogin(button.dataset.socialLogin || "Google");
    });
});

if (socialLoginForm) {
    socialLoginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(socialLoginForm);

        try {
            setMessage(socialLoginMessage, "Checking your email...", "success");
            const data = await apiRequest("/api/auth/social-login", {
                method: "POST",
                body: JSON.stringify({
                    provider: formData.get("provider"),
                    fullName: formData.get("fullName"),
                    email: formData.get("email")
                })
            });

            saveSession(data);
            window.location.href = "dashboard.html";
        } catch (error) {
            setMessage(socialLoginMessage, error.message, "error");
        }
    });
}

document.querySelector("#closeSocialLoginModal")?.addEventListener("click", closeSocialLogin);
document.querySelector("#socialLoginModal")?.addEventListener("click", (event) => {
    if (event.target.id === "socialLoginModal") {
        closeSocialLogin();
    }
});

const paymentButtons = document.querySelectorAll(".payment-button");
const paymentForm = document.querySelector("#paymentForm");
const paymentMessage = document.querySelector("#paymentMessage");
const paymentPlanKey = document.querySelector("#paymentPlanKey");
const paymentPlanTitle = document.querySelector("#paymentPlanTitle");
const paymentPlanMeta = document.querySelector("#paymentPlanMeta");
const payNowButton = document.querySelector("#payNowButton");

function getSavedUser() {
    try {
        return JSON.parse(localStorage.getItem("smartTrackerUser") || "{}");
    } catch (error) {
        return {};
    }
}

function setButtonLoading(button, isLoading, loadingText = "Processing...") {
    if (!button) {
        return;
    }

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.classList.add("is-loading");
        button.textContent = loadingText;
        return;
    }

    button.disabled = false;
    button.classList.remove("is-loading");
    button.textContent = button.dataset.originalText || button.textContent;
}

function openPaymentModal(button) {
    const user = getSavedUser();
    const planName = button.dataset.planName;
    const planPrice = button.dataset.planPrice;

    paymentPlanKey.value = button.dataset.planKey;
    paymentPlanTitle.textContent = `Pay Rs. ${planPrice} for ${planName}`;
    paymentPlanMeta.textContent = `${planName} plan will be activated after payment confirmation.`;
    document.querySelector("#paymentName").value = user.fullName || "";
    document.querySelector("#paymentEmail").value = user.email || "";
    setMessage(paymentMessage, "", "");
    openModal("#paymentModal");
}

function closePaymentModal() {
    closeModal("#paymentModal");
}

function goAfterPayment() {
    window.location.href = getToken() ? "dashboard.html" : "signup.html";
}

async function verifyRazorpayPayment(response) {
    const data = await apiRequest("/api/payments/verify", {
        method: "POST",
        body: JSON.stringify(response)
    });

    setMessage(paymentMessage, "Payment successful. Plan activated.", "success");
    window.setTimeout(() => {
        goAfterPayment();
    }, 900);
    return data;
}

function openRazorpayCheckout(orderData, customer) {
    if (!window.Razorpay) {
        throw new Error("Razorpay checkout could not load. Check your internet connection.");
    }

    const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Smart Tracker Booster",
        description: `${orderData.plan.name} plan`,
        order_id: orderData.order.id,
        prefill: {
            name: customer.customerName,
            email: customer.customerEmail
        },
        theme: {
            color: "#8a2be2"
        },
        handler: verifyRazorpayPayment
    });

    checkout.open();
}

paymentButtons.forEach((button) => {
    button.addEventListener("click", () => openPaymentModal(button));
});

if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(paymentForm);
        const customer = {
            planKey: formData.get("planKey"),
            customerName: formData.get("customerName"),
            customerEmail: formData.get("customerEmail")
        };

        try {
            setButtonLoading(payNowButton, true, "Creating order...");
            setMessage(paymentMessage, "Creating secure payment order...", "success");

            const orderData = await apiRequest("/api/payments/create-order", {
                method: "POST",
                body: JSON.stringify(customer)
            });

            if (orderData.demoMode) {
                setMessage(paymentMessage, "Demo mode active. Saving payment as successful...", "success");
                await apiRequest("/api/payments/demo-success", {
                    method: "POST",
                    body: JSON.stringify({ orderId: orderData.order.id })
                });
                setMessage(paymentMessage, "Demo payment successful. Plan activated.", "success");
                window.setTimeout(() => {
                    goAfterPayment();
                }, 900);
                return;
            }

            setMessage(paymentMessage, "Opening Razorpay checkout...", "success");
            openRazorpayCheckout(orderData, customer);
        } catch (error) {
            setMessage(paymentMessage, error.message, "error");
        } finally {
            setButtonLoading(payNowButton, false);
        }
    });
}

document.querySelector("#closePaymentModal")?.addEventListener("click", closePaymentModal);
document.querySelector("#paymentModal")?.addEventListener("click", (event) => {
    if (event.target.id === "paymentModal") {
        closePaymentModal();
    }
});

function updateText(selector, value) {
    const element = document.querySelector(selector);
    if (element && value !== undefined && value !== null) {
        element.textContent = value;
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showToast(message) {
    const toast = document.querySelector("#dashboardToast");
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(selector) {
    const modal = document.querySelector(selector);
    if (modal) {
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeModal(selector) {
    const modal = document.querySelector(selector);
    if (modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }
}

function getDashboardState() {
    try {
        return JSON.parse(localStorage.getItem("smartDashboardState") || "{}");
    } catch (error) {
        return {};
    }
}

function saveDashboardState(nextState) {
    const current = getDashboardState();
    localStorage.setItem("smartDashboardState", JSON.stringify({ ...current, ...nextState }));
}

function scrollToPanel(selector) {
    const panel = document.querySelector(selector);
    if (!panel) {
        return;
    }

    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    panel.classList.add("panel-highlight");
    window.setTimeout(() => panel.classList.remove("panel-highlight"), 1400);
}

function renderDashboard(data) {
    updateText("#dashboardUserName", data.user.name);
    updateText(
        "#dashboardIntro",
        `Your current goal is "${data.user.goal}" on the ${data.user.plan} plan. Track your score, workout, nutrition, schedule, recovery, and achievements here.`
    );
    updateText("#workoutTitle", data.workoutTitle);
    updateText("#workoutTimer", data.workoutDuration);
    updateText("#goalCompleted", `${data.summary.goalCompleted}%`);
    updateText("#boosterScore", `${data.summary.boosterScore}%`);
    updateText("#boosterTrend", data.summary.boosterTrend);
    updateText("#streakCount", data.summary.streak);
    updateText(
        "#streakNote",
        `${data.user.totalLoginDays || data.summary.streak} total login day${(data.user.totalLoginDays || data.summary.streak) > 1 ? "s" : ""}`
    );
    updateText("#stepsCount", data.summary.steps.toLocaleString("en-IN"));
    updateText("#stepsNote", data.summary.stepsNote);
    updateText("#caloriesCount", data.summary.calories);
    updateText("#caloriesNote", data.summary.caloriesNote);
    updateText("#nutritionCalories", `${data.nutrition.calories.toLocaleString("en-IN")} kcal`);
    updateText("#nutritionNote", data.nutrition.note);

    const progressBars = document.querySelector("#progressBars");
    if (progressBars) {
        progressBars.innerHTML = data.progress
            .map(
                (item) =>
                    `<div><span>${escapeHtml(item.label)}</span><strong>${item.value}%</strong><i style="--fill: ${item.value}%"></i></div>`
            )
            .join("");
    }

    const workoutList = document.querySelector("#workoutList");
    if (workoutList) {
        workoutList.innerHTML = data.workout
            .map((item) => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></div>`)
            .join("");
    }

    const macroGrid = document.querySelector("#macroGrid");
    if (macroGrid) {
        macroGrid.innerHTML = data.nutrition.macros
            .map((item) => `<div><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`)
            .join("");
    }

    const scheduleList = document.querySelector("#scheduleList");
    if (scheduleList) {
        scheduleList.innerHTML = data.schedule
            .map((item) => `<div><time>${escapeHtml(item.time)}</time><span>${escapeHtml(item.title)}</span></div>`)
            .join("");
    }

    const achievementList = document.querySelector("#achievementList");
    if (achievementList) {
        achievementList.innerHTML = data.achievements.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
    }

    const activityFeed = document.querySelector("#activityFeed");
    if (activityFeed) {
        activityFeed.innerHTML = data.activity
            .map((item) => `<p><strong>${escapeHtml(item.action)}</strong> ${escapeHtml(item.detail)}</p>`)
            .join("");
    }

    renderMongoEventTable(data.dashboardEvents || []);

    const plannerForm = document.querySelector("#plannerForm");
    if (plannerForm && data.user.preferences) {
        plannerForm.goal.value = data.user.goal || "Stay active";
        plannerForm.preferredWorkout.value = data.user.preferences.preferredWorkout || "Strength";
        plannerForm.experienceLevel.value = data.user.preferences.experienceLevel || "Beginner";
        plannerForm.mealPreference.value = data.user.preferences.mealPreference || "Balanced";
        plannerForm.wakeTime.value = data.user.preferences.wakeTime || "07:00";
        plannerForm.workoutTime.value = data.user.preferences.workoutTime || "18:00";
        plannerForm.sleepTime.value = data.user.preferences.sleepTime || "22:30";
        plannerForm.availableMinutes.value = data.user.preferences.availableMinutes || 38;
        plannerForm.workoutDays.value = data.user.preferences.workoutDays || 4;
        plannerForm.hydrationGoal.value = data.user.preferences.hydrationGoal || 3;
    }

    if (data.needsPreferences) {
        openModal("#plannerModal");
    }

    hydrateEnhancedDashboard(data);
}

function renderMongoEventTable(events) {
    const table = document.querySelector("#mongoEventTable");
    if (!table) {
        return;
    }

    const rows = events.length
        ? events
              .slice(0, 6)
              .map((event) => {
                  const payload = event.payload ? JSON.stringify(event.payload) : "Saved";
                  return `<div><span>${escapeHtml(event.label)}</span><span>${escapeHtml(payload)}</span></div>`;
              })
              .join("")
        : "<div><span>No saved events yet</span><span>Use dashboard buttons</span></div>";

    table.innerHTML = `<div><strong>Action</strong><strong>Data</strong></div>${rows}`;
}

async function postDashboardAction(path, body) {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return null;
    }

    const data = await apiRequest(path, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body || {})
    });

    if (data.dashboard) {
        renderDashboard(data.dashboard);
    }

    showToast(data.message || "Action completed");
    return data;
}

async function saveDashboardInteraction(eventType, label, payload = {}) {
    const token = getToken();
    if (!token) {
        return null;
    }

    try {
        const data = await apiRequest("/api/dashboard/interaction", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ eventType, label, payload })
        });

        if (data.savedData) {
            prependMongoEvent(data.savedData);
        }

        return data;
    } catch (error) {
        showToast(error.message);
        return null;
    }
}

function prependMongoEvent(event) {
    const table = document.querySelector("#mongoEventTable");
    if (!table) {
        return;
    }

    const payload = event.payload ? JSON.stringify(event.payload) : "Saved";
    const row = `<div><span>${escapeHtml(event.label)}</span><span>${escapeHtml(payload)}</span></div>`;
    const header = "<div><strong>Action</strong><strong>Data</strong></div>";
    const existingRows = [...table.querySelectorAll("div")]
        .slice(1)
        .filter((rowElement) => !rowElement.textContent.includes("No saved events yet"))
        .slice(0, 5)
        .map((rowElement) => rowElement.outerHTML)
        .join("");

    table.innerHTML = `${header}${row}${existingRows}`;
}

function setWorkoutRunning() {
    const timer = document.querySelector("#workoutTimer");
    const workoutItems = document.querySelectorAll("#workoutList div");

    updateText("#workoutTimer", "Running");
    if (timer) {
        timer.classList.add("running");
    }

    workoutItems.forEach((item, index) => {
        item.classList.toggle("active-task", index === 0);
    });

    updateCoachMessage("Workout mode is active. Keep your first block clean and controlled.");
}

async function completeWorkout() {
    document.querySelectorAll("#workoutList div").forEach((item) => {
        item.classList.add("completed");
        item.classList.remove("active-task");
    });
    updateText("#workoutTimer", "Done");
    updateCoachMessage("Workout completed. Great work. Prioritize protein and a calm cooldown now.");
    showToast("Workout marked complete. Great job!");
    await saveDashboardInteraction("workout_complete", "Marked workout complete", {
        completedAt: new Date().toISOString()
    });
}

function updateCoachMessage(message) {
    updateText("#coachMessage", message);
}

function updateReadinessState() {
    const energy = Number(document.querySelector("#energyRange")?.value || 7);
    const focus = Number(document.querySelector("#focusRange")?.value || 8);
    const recovery = Number(document.querySelector("#recoveryRange")?.value || 6);
    const readiness = Math.round(((energy + focus + recovery) / 30) * 100);

    updateText("#readinessScore", `${readiness}% ready`);

    let note = "You are in a strong zone for a focused workout today.";
    let coach = "You are ready to push a little harder in the main block today.";

    if (readiness < 55) {
        note = "Recovery is a little low. Keep intensity moderate and protect your form.";
        coach = "Today should feel smooth, not heavy. Use control, mobility, and shorter bursts.";
    } else if (readiness < 75) {
        note = "You are stable today. Aim for consistency and avoid wasted energy.";
        coach = "A balanced session will suit you best. Keep pace clean and recover between sets.";
    }

    updateText("#readinessNote", note);
    updateCoachMessage(coach);
    updateBodyBattery(readiness, recovery);

    const tagOne = readiness >= 75 ? "Peak session" : readiness >= 55 ? "Balanced day" : "Recovery mode";
    updateText("#coachTagOne", tagOne);
    updateText("#coachTagTwo", energy >= 8 ? "High energy" : "Energy watch");
    updateText("#coachTagThree", recovery >= 7 ? "Recovery good" : "Stretch longer");

    saveDashboardState({ energy, focus, recovery });
    saveReadinessInteraction(energy, focus, recovery, readiness);
}

function updateBodyBattery(readiness = 76, recovery = 6) {
    const battery = Math.max(28, Math.min(100, Math.round(readiness * 0.75 + recovery * 3.5)));
    const status = battery >= 80 ? "High energy" : battery >= 55 ? "Balanced" : "Recover";
    const note =
        battery >= 80
            ? "You have enough energy for a stronger training block today."
            : battery >= 55
              ? "Your body is ready for a controlled workout."
              : "Keep today's session lighter and prioritize recovery.";
    const fill = document.querySelector("#batteryFill");

    updateText("#batteryValue", `${battery}%`);
    updateText("#batteryStatus", status);
    updateText("#batteryNote", note);

    if (fill) {
        fill.style.height = `${battery}%`;
    }
}

let readinessSaveTimeout = null;

function saveReadinessInteraction(energy, focus, recovery, readiness) {
    window.clearTimeout(readinessSaveTimeout);
    readinessSaveTimeout = window.setTimeout(() => {
        saveDashboardInteraction("readiness_update", "Updated readiness sliders", {
            energy,
            focus,
            recovery,
            readiness,
            updatedAt: new Date().toISOString()
        });
    }, 500);
}

function setupHydrationTracker() {
    const state = getDashboardState();
    const filled = Number(state.waterCount || 0);
    const drops = document.querySelectorAll(".water-drop");
    let count = filled;

    function paint() {
        drops.forEach((drop, index) => {
            drop.classList.toggle("filled", index < count);
        });
        updateText("#hydrationStatus", `${count} / 8 glasses`);
        updateText(
            "#hydrationNote",
            count >= 8 ? "Hydration goal complete. Excellent discipline today." : `You need ${8 - count} more glasses to close the day strong.`
        );
        saveDashboardState({ waterCount: count });
    }

    drops.forEach((drop, index) => {
        drop.addEventListener("click", () => {
            count = index + 1 === count ? index : index + 1;
            paint();
            if (count > 0) {
                updateCoachMessage(`Hydration updated: ${count} of 8 glasses complete. Keep the momentum going.`);
            }
            saveDashboardInteraction("hydration_update", "Updated water tracker", {
                glasses: count,
                updatedAt: new Date().toISOString()
            });
        });
    });

    paint();
}

const missions = [
    {
        title: "Finish 3 focused sets without long breaks",
        description: "Complete this mini challenge to sharpen consistency and unlock a momentum badge today.",
        reward: "+15 XP"
    },
    {
        title: "Hit your hydration goal before workout time",
        description: "Use your water tracker early so your energy stays stable through the session.",
        reward: "+10 XP"
    },
    {
        title: "Walk 2,000 extra steps after dinner",
        description: "A short walk tonight will improve recovery and help close your daily step gap.",
        reward: "+18 XP"
    },
    {
        title: "Log every meal today with protein included",
        description: "Nutrition clarity gives your dashboard much smarter recommendations.",
        reward: "+20 XP"
    }
];

function renderMission(index) {
    const mission = missions[index % missions.length];
    updateText("#missionTitle", mission.title);
    updateText("#missionDescription", mission.description);
    updateText("#missionReward", mission.reward);
    saveDashboardState({ missionIndex: index });
}

function setupMissionModule() {
    const state = getDashboardState();
    let missionIndex = Number(state.missionIndex || 0);
    renderMission(missionIndex);

    document.querySelector("#newMissionButton")?.addEventListener("click", () => {
        missionIndex = (missionIndex + 1) % missions.length;
        renderMission(missionIndex);
        showToast("New mission loaded for today.");
        saveDashboardInteraction("mission_new", "Loaded new mission", {
            mission: missions[missionIndex],
            updatedAt: new Date().toISOString()
        });
    });

    document.querySelector("#completeMissionButton")?.addEventListener("click", async () => {
        const badgeGrid = document.querySelector("#achievementList");
        const mission = missions[missionIndex];
        if (badgeGrid && !badgeGrid.innerHTML.includes("Mission master")) {
            badgeGrid.insertAdjacentHTML("afterbegin", "<span>Mission master</span>");
        }
        const activityFeed = document.querySelector("#activityFeed");
        if (activityFeed) {
            activityFeed.insertAdjacentHTML("afterbegin", `<p><strong>Unlocked</strong> ${escapeHtml(mission.title)}.</p>`);
        }
        updateCoachMessage("Mission reward claimed. That kind of consistency compounds fast.");
        showToast("Reward claimed and badge unlocked.");
        await saveDashboardInteraction("mission_complete", "Claimed mission reward", {
            mission,
            completedAt: new Date().toISOString()
        });
    });
}

let focusInterval = null;
let focusSeconds = 300;

function paintFocusTimer() {
    const minutes = Math.floor(focusSeconds / 60);
    const seconds = focusSeconds % 60;
    updateText("#focusTimer", `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
}

function setupFocusTimer() {
    const startButton = document.querySelector("#startFocusButton");
    const resetButton = document.querySelector("#resetFocusButton");
    const panel = document.querySelector(".focus-panel");

    if (!startButton || !resetButton || startButton.dataset.bound) {
        return;
    }

    startButton.dataset.bound = "true";
    paintFocusTimer();

    startButton.addEventListener("click", () => {
        if (focusInterval) {
            window.clearInterval(focusInterval);
            focusInterval = null;
            startButton.textContent = "Resume";
            updateText("#focusStatus", "Paused");
            panel?.classList.remove("running");
            saveDashboardInteraction("focus_pause", "Paused focus timer", {
                remainingSeconds: focusSeconds,
                pausedAt: new Date().toISOString()
            });
            return;
        }

        startButton.textContent = "Pause";
        updateText("#focusStatus", "Running");
        panel?.classList.add("running");
        updateCoachMessage("Focus mode started. Keep your phone aside and finish this block cleanly.");
        saveDashboardInteraction("focus_start", "Started focus timer", {
            seconds: focusSeconds,
            startedAt: new Date().toISOString()
        });

        focusInterval = window.setInterval(() => {
            focusSeconds -= 1;
            paintFocusTimer();

            if (focusSeconds <= 0) {
                window.clearInterval(focusInterval);
                focusInterval = null;
                focusSeconds = 300;
                startButton.textContent = "Start Focus";
                updateText("#focusStatus", "Completed");
                panel?.classList.remove("running");
                showToast("Focus block completed. Nice work.");
                updateCoachMessage("Focus block complete. Take 60 seconds to breathe before the next move.");
                saveDashboardInteraction("focus_complete", "Completed focus timer", {
                    completedAt: new Date().toISOString()
                });
            }
        }, 1000);
    });

    resetButton.addEventListener("click", () => {
        if (focusInterval) {
            window.clearInterval(focusInterval);
            focusInterval = null;
        }
        focusSeconds = 300;
        paintFocusTimer();
        startButton.textContent = "Start Focus";
        updateText("#focusStatus", "Ready");
        panel?.classList.remove("running");
        saveDashboardInteraction("focus_reset", "Reset focus timer", {
            resetAt: new Date().toISOString()
        });
    });
}

function setupStreakMap() {
    const buttons = document.querySelectorAll("#streakMap button");
    if (!buttons.length || document.body.dataset.streakMapBound) {
        return;
    }

    document.body.dataset.streakMapBound = "true";

    function paint() {
        const activeCount = [...buttons].filter((button) => button.classList.contains("active")).length;
        updateText("#streakMapStatus", `${activeCount} / 7 active`);
        saveDashboardState({ activeWeekDays: activeCount });
    }

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            button.classList.toggle("active");
            paint();
            updateCoachMessage("Weekly map updated. Small visible wins make consistency easier.");
            saveDashboardInteraction("streak_map_update", "Updated weekly streak map", {
                activeDays: [...buttons].filter((item) => item.classList.contains("active")).map((item) => item.textContent),
                updatedAt: new Date().toISOString()
            });
        });
    });

    paint();
}

function setupMoodCheck() {
    const buttons = document.querySelectorAll("#moodGrid button");
    if (!buttons.length || document.body.dataset.moodBound) {
        return;
    }

    document.body.dataset.moodBound = "true";
    const moodNotes = {
        Calm: "Calm mood selected. Keep the workout smooth and focus on clean form.",
        Strong: "Strong mood selected. Keep intensity high but controlled.",
        Tired: "Tired mood selected. Reduce intensity and protect recovery today.",
        Focused: "Focused mood selected. This is a good day for precise sets and short rests."
    };

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            buttons.forEach((item) => item.classList.remove("selected"));
            button.classList.add("selected");
            const mood = button.dataset.mood || "Strong";
            updateText("#moodStatus", mood);
            updateText("#moodCoach", moodNotes[mood]);
            updateCoachMessage(moodNotes[mood]);
            saveDashboardState({ mood });
            saveDashboardInteraction("mood_update", "Updated mood check", {
                mood,
                note: moodNotes[mood],
                updatedAt: new Date().toISOString()
            });
        });
    });
}

function hydrateEnhancedDashboard(data) {
    const state = getDashboardState();
    const energyRange = document.querySelector("#energyRange");
    const focusRange = document.querySelector("#focusRange");
    const recoveryRange = document.querySelector("#recoveryRange");

    if (energyRange && focusRange && recoveryRange) {
        if (!energyRange.dataset.bound) {
            [energyRange, focusRange, recoveryRange].forEach((range) => {
                range.dataset.bound = "true";
                range.addEventListener("input", updateReadinessState);
            });
        }

        energyRange.value = state.energy || 7;
        focusRange.value = state.focus || 8;
        recoveryRange.value = state.recovery || 6;
        updateReadinessState();
    }

    if (!document.body.dataset.hydrationBound) {
        document.body.dataset.hydrationBound = "true";
        setupHydrationTracker();
        setupMissionModule();
        setupFocusTimer();
        setupStreakMap();
        setupMoodCheck();
    }

    updateCoachMessage(
        `${data.user.name}, your ${String(data.user.goal).toLowerCase()} plan looks strong today. Keep ${String(data.user.preferences.preferredWorkout).toLowerCase()} intentional and recover well after.`
    );
}

function openMealModal() {
    openModal("#mealModal");
    document.querySelector("#mealName")?.focus();
}

function closeMealModal() {
    closeModal("#mealModal");
    saveDashboardInteraction("meal_modal_close", "Closed meal log modal", {
        closedAt: new Date().toISOString()
    });
}

async function handleDashboardAction(action) {
    try {
        if (action === "start-workout") {
            scrollToPanel("#workout");
            setWorkoutRunning();
            await postDashboardAction("/api/dashboard/workout/start");
        }

        if (action === "log-meal") {
            scrollToPanel("#nutrition");
            openMealModal();
            await saveDashboardInteraction("meal_modal_open", "Opened meal log modal", {
                openedAt: new Date().toISOString()
            });
        }

        if (action === "view-schedule") {
            scrollToPanel("#schedule");
            await postDashboardAction("/api/dashboard/schedule/view");
        }

        if (action === "check-progress") {
            scrollToPanel("#progress");
            await postDashboardAction("/api/dashboard/progress/check");
        }
    } catch (error) {
        showToast(error.message);
    }
}

document.querySelectorAll("[data-dashboard-action]").forEach((button) => {
    button.addEventListener("click", () => {
        handleDashboardAction(button.dataset.dashboardAction);
    });
});

document.querySelector(".quick-panel a[href='index.html']")?.addEventListener("click", async (event) => {
    event.preventDefault();
    await saveDashboardInteraction("back_to_website", "Clicked back to website", {
        clickedAt: new Date().toISOString()
    });
    window.location.href = "index.html";
});

const mealForm = document.querySelector("#mealForm");
if (mealForm) {
    mealForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(mealForm);

        try {
            await postDashboardAction("/api/dashboard/meal", {
                mealName: formData.get("mealName"),
                calories: Number(formData.get("calories")),
                protein: Number(formData.get("protein"))
            });
            mealForm.reset();
            closeMealModal();
        } catch (error) {
            showToast(error.message);
        }
    });
}

document.querySelector("#closeMealModal")?.addEventListener("click", closeMealModal);
document.querySelector("#mealModal")?.addEventListener("click", (event) => {
    if (event.target.id === "mealModal") {
        closeMealModal();
    }
});
document.querySelector("#openPlannerButton")?.addEventListener("click", () => {
    openModal("#plannerModal");
    saveDashboardInteraction("planner_open", "Opened customize plan", {
        openedAt: new Date().toISOString()
    });
});
document.querySelector("#closePlannerModal")?.addEventListener("click", () => {
    closeModal("#plannerModal");
    saveDashboardInteraction("planner_close", "Closed customize plan", {
        closedAt: new Date().toISOString()
    });
});
document.querySelector("#plannerModal")?.addEventListener("click", (event) => {
    if (event.target.id === "plannerModal") {
        closeModal("#plannerModal");
        saveDashboardInteraction("planner_close", "Closed customize plan", {
            closedAt: new Date().toISOString()
        });
    }
});
document.querySelector("#completeWorkoutButton")?.addEventListener("click", completeWorkout);
document.querySelector("#logoutButton")?.addEventListener("click", async () => {
    await saveDashboardInteraction("logout", "Clicked logout", {
        clickedAt: new Date().toISOString()
    });
    localStorage.removeItem("smartTrackerToken");
    localStorage.removeItem("smartTrackerUser");
    window.location.href = "login.html";
});

const plannerForm = document.querySelector("#plannerForm");
if (plannerForm) {
    plannerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const token = getToken();
        const formData = new FormData(plannerForm);

        try {
            const data = await apiRequest("/api/dashboard/preferences", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    goal: formData.get("goal"),
                    preferredWorkout: formData.get("preferredWorkout"),
                    experienceLevel: formData.get("experienceLevel"),
                    mealPreference: formData.get("mealPreference"),
                    wakeTime: formData.get("wakeTime"),
                    workoutTime: formData.get("workoutTime"),
                    sleepTime: formData.get("sleepTime"),
                    availableMinutes: Number(formData.get("availableMinutes")),
                    workoutDays: Number(formData.get("workoutDays")),
                    hydrationGoal: Number(formData.get("hydrationGoal"))
                })
            });

            renderDashboard(data.dashboard);
            closeModal("#plannerModal");
            showToast(data.message);
        } catch (error) {
            showToast(error.message);
        }
    });
}

async function loadDashboard() {
    if (!document.querySelector(".dashboard-page")) {
        return;
    }

    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const data = await apiRequest("/api/dashboard", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        renderDashboard(data);
    } catch (error) {
        localStorage.removeItem("smartTrackerToken");
        localStorage.removeItem("smartTrackerUser");
        window.location.href = "login.html";
    }
}

loadDashboard();
