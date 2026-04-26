const menuToggle = document.querySelector(".menu-toggle");
const navItems = document.querySelectorAll(".nav-links a, .nav-actions a");
const range = document.querySelector("#habitRange");
const scoreValue = document.querySelector("#scoreValue");
const minuteValue = document.querySelector("#minuteValue");
const navbar = document.querySelector(".navbar");
let API_BASE_URL = "";
if (window.location.hostname.endsWith("vercel.app")) {
    API_BASE_URL = "https://smart-fitness-booster-api.vercel.app";
} else if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    if (window.location.port !== "5000" && window.location.port !== "") {
        API_BASE_URL = "http://localhost:5000";
    }
}
const STATIC_PAYMENT_QR = "assets/images/payment-qr.jpeg";

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
const generateQrButton = document.querySelector("#generateQrButton");
const paymentQrPanel = document.querySelector("#paymentQrPanel");
const paymentQrImage = document.querySelector("#paymentQrImage");
const paymentQrAmount = document.querySelector("#paymentQrAmount");
const paymentUpiLink = document.querySelector("#paymentUpiLink");
const paymentQrOrderId = document.querySelector("#paymentQrOrderId");
const paymentUtr = document.querySelector("#paymentUtr");
const confirmQrPaymentButton = document.querySelector("#confirmQrPaymentButton");

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

function resetQrPaymentState() {
    if (paymentQrPanel) {
        paymentQrPanel.hidden = true;
    }

    if (paymentQrImage) {
        paymentQrImage.removeAttribute("src");
    }

    if (paymentQrAmount) {
        paymentQrAmount.textContent = "Rs. 0";
    }

    if (paymentUpiLink) {
        paymentUpiLink.setAttribute("href", "#");
    }

    if (paymentQrOrderId) {
        paymentQrOrderId.value = "";
    }

    if (paymentUtr) {
        paymentUtr.value = "";
    }
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
    resetQrPaymentState();
    openModal("#paymentModal");
}

function closePaymentModal() {
    closeModal("#paymentModal");
    resetQrPaymentState();
}

function goAfterPayment() {
    window.location.href = getToken() ? "dashboard.html" : "signup.html";
}

function getPaymentCustomer() {
    const formData = new FormData(paymentForm);
    return {
        planKey: formData.get("planKey"),
        customerName: formData.get("customerName"),
        customerEmail: formData.get("customerEmail")
    };
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

function renderQrPayment(payment) {
    if (!paymentQrPanel || !paymentQrImage || !paymentUpiLink || !paymentQrOrderId || !paymentQrAmount) {
        return;
    }

    paymentQrPanel.hidden = false;
    paymentQrImage.src = STATIC_PAYMENT_QR || payment.qrCodeDataUrl;
    paymentQrAmount.textContent = `Rs. ${payment.amount}`;
    paymentUpiLink.href = payment.upiLink;
    paymentQrOrderId.value = payment.orderId;
}

async function generateUpiQrPayment() {
    if (!paymentForm) {
        return;
    }

    const customer = getPaymentCustomer();

    try {
        setButtonLoading(generateQrButton, true, "Generating...");
        setMessage(paymentMessage, "Generating your payment QR...", "success");

        const data = await apiRequest("/api/payments/create-upi-qr", {
            method: "POST",
            body: JSON.stringify(customer)
        });

        renderQrPayment(data.payment);
        setMessage(paymentMessage, "QR ready. Scan, pay, then enter the UTR number below.", "success");
    } catch (error) {
        setMessage(paymentMessage, error.message, "error");
    } finally {
        setButtonLoading(generateQrButton, false);
    }
}

async function confirmUpiQrPayment() {
    if (!paymentQrOrderId || !paymentUtr) {
        return;
    }

    const orderId = paymentQrOrderId.value;
    const utrNumber = paymentUtr.value.trim();

    if (!orderId) {
        setMessage(paymentMessage, "Generate the QR first.", "error");
        return;
    }

    if (!utrNumber) {
        setMessage(paymentMessage, "Enter the UTR or transaction ID after payment.", "error");
        return;
    }

    try {
        setButtonLoading(confirmQrPaymentButton, true, "Confirming...");
        const data = await apiRequest("/api/payments/confirm-upi", {
            method: "POST",
            body: JSON.stringify({
                orderId,
                utrNumber
            })
        });

        setMessage(paymentMessage, data.message, "success");
        window.setTimeout(() => {
            goAfterPayment();
        }, 900);
    } catch (error) {
        setMessage(paymentMessage, error.message, "error");
    } finally {
        setButtonLoading(confirmQrPaymentButton, false);
    }
}

paymentButtons.forEach((button) => {
    button.addEventListener("click", () => openPaymentModal(button));
});

if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const customer = getPaymentCustomer();

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

generateQrButton?.addEventListener("click", generateUpiQrPayment);
confirmQrPaymentButton?.addEventListener("click", confirmUpiQrPayment);

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

function setInputValue(selector, value, fallback = "") {
    const element = document.querySelector(selector);
    if (!element) {
        return;
    }

    element.value = value !== undefined && value !== null && value !== "" ? value : fallback;
}

function getInputValue(selector) {
    return document.querySelector(selector)?.value?.trim() || "";
}

let currentDashboardData = null;

function toTitleCase(value) {
    return String(value || "")
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
        .join(" ");
}

function calculateBmi(height, weight) {
    const numericHeight = Number(height || 0);
    const numericWeight = Number(weight || 0);
    if (!numericHeight || !numericWeight) {
        return null;
    }

    const meters = numericHeight / 100;
    if (!meters) {
        return null;
    }

    return Number((numericWeight / (meters * meters)).toFixed(1));
}

function calculateProfileComplete(preferences = {}) {
    return Boolean(
        Number(preferences.currentWeight) &&
        Number(preferences.height) &&
        preferences.activityLevel &&
        preferences.equipmentAccess &&
        preferences.primaryChallenge &&
        Number(preferences.sleepHours) &&
        preferences.schedulePreference &&
        preferences.stressLevel &&
        preferences.focusArea &&
        Number(preferences.age) &&
        preferences.occupation
    );
}

function buildFallbackProfileInsights(preferences = {}) {
    const currentWeight = Number(preferences.currentWeight || 0) || null;
    const targetWeight = Number(preferences.targetWeight || 0) || null;
    const height = Number(preferences.height || 0) || null;
    const bmi = calculateBmi(height, currentWeight);
    const weightChange = currentWeight && targetWeight ? Number((targetWeight - currentWeight).toFixed(1)) : null;

    let paceLabel = "Steady plan";
    if (weightChange !== null) {
        paceLabel =
            weightChange < 0 ? `${Math.abs(weightChange)} kg to lose` :
            weightChange > 0 ? `${weightChange} kg to gain` :
            "Weight maintenance";
    }

    const sleepHours = Number(preferences.sleepHours || 0) || null;
    const recoveryLabel =
        sleepHours >= 8 ? "Recovery-friendly sleep target" :
        sleepHours >= 6 ? "Moderate recovery target" :
        "Sleep target needs support";

    return {
        currentWeight,
        targetWeight,
        height,
        bmi,
        weightChange,
        paceLabel,
        recoveryLabel,
        activityLevel: preferences.activityLevel || "Not set",
        equipmentAccess: preferences.equipmentAccess || "Not set",
        primaryChallenge: preferences.primaryChallenge || "Not set",
        sleepHours
    };
}

function shiftTimeLabel(timeValue, minuteOffset) {
    const [hours = "07", minutes = "00"] = String(timeValue || "07:00").split(":");
    const totalMinutes = Number(hours) * 60 + Number(minutes) + minuteOffset;
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function buildFallbackAiPlan(data) {
    const preferences = data.user?.preferences || {};
    const nutrition = data.nutrition || { calories: 0 };
    const workoutTitle = data.workoutTitle || `${toTitleCase(preferences.preferredWorkout || "Strength")} session`;
    const wakeTime = preferences.wakeTime || "07:00";
    const workoutTime = preferences.workoutTime || "18:00";
    const sleepTime = preferences.sleepTime || "22:30";
    const dietaryPreference = preferences.dietaryPreference || preferences.mealPreference || "Balanced";
    const focusArea = preferences.focusArea || preferences.preferredWorkout || "General fitness";

    const meals = dietaryPreference === "Vegetarian"
        ? [
            { title: "Breakfast", time: shiftTimeLabel(wakeTime, 45), detail: "Oats or poha with curd / fruit." },
            { title: "Lunch", time: "13:30", detail: "Dal, roti, sabzi, paneer or soy-based protein." },
            { title: "Snack", time: shiftTimeLabel(workoutTime, -60), detail: "Curd, chana, banana, or lassi for workout fuel." },
            { title: "Dinner", time: shiftTimeLabel(workoutTime, 90), detail: "Light protein-focused meal with vegetables." }
        ]
        : [
            { title: "Breakfast", time: shiftTimeLabel(wakeTime, 45), detail: "Eggs or oats with fruit and hydration." },
            { title: "Lunch", time: "13:30", detail: "Protein-heavy lunch with balanced carbs." },
            { title: "Snack", time: shiftTimeLabel(workoutTime, -60), detail: "High-protein snack before training." },
            { title: "Dinner", time: shiftTimeLabel(workoutTime, 90), detail: "Recovery meal with protein and vegetables." }
        ];

    return {
        headline: `${data.user?.name || "Athlete"}, your AI-managed day is built from your saved inputs`,
        summary: `The dashboard is following your ${String(data.user?.goal || "fitness").toLowerCase()} goal, ${preferences.activityLevel || "custom"} activity level, and main challenge: ${preferences.primaryChallenge || "not set"}.`,
        meals,
        schedule: [
            { time: wakeTime, title: "Wake and reset", detail: "Water, light mobility, and body check." },
            { time: meals[0].time, title: meals[0].title, detail: meals[0].detail },
            { time: "11:30", title: "Focus / posture reset", detail: "2-minute stretch and water break." },
            { time: meals[1].time, title: meals[1].title, detail: meals[1].detail },
            { time: meals[2].time, title: meals[2].title, detail: meals[2].detail },
            { time: workoutTime, title: workoutTitle, detail: `${preferences.availableMinutes || 38} min ${String(focusArea).toLowerCase()} block` },
            { time: meals[3].time, title: meals[3].title, detail: meals[3].detail },
            { time: sleepTime, title: "Sleep wind-down", detail: "Screen down, calm down, recovery on." }
        ],
        recoveryItems: [
            `Aim for ${preferences.sleepHours || 7} hours sleep with a proper wind-down.`,
            "Do a short stretch or walk after long sitting blocks.",
            "Spread hydration through the day instead of catching up late.",
            `Use stress control cues because your current stress level is ${preferences.stressLevel || "not set"}.`
        ],
        focusArea,
        stepGoal: Number(preferences.stepGoal || 9000),
        caloriesTarget: nutrition.calories || 0
    };
}

function getLatestPreferenceSnapshot(events = []) {
    const latestPreferenceEvent = events.find((event) => event.eventType === "preferences_update");
    return {
        goal: latestPreferenceEvent?.payload?.goal || "",
        preferences: latestPreferenceEvent?.payload?.preferences || {}
    };
}

function normalizeDashboardData(rawData) {
    const data = { ...rawData };
    const latestPreferenceSnapshot = getLatestPreferenceSnapshot(data.dashboardEvents || []);
    const preferences = {
        ...(data.user?.preferences || {}),
        ...(latestPreferenceSnapshot.preferences || {})
    };
    data.user = { ...(data.user || {}), preferences };
    data.user.goal = latestPreferenceSnapshot.goal || data.user.goal;

    const profileComplete =
        typeof data.profileComplete === "boolean"
            ? data.profileComplete
            : !data.needsPreferences && calculateProfileComplete(preferences);

    data.profileComplete = profileComplete;
    data.needsPreferences = typeof data.needsPreferences === "boolean" ? data.needsPreferences : !profileComplete;
    data.profileInsights = data.profileInsights || buildFallbackProfileInsights(preferences);
    data.habitSignals = data.habitSignals || [
        { label: "Hydration", value: `${preferences.hydrationGoal || 3}L daily hydration target` },
        {
            label: "Recovery",
            value: data.profileInsights.sleepHours
                ? `${data.profileInsights.sleepHours}h planned sleep`
                : "Set your sleep target for sharper recovery"
        },
        {
            label: "Constraint",
            value: preferences.primaryChallenge
                ? `Main blocker: ${preferences.primaryChallenge}`
                : "Add your main challenge for tighter advice"
        }
    ];
    data.aiPlan = {
        ...buildFallbackAiPlan(data),
        ...(data.aiPlan || {}),
        caloriesTarget: data.aiPlan?.caloriesTarget || data.nutrition?.calories || 0
    };

    return data;
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

function syncStateFromMongoEvents(events) {
    if (!events || !events.length) return;
    
    const currentState = getDashboardState();
    const nextState = { ...currentState };
    let hasUpdates = false;

    const sortedEvents = [...events].reverse();
    
    sortedEvents.forEach(event => {
        const payload = event.payload || {};
        
        if (event.eventType === "mood_update" && payload.mood) {
            nextState.mood = payload.mood;
            hasUpdates = true;
        } else if (event.eventType === "hydration_update" && payload.glasses !== undefined) {
            nextState.waterCount = payload.glasses;
            hasUpdates = true;
        } else if (event.eventType === "readiness_update") {
            if (payload.energy !== undefined) nextState.energy = payload.energy;
            if (payload.focus !== undefined) nextState.focus = payload.focus;
            if (payload.recovery !== undefined) nextState.recovery = payload.recovery;
            hasUpdates = true;
        } else if (event.eventType === "streak_map_update" && Array.isArray(payload.activeDays)) {
            nextState.activeWeekDays = payload.activeDays.length;
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        localStorage.setItem("smartDashboardState", JSON.stringify(nextState));
    }
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
    data = normalizeDashboardData(data);
    currentDashboardData = data;
    
    if (data.dashboardEvents) {
        syncStateFromMongoEvents(data.dashboardEvents);
    }
    
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

    renderProfileSnapshot(data);
    renderCompletionPanel(data);
    renderTargetsPanel(data);
    renderMongoEventTable(data.dashboardEvents || []);

    if (data.user.preferences) {
        setInputValue("#plannerGoal", data.user.goal, "Stay active");
        setInputValue("#plannerWorkout", data.user.preferences.preferredWorkout, "Strength");
        setInputValue("#plannerExperience", data.user.preferences.experienceLevel, "Beginner");
        setInputValue("#plannerMealPreference", data.user.preferences.mealPreference, "Balanced");
        setInputValue("#plannerAge", data.user.preferences.age);
        setInputValue("#plannerOccupation", data.user.preferences.occupation);
        setInputValue("#plannerWakeTime", data.user.preferences.wakeTime, "07:00");
        setInputValue("#plannerWorkoutTime", data.user.preferences.workoutTime, "18:00");
        setInputValue("#plannerSleepTime", data.user.preferences.sleepTime, "22:30");
        setInputValue("#plannerMinutes", data.user.preferences.availableMinutes, 38);
        setInputValue("#plannerDays", data.user.preferences.workoutDays, 4);
        setInputValue("#plannerHydration", data.user.preferences.hydrationGoal, 3);
        setInputValue("#plannerCurrentWeight", data.user.preferences.currentWeight);
        setInputValue("#plannerTargetWeight", data.user.preferences.targetWeight);
        setInputValue("#plannerHeight", data.user.preferences.height);
        setInputValue("#plannerSleepHours", data.user.preferences.sleepHours);
        setInputValue("#plannerDietaryPreference", data.user.preferences.dietaryPreference);
        setInputValue("#plannerSchedulePreference", data.user.preferences.schedulePreference);
        setInputValue("#plannerStressLevel", data.user.preferences.stressLevel);
        setInputValue("#plannerStepGoal", data.user.preferences.stepGoal);
        setInputValue("#plannerActivityLevel", data.user.preferences.activityLevel);
        setInputValue("#plannerFocusArea", data.user.preferences.focusArea);
        setInputValue("#plannerEquipment", data.user.preferences.equipmentAccess);
        setInputValue("#plannerChallenge", data.user.preferences.primaryChallenge);
    }

    if (data.needsPreferences) {
        openModal("#plannerModal");
    }

    renderAssistantGuidance(data);
    hydrateEnhancedDashboard(data);
}

function renderCompletionPanel(data) {
    const preferences = data.user?.preferences || {};
    const checks = [
        { label: "Body stats", done: Boolean(Number(preferences.currentWeight) && Number(preferences.height) && Number(preferences.age)) },
        { label: "Schedule", done: Boolean(preferences.wakeTime && preferences.workoutTime && preferences.sleepTime && preferences.schedulePreference) },
        { label: "Recovery", done: Boolean(Number(preferences.sleepHours) && preferences.stressLevel && Number(preferences.hydrationGoal)) },
        { label: "Lifestyle", done: Boolean(preferences.activityLevel && preferences.occupation && preferences.primaryChallenge) },
        { label: "Training setup", done: Boolean(preferences.preferredWorkout && preferences.focusArea && preferences.equipmentAccess) }
    ];
    const percent = Math.round((checks.filter((item) => item.done).length / checks.length) * 100);
    const fill = document.querySelector("#completionMeterFill");

    updateText("#completionStatus", `${percent}% complete`);
    updateText(
        "#completionNote",
        data.profileComplete
            ? "Your dashboard is now running on your saved profile, schedule, and real-world constraints."
            : "Finish the missing planner groups below so the assistant and dashboard stop relying on fallback defaults."
    );

    if (fill) {
        fill.style.width = `${percent}%`;
    }

    const checklist = document.querySelector("#completionChecklist");
    if (checklist) {
        checklist.innerHTML = checks
            .map((item) => `<span class="${item.done ? "is-complete" : ""}">${escapeHtml(item.label)} ${item.done ? "done" : "pending"}</span>`)
            .join("");
    }
}

function renderTargetsPanel(data) {
    const preferences = data.user?.preferences || {};
    const targets = [
        { label: "Workout", value: `${preferences.availableMinutes || 38} min at ${preferences.workoutTime || "18:00"}` },
        { label: "Hydration", value: `${preferences.hydrationGoal || 3}L target` },
        { label: "Sleep", value: `${preferences.sleepHours || 7}h target` },
        { label: "Steps", value: `${Number(preferences.stepGoal || data.aiPlan?.stepGoal || 9000).toLocaleString("en-IN")}` }
    ];

    updateText("#targetsFocusLabel", data.aiPlan?.focusArea || preferences.focusArea || "Daily focus");
    updateText(
        "#targetsNote",
        data.profileComplete
            ? `Built around your ${preferences.primaryChallenge || "current routine"} challenge and ${preferences.activityLevel || "custom"} activity level.`
            : "Targets will become more accurate after you complete the full planner."
    );

    const targetsGrid = document.querySelector("#targetsGrid");
    if (targetsGrid) {
        targetsGrid.innerHTML = targets
            .map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`)
            .join("");
    }
}

function renderAiPlan(data) {
    updateText("#aiFocusArea", data.aiPlan?.focusArea || "General fitness");
    updateText("#aiCaloriesTarget", data.aiPlan?.caloriesTarget ? `${data.aiPlan.caloriesTarget} kcal` : "0 kcal");

    const aiScheduleList = document.querySelector("#aiScheduleList");
    if (aiScheduleList) {
        aiScheduleList.innerHTML = (data.aiPlan?.schedule || [])
            .map(
                (item) =>
                    `<div><time>${escapeHtml(item.time)}</time><span><strong>${escapeHtml(item.title)}</strong>${escapeHtml(item.detail)}</span></div>`
            )
            .join("");
    }

    const aiMealGrid = document.querySelector("#aiMealGrid");
    if (aiMealGrid) {
        aiMealGrid.innerHTML = (data.aiPlan?.meals || [])
            .map(
                (item) =>
                    `<div><strong>${escapeHtml(item.title)} · ${escapeHtml(item.time)}</strong><span>${escapeHtml(item.detail)}</span></div>`
            )
            .join("");
    }
}

function renderProfileSnapshot(data) {
    updateText("#profileStatus", data.profileComplete ? "Profile ready" : "Profile incomplete");
    updateText(
        "#profileSummary",
        data.profileComplete
            ? "Your assistant is now using your real body stats, activity level, equipment access, and main challenge."
            : "Add your body stats, activity level, equipment, and main challenge so recommendations match your real routine."
    );
    updateText("#recoveryLabel", data.profileInsights?.recoveryLabel || "Set your profile");
    updateText("#paceLabel", data.profileInsights?.paceLabel || "Plan pace pending");
    updateText("#activityLevelLabel", data.profileInsights?.activityLevel || "Activity level pending");
    updateText("#equipmentLabel", data.profileInsights?.equipmentAccess || "Equipment not selected");

    const profileFacts = document.querySelector("#profileFacts");
    if (profileFacts) {
        profileFacts.innerHTML = `
            <div><span>Current weight</span><strong>${data.profileInsights?.currentWeight ? `${escapeHtml(data.profileInsights.currentWeight)} kg` : "Not set"}</strong></div>
            <div><span>Target weight</span><strong>${data.profileInsights?.targetWeight ? `${escapeHtml(data.profileInsights.targetWeight)} kg` : "Not set"}</strong></div>
            <div><span>Height</span><strong>${data.profileInsights?.height ? `${escapeHtml(data.profileInsights.height)} cm` : "Not set"}</strong></div>
            <div><span>BMI</span><strong>${data.profileInsights?.bmi ? escapeHtml(data.profileInsights.bmi) : "Pending"}</strong></div>
        `;
    }

    const habitSignalGrid = document.querySelector("#habitSignalGrid");
    if (habitSignalGrid) {
        habitSignalGrid.innerHTML = (data.habitSignals || [])
            .map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`)
            .join("");
    }

    renderPlanSync(data);
    renderRoadmap(data);
    renderAiPlan(data);
}

function formatDateTime(value) {
    if (!value) {
        return "Not saved yet";
    }

    try {
        return new Date(value).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (error) {
        return "Not saved yet";
    }
}

function renderPlanSync(data) {
    updateText("#planSyncStatus", data.profileComplete ? "Profile synced" : "Awaiting inputs");
    updateText(
        "#syncNote",
        data.profileComplete
            ? "Your latest planner inputs are active, and the assistant is now following them."
            : "Complete the missing profile fields so your dashboard can fully sync with your real routine."
    );

    const latestPreferenceSave = (data.dashboardEvents || []).find((event) => event.eventType === "preferences_update");
    const syncGrid = document.querySelector("#syncGrid");
    if (!syncGrid) {
        return;
    }

    syncGrid.innerHTML = `
        <div><span>Workout slot</span><strong>${escapeHtml(data.user.preferences.workoutTime || "Not set")}</strong></div>
        <div><span>Meal style</span><strong>${escapeHtml(data.user.preferences.mealPreference || "Not set")}</strong></div>
        <div><span>Main challenge</span><strong>${escapeHtml(data.user.preferences.primaryChallenge || "Not set")}</strong></div>
        <div><span>Last profile save</span><strong>${escapeHtml(formatDateTime(latestPreferenceSave?.createdAt))}</strong></div>
    `;
}

function renderRoadmap(data) {
    const roadmap = [];
    const preferences = data.user.preferences || {};

    if (!data.profileComplete) {
        roadmap.push(
            { title: "Complete your profile", detail: "Add body stats, activity level, equipment, and challenge first." },
            { title: "Save your planner", detail: "Once saved, the dashboard will reflect your real constraints." },
            { title: "Refresh the assistant", detail: "Then the AI will guide you from your own inputs only." }
        );
    } else {
        roadmap.push({
            title: `Protect ${preferences.workoutTime || "your workout"} slot`,
            detail: `${preferences.availableMinutes || 0} minutes is your current training window. Start on time.`
        });
        roadmap.push({
            title: `Work around ${preferences.primaryChallenge || "your main blocker"}`,
            detail: `Your suggestions are now filtered through "${preferences.primaryChallenge || "your current challenge"}".`
        });
        roadmap.push({
            title: `Use your ${preferences.equipmentAccess || "selected equipment"} setup well`,
            detail: `The workout and assistant are adapting to your chosen equipment access.`
        });
    }

    updateText("#roadmapStatus", data.profileComplete ? "Profile-based" : "Needs profile");

    const roadmapList = document.querySelector("#roadmapList");
    if (!roadmapList) {
        return;
    }

    roadmapList.innerHTML = roadmap
        .map((item) => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>`)
        .join("");
}

function highlightPlannerFields(fields = []) {
    document.querySelectorAll("#plannerForm input, #plannerForm select").forEach((element) => {
        element.classList.remove("input-error");
    });

    fields.forEach((selector) => {
        document.querySelector(selector)?.classList.add("input-error");
    });
}

function validatePlannerForm() {
    const fieldMap = [
        { selector: "#plannerGoal", label: "Goal" },
        { selector: "#plannerWorkout", label: "Workout type" },
        { selector: "#plannerExperience", label: "Experience level" },
        { selector: "#plannerMealPreference", label: "Meal preference" },
        { selector: "#plannerAge", label: "Age" },
        { selector: "#plannerOccupation", label: "Occupation" },
        { selector: "#plannerCurrentWeight", label: "Current weight" },
        { selector: "#plannerHeight", label: "Height" },
        { selector: "#plannerSleepHours", label: "Sleep hours" },
        { selector: "#plannerDietaryPreference", label: "Dietary style" },
        { selector: "#plannerWakeTime", label: "Wake time" },
        { selector: "#plannerWorkoutTime", label: "Workout time" },
        { selector: "#plannerSleepTime", label: "Sleep time" },
        { selector: "#plannerSchedulePreference", label: "Workout window" },
        { selector: "#plannerMinutes", label: "Available minutes" },
        { selector: "#plannerDays", label: "Workout days" },
        { selector: "#plannerHydration", label: "Hydration goal" },
        { selector: "#plannerStressLevel", label: "Stress level" },
        { selector: "#plannerStepGoal", label: "Step goal" },
        { selector: "#plannerActivityLevel", label: "Activity level" },
        { selector: "#plannerFocusArea", label: "Main body focus" },
        { selector: "#plannerEquipment", label: "Equipment access" },
        { selector: "#plannerChallenge", label: "Main challenge" }
    ];

    const missing = fieldMap.filter((field) => !getInputValue(field.selector));
    highlightPlannerFields(missing.map((field) => field.selector));
    return missing;
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

function renderAssistantList(selector, items) {
    const element = document.querySelector(selector);
    if (!element) {
        return;
    }

    element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function getSelectedMood() {
    return document.querySelector("#moodGrid .selected")?.dataset.mood || "Strong";
}

function getReadinessSnapshot() {
    const energy = Number(document.querySelector("#energyRange")?.value || 7);
    const focus = Number(document.querySelector("#focusRange")?.value || 8);
    const recovery = Number(document.querySelector("#recoveryRange")?.value || 6);
    const readiness = Math.round(((energy + focus + recovery) / 30) * 100);

    return { energy, focus, recovery, readiness };
}

function buildAssistantGuidance(data) {
    const preferences = data.user.preferences || {};
    const profileInsights = data.profileInsights || {};
    const goal = String(data.user.goal || "Stay active").toLowerCase();
    const workoutType = String(preferences.preferredWorkout || "Strength").toLowerCase();
    const mealPreference = String(preferences.mealPreference || "Balanced").toLowerCase();
    const hydrationGoal = Number(preferences.hydrationGoal || 3);
    const minutes = Number(preferences.availableMinutes || 38);
    const days = Number(preferences.workoutDays || 4);
    const mood = getSelectedMood();
    const { readiness, energy, recovery } = getReadinessSnapshot();

      if (!data.profileComplete) {
          return {
              headline: `${data.user.name}, complete your profile to unlock accurate advice`,
              summary: "Right now the assistant will only trust your explicit inputs. Add body stats, schedule preference, activity level, equipment access, sleep target, and your main challenge first.",
              doItems: [
                  "Open Customize Plan and fill age, occupation, weight, height, and sleep target.",
                  "Choose your daily schedule window, activity level, and equipment access.",
                  "Select your main challenge and focus area so the plan matches reality."
              ],
              avoidItems: [
                  "Avoid relying on generic advice before your profile is complete.",
                  "Avoid changing your goal every day without updating the planner.",
                  "Avoid skipping the main challenge field because that drives the tone of your plan."
              ],
              recoveryItems: [
                  "Recovery guidance will unlock after you save the complete planner.",
                  "Sleep and hydration rules will appear from your actual inputs."
              ],
              nextMove: "Open Customize Plan now and complete the missing profile fields."
          };
      }

      const doItems = [];
      const avoidItems = [];
      const recoveryItems = [...(data.aiPlan?.recoveryItems || [])];
      let headline = `${data.user.name}, your ${workoutType} plan is looking stable today`;
    let summary = `Based on your ${data.user.goal.toLowerCase()} goal, ${minutes}-minute schedule, ${days} workout days, ${hydrationGoal}L hydration target, ${preferences.activityLevel} routine, and ${preferences.equipmentAccess.toLowerCase()} setup, here's the smartest move right now.`;
    let nextMove = `Start your ${workoutType} block at ${preferences.workoutTime || "18:00"} and keep your first 10 minutes controlled.`;

    if (goal.includes("lose")) {
        doItems.push("Keep today's workout pace steady and add a short walk after dinner.");
        doItems.push("Choose a high-protein meal so hunger stays controlled later.");
        avoidItems.push("Avoid skipping meals, because it usually leads to overeating at night.");
    } else if (goal.includes("muscle")) {
        doItems.push("Prioritize your main lifting sets while your energy is highest.");
        doItems.push("Add protein soon after training to support muscle recovery.");
        avoidItems.push("Avoid extra random cardio before the main strength block.");
    } else if (goal.includes("stamina")) {
        doItems.push("Keep breathing rhythm steady and use controlled intervals.");
        doItems.push("Hydrate earlier in the day so your evening session feels smoother.");
        avoidItems.push("Avoid opening too fast in the first round and burning out early.");
    } else {
        doItems.push("Keep the plan simple and focus on showing up on time today.");
        doItems.push("Use your schedule as the anchor instead of waiting for motivation.");
        avoidItems.push("Avoid overthinking the routine and changing everything at once.");
    }

    if (workoutType === "strength") {
        doItems.push("Warm up shoulders and hips before the first heavy set.");
        avoidItems.push("Avoid rushing rest periods between compound movements.");
    } else if (workoutType === "cardio") {
        doItems.push("Keep the middle section rhythmic instead of all-out from the start.");
        avoidItems.push("Avoid long idle breaks that kill momentum.");
    } else if (workoutType === "yoga") {
        doItems.push("Use slow breathing to settle your body before deeper stretches.");
        avoidItems.push("Avoid forcing range when recovery feels low.");
    } else if (workoutType === "hiit") {
        doItems.push("Explode on work rounds, then actually recover during rest windows.");
        avoidItems.push("Avoid stacking too many max-effort rounds when form slips.");
    }

    if (mealPreference.includes("protein")) {
        doItems.push("Keep one high-protein snack ready for the post-workout window.");
    } else if (mealPreference.includes("vegetarian")) {
        doItems.push("Plan protein from paneer, curd, tofu, or dal so recovery doesn't dip.");
    } else {
        doItems.push("Balance carbs and protein so energy stays smooth through the session.");
    }

    if (preferences.equipmentAccess === "Bodyweight Only") {
        doItems.push("Use tempo, pauses, and higher control because equipment is limited.");
        avoidItems.push("Avoid planning machine-based exercises your setup cannot support.");
    } else if (preferences.equipmentAccess === "Home Dumbbells") {
        doItems.push("Build today's session around dumbbell compounds and simple supersets.");
    } else if (preferences.equipmentAccess === "Full Gym") {
        doItems.push("Use your full gym access for the highest-value compound exercises first.");
    }

    if (hydrationGoal >= 4) {
        doItems.push(`Spread your ${hydrationGoal}L goal across the day instead of forcing it late.`);
    } else {
        avoidItems.push("Avoid finishing the day under-hydrated, especially if you train in the evening.");
    }

    if (preferences.primaryChallenge === "Busy schedule") {
        summary = "Your biggest blocker is time pressure, so every suggestion is being kept simple, short, and easy to start.";
        doItems.unshift("Protect your workout slot like a meeting and start even if the session becomes shorter.");
        avoidItems.unshift("Avoid waiting for a perfect free hour before starting.");
    } else if (preferences.primaryChallenge === "Low energy") {
        summary = "Your main blocker is low energy, so recovery and pacing matter more than forcing intensity.";
        doItems.unshift("Begin with the easiest entry point so energy builds during the session.");
        avoidItems.unshift("Avoid caffeine-only fixes instead of sleep and hydration support.");
    } else if (preferences.primaryChallenge === "Food cravings") {
        summary = "Your main blocker is food cravings, so the plan is leaning on structure and protein timing.";
        doItems.unshift("Keep one planned filling meal and one safe snack ready before cravings hit.");
        avoidItems.unshift("Avoid long gaps without food if cravings are your weak point.");
    } else if (preferences.primaryChallenge === "Poor recovery") {
        summary = "Your main blocker is recovery, so volume control and sleep quality are shaping the recommendations.";
        avoidItems.unshift("Avoid piling hard days back to back without enough sleep.");
    } else if (preferences.primaryChallenge === "Lack of consistency") {
        summary = "Your main blocker is consistency, so the assistant is favoring repeatable actions over flashy ones.";
        doItems.unshift("Hit the minimum version of the plan even on low-motivation days.");
    }

    if (readiness < 55) {
        headline = `${data.user.name}, today should be a lighter execution day`;
        summary = "Your readiness is a bit low, so the smart win is consistency, not intensity.";
        nextMove = "Do the warm-up, keep the session shorter, and prioritize recovery food plus sleep.";
        doItems.unshift("Cut intensity by one level and move with perfect form.");
        avoidItems.unshift("Avoid PR attempts or ego lifting today.");
    } else if (readiness < 75) {
        headline = `${data.user.name}, today is ideal for clean consistent work`;
        nextMove = `Start on time at ${preferences.workoutTime || "18:00"} and finish every planned set with control.`;
        avoidItems.unshift("Avoid turning a balanced day into a chaotic hard day.");
    } else {
        headline = `${data.user.name}, your body is ready for a stronger session`;
        nextMove = `Use your best energy early and push the main block with intent around ${preferences.workoutTime || "18:00"}.`;
        doItems.unshift("Push the main effort block while focus and energy are high.");
    }

    if (mood === "Tired") {
        summary = "You marked yourself tired, so the smart play is to protect form and lower friction.";
        doItems.unshift("Begin with mobility and let the session build slowly.");
        avoidItems.unshift("Avoid all-or-nothing thinking just because energy feels lower.");
    } else if (mood === "Focused") {
        doItems.unshift("Use your focus for high-quality reps and minimal distraction.");
    } else if (mood === "Calm") {
        doItems.unshift("Keep breathing controlled and make the routine feel smooth.");
    }

    if (energy <= 4 || recovery <= 4) {
        avoidItems.push("Avoid sleeping too late tonight because recovery already needs support.");
    }

    if (profileInsights.weightChange !== null && goal.includes("lose")) {
        doItems.push(`Stay patient with the ${Math.abs(profileInsights.weightChange)} kg cut and focus on repeatable days.`);
    }
    if (profileInsights.weightChange !== null && goal.includes("muscle") && profileInsights.weightChange > 0) {
        doItems.push(`Eat enough around training so the ${profileInsights.weightChange} kg gain target stays realistic.`);
    }

      return {
          headline,
          summary,
          doItems: doItems.slice(0, 5),
          avoidItems: avoidItems.slice(0, 5),
          recoveryItems: recoveryItems.slice(0, 4),
          nextMove
      };
}

function renderAssistantGuidance(data) {
    if (!data) {
        return;
    }

    const guidance = buildAssistantGuidance(data);
    updateText("#assistantHeadline", guidance.headline);
    updateText("#assistantSummary", guidance.summary);
    updateText("#assistantNextMove", guidance.nextMove);
    renderAssistantList("#assistantDoList", guidance.doItems);
    renderAssistantList("#assistantAvoidList", guidance.avoidItems);
    renderAssistantList("#assistantRecoveryList", guidance.recoveryItems || ["Recovery guidance will appear here."]);
}

function refreshAssistantGuidance() {
    renderAssistantGuidance(currentDashboardData);
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
    refreshAssistantGuidance();
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
            refreshAssistantGuidance();
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
            refreshAssistantGuidance();
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
        data.profileComplete
            ? `${data.user.name}, your plan is now being shaped from your real inputs. Keep ${String(data.user.preferences.preferredWorkout).toLowerCase()} intentional and respect your main challenge: ${String(data.user.preferences.primaryChallenge).toLowerCase()}.`
            : `${data.user.name}, fill in your real profile details first so the assistant can guide you from your actual routine.`
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
document.querySelector("#refreshAssistantButton")?.addEventListener("click", async () => {
    refreshAssistantGuidance();
    updateCoachMessage("AI assistant refreshed using your current plan, mood, hydration, and readiness.");
    showToast("AI advice refreshed.");
    await saveDashboardInteraction("assistant_refresh", "Refreshed AI assistant advice", {
        mood: getSelectedMood(),
        ...getReadinessSnapshot(),
        refreshedAt: new Date().toISOString()
    });
});
document.querySelector("#assistantScheduleButton")?.addEventListener("click", async () => {
    scrollToPanel("#schedule");
    updateCoachMessage("Use the schedule timing as your anchor. Start the next block right on time.");
    await saveDashboardInteraction("assistant_schedule_view", "Opened schedule from AI assistant", {
        clickedAt: new Date().toISOString()
    });
});
document.querySelector("#profileUpdateButton")?.addEventListener("click", () => {
    openModal("#plannerModal");
});
document.querySelector("#realityPlannerButton")?.addEventListener("click", () => {
    openModal("#plannerModal");
});
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
        const plannerMessage = document.querySelector("#plannerMessage");
        const missing = validatePlannerForm();

        if (missing.length) {
            setMessage(
                plannerMessage,
                `Fill these fields first: ${missing.map((item) => item.label).join(", ")}`,
                "error"
            );
            showToast("Complete all required planner fields first.");
            return;
        }

        try {
            setMessage(plannerMessage, "Saving your profile and rebuilding the dashboard...", "success");
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
                    age: Number(formData.get("age")),
                    occupation: formData.get("occupation"),
                    wakeTime: formData.get("wakeTime"),
                    workoutTime: formData.get("workoutTime"),
                    sleepTime: formData.get("sleepTime"),
                    dietaryPreference: formData.get("dietaryPreference"),
                    schedulePreference: formData.get("schedulePreference"),
                    availableMinutes: Number(formData.get("availableMinutes")),
                    workoutDays: Number(formData.get("workoutDays")),
                    hydrationGoal: Number(formData.get("hydrationGoal")),
                    stressLevel: formData.get("stressLevel"),
                    stepGoal: Number(formData.get("stepGoal")),
                    currentWeight: Number(formData.get("currentWeight")),
                    targetWeight: Number(formData.get("targetWeight")),
                    height: Number(formData.get("height")),
                    sleepHours: Number(formData.get("sleepHours")),
                    activityLevel: formData.get("activityLevel"),
                    focusArea: formData.get("focusArea"),
                    equipmentAccess: formData.get("equipmentAccess"),
                    primaryChallenge: formData.get("primaryChallenge")
                })
            });

            renderDashboard(data.dashboard);
            saveDashboardState({
                latestProfileSave: data.dashboard?.dashboardEvents?.[0]?.createdAt || new Date().toISOString()
            });
            setMessage(plannerMessage, "Profile saved. Dashboard updated from your inputs.", "success");
            closeModal("#plannerModal");
            showToast(data.message);
            updateCoachMessage("Your new inputs are saved. The dashboard and assistant are now reflecting your updated profile.");
            scrollToPanel("#profileSnapshotPanel");
            window.setTimeout(() => scrollToPanel("#assistantPanel"), 500);
        } catch (error) {
            setMessage(plannerMessage, error.message, "error");
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
