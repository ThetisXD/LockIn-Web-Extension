let disabled_btn = document.querySelectorAll('.common-btn, .step-up-btn, .step-down-btn, .mode-display-trigger')
let animated_btn_pressed = document.querySelector('.btn-depth')
let display_txt_mode = document.querySelector('.mode-display-trigger')
import { split_total_second } from './clock.js';
import { get_all_tab, clean_tab_URL } from './setting.js';

/**
 * ===================================================================================
 * UI & STATE MANAGEMENT
 * ===================================================================================
 */
export async function triggered_start_state(toggle) {
    let data = await chrome.storage.local.get(["isActive"]);
    const shouldDisable = toggle === true || data.isActive === true;

    disabled_btn.forEach((btn) => {
        btn.classList.toggle('btn-pressed', shouldDisable);
        btn.disabled = shouldDisable;
    });
}

export function toggle_pomodoro_interface(toggle, check = '') {
    const pomodoro_display = document.querySelector('#pomodoro-display-mode');
    const pomodoro_input = document.querySelector('#pomodoro-input-mode');

    if (check === 'display') pomodoro_display.classList.toggle("visible", toggle);
    if (check === 'input') pomodoro_input.classList.toggle("visible", toggle);
}

export function move_to_setting(toggle) {
    document.querySelector('#settings-view').classList.toggle("hidden", !toggle);
}

/**
 * ===================================================================================
 * DISPLAY & FORMATTING
 * ===================================================================================
 */
export function mode_changes_display(label) {
    display_txt_mode.textContent = label;
}

export function next_break_time(remaining_second = 0, toggle = false) {
    if (!toggle) return;
    const next_break_display = document.querySelector('#hub-goal-timestamp');
    let current_time = new Date();
    current_time.setMilliseconds(0);
    current_time.setSeconds(current_time.getSeconds() + remaining_second);

    next_break_display.textContent = current_time.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

/**
 * ===================================================================================
 * MEDIA TOGGLE & NOTIFICATIONS
 * ===================================================================================
 */

//toggles events
async function check_sound_toggle() {
    const { set_volume } = await chrome.storage.local.get(["set_volume"]);
    return set_volume;
}

export async function play_sound() {
    if (!(await check_sound_toggle())) return;
    const flip = new Audio(chrome.runtime.getURL("assets/sounds/flip.mp3"));
    flip.volume = 0.22;
    flip.play();
}

export async function play_alarm_sound() {
    if (!(await check_sound_toggle())) return;
    const alarm = new Audio(chrome.runtime.getURL("assets/sounds/alarm.mp3"));
    alarm.volume = 0.22;
    alarm.play();
}

export async function set_tooltip_bubble() {
    const { set_tooltip } = await chrome.storage.local.get(["set_tooltip"]);
    const tooltip = document.querySelector(".tooltip-bubble");
    tooltip.style.display = set_tooltip ? "block" : "none";
}



// =================================================================================================

//notification announcement
export async function show_announcement(toggle = false, descriptor = { title: "", description: "" }) {
    const announcement = document.querySelector(".announcement");
    if (toggle) {
        document.querySelector(".warning").innerText = descriptor.title;
        document.querySelector("#desc_text").innerText = descriptor.description;
        document.querySelector(".warning").style.color = descriptor.title === "WARNING" ? "var(--btn-warning)" : "var(--success-green)";
        announcement.classList.remove("hidden");
    } else {
        await chrome.storage.local.set({ set_urgency: false });
        announcement.classList.add("hidden");
    }
}

/**
 * ===================================================================================
 * CORE LOGIC
 * ===================================================================================
 */
export async function sync_any_toggles() {
    const stored = await chrome.storage.local.get(null);
    document.querySelectorAll(".toggle-switch").forEach(toggle => {
        toggle.checked = !!stored[toggle.dataset.target];
    });
}

export async function check_pomo_status(data) {
    if (!data.timestamp) return;
    const statusLabel = document.querySelector("#status-msg");
    const innerTimer = document.querySelector("#hub-countdown-time");
    
    const { state, next_break, minutes_breaks, session_per_hour, break_end } = data.timestamp;
    const display = state === "resting" ? (data.Total_Second - break_end) : next_break;

    statusLabel.textContent = state === "resting" ? "Break duration" : "next break at";
    innerTimer.style.color = state === "resting" ? "var(--success-green)" : "var(--accent-blue)";

    const digits = split_total_second(display);
    innerTimer.textContent = `${digits.slice(0, 2).join('')}:${digits.slice(2, 4).join('')}:${digits.slice(4, 6).join('')}`;

    next_break_time(session_per_hour * 3600, (session_per_hour !== 0 && minutes_breaks !== 0));
}

export async function transfer_user_to_site(url = "", range = [0, 10]) {
    const path_type = url.substring(range[0], range[1]);
    const tabs = await get_all_tab();
    
    for (const tab of tabs) {
        if (clean_tab_URL(tab, "control")[1] === path_type) {
            show_announcement(true, { title: "WARNING", description: "Please close the feedback tab before opening another!" });
            return;
        }
    }
    window.open(url);
}


/**
 * ===================================================================================
 * ANNOUNCEMENT DISPLAY SCHEDULES EVENT (POMODORO)
 * ===================================================================================
 */

export function mode_changes_display(label) {
    display_txt_mode.textContent = label;
}

function _format_time(dateObj) {
    return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

export function next_break_time(remaining_second = 0, toggle = false) {
    if (!toggle) return;
    const next_break_display = document.querySelector('#hub-goal-timestamp');
    let current_time = new Date();
    current_time.setMilliseconds(0);
    current_time.setSeconds(current_time.getSeconds() + remaining_second);

    next_break_display.textContent = _format_time(current_time);
}


export async function display_session_formats(total_Seconds, work_Hours, break_Minutes) {
    let clock = new Date();
    clock.setMilliseconds(0);
    clock.setSeconds(0);

    const start_time = _format_time(clock);
    const end_time = _format_time(new Date(clock.getTime() + total_Seconds * 1000));
    return [
        `Total Duration: ${Math.floor(totalSeconds / 3600)} hour(s)`,
        `Work Interval: ${work_Hours} hour(s)`,
        `Break Interval: ${break_Minutes} minutes`,
        `Timeframe: ${start_time} → ${end_time}`,
        ""
    ].join("\n");
}
    
// =================================================================================================

export 
{ 
    triggered_start_state, 
    mode_changes_display, 
    toggle_pomodoro_interface,
    next_break_time, play_sound, 
    check_pomo_status, 
    move_to_setting, 
    show_announcement, 
    sync_any_toggles, 
    play_alarm_sound, 
    set_tooltip_bubble,
    display_session_formats,
    transfer_user_to_site
}