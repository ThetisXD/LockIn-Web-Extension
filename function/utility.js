let disabled_btn = document.querySelectorAll('.common-btn, .step-up-btn, .step-down-btn, .mode-display-trigger')
let animated_btn_pressed = document.querySelector('.btn-depth')
let display_txt_mode = document.querySelector('.mode-display-trigger')
import { split_total_second } from './clock.js';
import { get_all_tab, clean_tab_URL } from './setting.js';

async function triggered_start_state(toggle)
{
    let data = await chrome.storage.local.get(["isActive"]);

    if (toggle == true || data.isActive == true) 
    {
        disabled_btn.forEach((btn) => {
            btn.classList.add('btn-pressed');
            btn.disabled = true;
        })

    }

    if(toggle == false || data.isActive == false)
    {
        disabled_btn.forEach((btn) => {
            btn.classList.remove('btn-pressed');
            btn.disabled = false;
        })
    }
}

function mode_changes_display(label)
{
    
    display_txt_mode.textContent = label;
}


function toggle_pomodoro_interface(toggle, check = '')
{
    let pomodoro_display = document.querySelector('#pomodoro-display-mode'); 
    let pomodoro_input = document.querySelector('#pomodoro-input-mode');
       
    // Check status is 'display' --> enable/disable pomodoro_display
    if (check == 'display')
    {
        if (toggle) {
            pomodoro_display.classList.add("visible");
        } else {
            pomodoro_display.classList.remove("visible");  
        }
    } 
    // Check status is 'input' --> enable/disable pomodoro_input
    // true --> when user pressed pomo btn, false --> when user presses start
    else if (check == 'input')
    {
        if (toggle) {
            pomodoro_input.classList.add("visible");
        } else {
            pomodoro_input.classList.remove("visible");  
        }
    }
}



//take total_second derived user current time. 
function next_break_time(remaining_second = 0, toggle = false)
{
    let next_break_display = document.querySelector('#hub-goal-timestamp');

    if(!toggle) return;

    let current_time = new Date();
    
    //prevent time from lagging behind.
    current_time.setMilliseconds(0);
    current_time.setSeconds(0);

    let forward_time = current_time.getSeconds() + remaining_second;
    current_time.setSeconds(forward_time);

    next_break_display.textContent = current_time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })
}


// clock.js / popup.js

async function check_pomo_status(data) {
    if (!data.timestamp) return;

    const statusLabel = document.querySelector("#status-msg");
    const innerTimer  = document.querySelector("#hub-countdown-time");

    if (!statusLabel || !innerTimer) return;

    const { state, next_break, minutes_breaks, session_per_hour, break_end } = data.timestamp;

    let display = 0;

    if (state === "resting") {
        statusLabel.textContent = "Break duration";
        innerTimer.style.color = "var(--success-green)";
        display = data.Total_Second - break_end;


    } else {
        statusLabel.textContent = "next break at";
        innerTimer.style.color = "var(--accent-blue)";
        display = next_break;
    }

    const digits = split_total_second(display);


    next_break_time(
        session_per_hour * 3600,
        (session_per_hour !== 0 && minutes_breaks !== 0)
    );

    innerTimer.textContent = [
        digits.slice(0, 2).join(''),
        digits.slice(2, 4).join(''),
        digits.slice(4, 6).join('')
    ].join(':');
}


//==============================================================================================================================
/**SOUND TOGGLE AND PROPERTY */


async function check_sound_toggle()
{
    let data = await chrome.storage.local.get(["set_volume"]);
    return data.set_volume;
}

async function play_sound()
{
    const flip = new Audio(chrome.runtime.getURL("assets/sounds/flip.mp3"));
    if(!(await check_sound_toggle())) return;
    flip.volume = 0.22;
    flip.currentTime = 0;
    flip.play()
}


async function play_alarm_sound()
{
    const alarm = new Audio(chrome.runtime.getURL("assets/sounds/alarm.mp3"));
    if(!(await check_sound_toggle())) return;
    alarm.volume = 0.22;
    alarm.currentTime = 0;
    alarm.play()
}

//==============================================================================================================================
/**TOOLTIP TOGGLE AND PROPERTY */

async function check_tooltip_toggle()
{
    let data = await chrome.storage.local.get(["set_tooltip"]);
    return data.set_tooltip;
}

async function set_tooltip_bubble()
{
    
    const tooltip = document.querySelector(".tooltip-bubble");
    if(!await check_tooltip_toggle()) {
        tooltip.style.display = "none";
    } else 
    {
        tooltip.style.display = "block";
    }
}

//==============================================================================================================================
/**transition state */
async function sync_any_toggles()
{
    let toggle_switchs = document.querySelectorAll(".toggle-switch");
    const stored_toggle_values = await chrome.storage.local.get(null);
    
    toggle_switchs.forEach(toggle => {
        const target = toggle.dataset.target;
    
        if(target in stored_toggle_values)
        {
            toggle.checked = stored_toggle_values[target] 
        } else {
            toggle.checked = false;
        }

    })
  
}




function move_to_setting(toggle) {
    let setting_tab = document.querySelector('#settings-view');
    
    if (toggle) {
        setting_tab.classList.remove("hidden");
    } else {
        setting_tab.classList.add("hidden");
    }
}


function change_title_color(title, event)
{
    
    if(event == "WARNING") {
            title.style.color = "var(--btn-warning)";
    } else {
            title.style.color = "var(--success-green)";
    }
}

async function show_announcement(toggle = false, descriptor = { title: "", description: ""}) {
    let data = await chrome.storage.local.get(["set_urgency"]);
    const paragraph = document.querySelector("#desc_text");
    const title = document.querySelector(".warning");
    const announcement = document.querySelector(".announcement");
    if (toggle) {
        // show + update text + update text color

        title.innerText = descriptor.title;
        paragraph.innerText = descriptor.description;
        change_title_color(title, descriptor.title)

        announcement.classList.remove("hidden");
        
    } else {
        // simply hide the UI and reset urgency for clock modification.
        if(data.set_urgency == true) await chrome.storage.local.set({set_urgency: false});
        announcement.classList.add("hidden");
    }

    
}


// =================================================================================================
// POMODORO SCHEDULE GENERATION PLATFORM (DECOUPLED UTILITIES)
// =================================================================================================


function _format_time(dateObj) {
    return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

async function display_session_formats(totalSeconds, workHours, breakMinutes, onChunk) {
    let remaining = totalSeconds;
    const workSec = workHours * 3600;
    const breakSec = breakMinutes * 60;

    let clock = new Date();
    clock.setMilliseconds(0);
    clock.setSeconds(0);

    const startStr = _format_time(clock);
    const endStr = _format_time(new Date(clock.getTime() + totalSeconds * 1000));

    const lines = [];
    lines.push(`Total Duration: ${Math.floor(totalSeconds / 3600)} hour(s)`);
    lines.push(`Work Interval: ${workHours} hour(s)`);
    lines.push(`Break Interval: ${breakMinutes} minutes`);
    lines.push(`Timeframe: ${startStr} → ${endStr}`);
    lines.push("");


    return lines.join("\n");
}







  //detect if the current tab is open to prevent spams.
  //for flexibility, add range for finer control. 
const transfer_user_to_site = async function(url = "ex: https://www...", range=[0, 10]) {

    let link = url;
    let path_type = link.substring(range[0], range[1])
    console.log(link)
    console.log(path_type)

    const tabs = await get_all_tab()
    //iterate all tabs, check if the tab url is in the storage.
    for(const tab of tabs)
    {
        const cleaned_url = clean_tab_URL(tab, "control");
        if(cleaned_url[1] == path_type)
        {
            show_announcement(true, {title: "WARNING", description: "Please close the feedback tab before opening another!"})
            return;
        } 
    }
    window.open(link)
}

    


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