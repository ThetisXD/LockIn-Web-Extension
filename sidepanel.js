// =================================================================================================
// DOM REFERENCES
// =================================================================================================

let body = document.body;
let startBtn = body.querySelector(".start-btn");
let get_digit_inputs = body.querySelectorAll(".digit");
let timerContainer = body.querySelector('.timer-container');
let input_container = body.querySelector('.overlaying-layer');
let tabs_container = document.querySelector(".tab-scroll-box");


// =================================================================================================
// IMPORTS
// =================================================================================================

import {
    counts,
    _startincrement,
    stop_increment,
    changeTime,
    loadData,
    clear_interval,
    change_mode,
    take_snapshot_time,
    render_clock
} from "./function/clock.js";

import {
    triggered_start_state,
    toggle_pomodoro_interface,
    move_to_setting,
    show_announcement,
    sync_any_toggles,
    transfer_user_to_site,
    set_tooltip_bubble
} from "./function/utility.js";

import {
    run_browsers_scan,
    save_change,
    listen_tabs,
    clear_list,
    toggle_monitoring,
    toggle_volume,
    toggle_tooltip,
} from "./function/setting.js";


// =================================================================================================
// CLICK EVENTS (Main UI interactions)
// =================================================================================================

body.addEventListener("click", async (event) => {

    // START / STOP TIMER
    if (event.target.classList.contains("start-btn")) {

        const data = await chrome.storage.local.get({ Time_Mode: "default", isActive: false });
        const toggle = !data.isActive;

        await chrome.storage.local.set({ isActive: toggle });

        startBtn.textContent = toggle ? "STOP" : "START";
        await triggered_start_state(toggle);

        if (data.Time_Mode === "default" || data.Time_Mode === "pomodoro") {

            const hr_input = input_container.querySelectorAll('.hr');
            const min_input = input_container.querySelectorAll('.min');
            const sec_input = input_container.querySelectorAll('.sec');

            const hr = (hr_input[0]?.value || "0") + (hr_input[1]?.value || "0");
            const min = (min_input[0]?.value || "0") + (min_input[1]?.value || "0");
            const sec = (sec_input[0]?.value || "0") + (sec_input[1]?.value || "0");

            const compile_string = hr + min + sec;

            if (compile_string == 0) {

                startBtn.textContent = "START";
                triggered_start_state(false);
                return show_announcement(true, {
                    title: "WARNING",
                    description: `Please input a integer > 0 in either Hour, Minute, Second or combination of the three.`
                });
            }

            await counts(
                compile_string.substring(0, 2),
                compile_string.substring(2, 4),
                compile_string.substring(4, 6),
                toggle,
                data.Time_Mode
            );
        }
    }

    // CLEAR TIMER
    if (event.target.classList.contains("clear-timer-btn")) clear_interval();

    // POMODORO INPUT PANEL
    if (event.target.id === "mode-center-action") {
        const data = await chrome.storage.local.get({ Time_Mode: "default" });
        if (data.Time_Mode === "pomodoro") toggle_pomodoro_interface(true, 'input');
        if (data.Time_Mode != "pomodoro") toggle_pomodoro_interface(false, 'input');
    }

    // MODE SWITCHING
    if (event.target.id === "mode-left-arrow") change_mode("left");
    if (event.target.id === "mode-right-arrow") change_mode("right");

    // SETTINGS PANEL
    if (event.target.classList.contains("Setting-btn")) move_to_setting(true);
    if (event.target.classList.contains("Return-btn")) move_to_setting(false);

    // TAB SCANNING
    if (event.target.id == "reload-tabs") run_browsers_scan();

    // ANNOUNCEMENT DISMISS
    if (event.target.classList.contains("dismiss-btn")) show_announcement(false);

    // RESET TAB LIST
    if (event.target.classList.contains("system-reset-btn")) clear_list();

    // SAVE TAB LIST
    if (event.target.classList.contains("save-btn")) save_change();

    //FEEDBACK
    if(event.target.classList.contains("Feedback-btn")) transfer_user_to_site("https://forms.gle/BjXEmaFTx1vdYotg8", [8, 13]);
    

});





// =================================================================================================
// HOLD EVENTS (Press-and-hold increment/decrement)
// =================================================================================================

body.addEventListener("mousedown", async (event) => {
    if (event.target.classList.contains("step-up-btn")) _startincrement(true);
    if (event.target.classList.contains("step-down-btn")) _startincrement(false);

});

body.addEventListener("mouseup", async (event) => {
    if (
        event.target.classList.contains("step-up-btn") ||
        event.target.classList.contains("step-down-btn")
    ) stop_increment();

    
});

const tooltip = document.querySelector('.tooltip-bubble');

document.addEventListener("mouseover", (event) => {
    // Check if the element or its parent has the class 'tip'
    const target = event.target.closest(".tip");
    if (!target) return;

    tooltip.style.opacity = "1";
    // Safely access the dataset
    tooltip.textContent = target.getAttribute("info-tip") || "";

    
    tooltip.style.left = (event.pageX - 30) + "px"; // Offset the position slightly
    tooltip.style.top = (event.pageY - 5) + "px";

    
});

document.addEventListener("mouseout", (event) => {
    const target = event.target.closest(".tip");
    if (!target) return;

    tooltip.style.opacity = "0";
});



// =================================================================================================
// INPUT SANITIZATION (Only allow digits)
// =================================================================================================

body.addEventListener("input", async (event) => {

    if (event.target.classList.contains("digit")) {
        let inputs = event.target.value;

        // Accept only integers
        let stripped_inputs = inputs.replace(/[^0-9]/g, "");
        if (stripped_inputs == "") event.target.value = 0;
    }
});

// =================================================================================================
// SWITCH ENABLING OR DISABLING FEATURE
// =================================================================================================

body.addEventListener("change", async (event) => {
    
    // TOGGLE TAB MONITORING, VOLUME, TOOLTIP
    if (event.target.classList.contains("toggle-for-monitoring")) toggle_monitoring()
    if (event.target.classList.contains("toggle-for-volume")) toggle_volume()
    if (event.target.classList.contains("toggle-for-tooltip")) toggle_tooltip()
})
// =================================================================================================
// INITIAL DIGIT NORMALIZATION
// ===================WARNING==============================================================================

body.addEventListener('DOMContentLoaded', (event) => {
    get_digit_inputs.forEach(async (input) => {
        if (!input.value || isNaN(parseInt(input.value))) input.value = 0;
    });
});


// =================================================================================================
// INITIAL LOAD
// =================================================================================================








loadData();
render_clock();
sync_any_toggles();
await set_tooltip_bubble();
await triggered_start_state();