// =================================================================================================
// GLOBAL VARIABLES + DOM REFERENCES
// =================================================================================================

let total_second = 0;
let t = { hr: 0, min: 0, sec: 0 };

let input_container = document.querySelector('.overlaying-layer');
let startBtn = document.querySelector('.start-btn');

import {
    triggered_start_state,
    mode_changes_display,
    toggle_pomodoro_interface,
    next_break_time,
    play_sound,
    check_pomo_status,
    show_announcement,
    play_alarm_sound,
    display_session_formats
} from "./utility.js";



// =================================================================================================
// UI ANIMATION (example: Flip animation, digit updates)
// =================================================================================================

function card_flip(textInput, newValue) {
    if (textInput.value !== newValue) {
        textInput.classList.add("flip-animate");

        setTimeout(() => {
            textInput.value = newValue;
        }, 90);

        textInput.addEventListener("animationend", () => {
            textInput.classList.remove("flip-animate");
        }, { once: true });
    }
}

function split_total_second(total_second = 0) {
    let Hr = Math.floor(total_second / 3600);

    let Remainder = total_second % 3600;
    let Min = Math.floor(Remainder / 60);
    let Sec = Remainder % 60;

    let combine_string =
        Hr.toString().padStart(2, "0") +
        Min.toString().padStart(2, "0") +
        Sec.toString().padStart(2, "0");

    return combine_string.split("");
}

function format_hour(total_second, _12hr = false)
{
    let hrs = Math.floor(total_second / 3600) % 24;

    if (!_12hr) { return hrs.toString().padStart(2, "0"); }
           
    let hr12 = hrs % 12;
    if (hr12 === 0) hr12 = 12;

    return hr12.toString().padStart(2, "0");
}


function changeTime(amount, standard=false) {

    let get_digits = input_container.querySelectorAll('.digit');

    let hour = format_hour(amount, standard) || "0";

    let rest = split_total_second(amount);

    rest[0] = hour[0]
    rest[1] = hour[1]

    play_sound();

    get_digits.forEach((text, i) => {
        let update_text = rest[i] ?? "0";
        card_flip(text, update_text);
    });

}


// =================================================================================================
// INITIAL LOAD
// =================================================================================================

async function loadData() {
    let data = await chrome.storage.local.get({ Total_Second: 0, isActive: true });

    total_second = data.Total_Second;
    changeTime(total_second);

    startBtn.textContent = data.isActive ? "STOP" : "START";
}



// =================================================================================================
// TIMER INPUT + START/STOP TIMER
// =================================================================================================

function getTotalSeconds(hour, minute, second) {
    const hoursInSeconds = (parseInt(hour) || 0) * 3600;
    const minutesInSeconds = (parseInt(minute) || 0) * 60;
    const seconds = parseInt(second) || 0;

    return hoursInSeconds + minutesInSeconds + seconds;
}

async function stopTimer() {
    await chrome.storage.local.set({ isActive: false });
}

function is_valid_input(total_session, per_hr_session, minute_break)
{
   //if the timer is ongoing, return.
    if(total_session !== 0) return true;
    if(total_session < per_hr_session)
    {
        show_announcement(true, {
                title: "WARNING",
                description: "Your total hour of session must not be less than your hour work session."
            }
        )
        return false;
    } 
    else if (per_hr_session <= 0)
    {
        show_announcement(true, {
                title: "WARNING",
                description: "Please setup your work session, or ensure that your work session is not 0"
            }
        )
        return false;
    } 

    if (minute_break <= 0)
    {
        show_announcement(true, {
                title: "WARNING",
                description: "Please set up your break time, and the hour session you want to work, or ensure that your break time is not 0"
            }
        )
        return false;
    } 
    else if (minute_break > 3_550)
    {
        show_announcement(true, {
                title: "WARNING",
                description: "Your minutes break must not be over 59 minutes."
            }
        )
        return false;
    }
    
    return true;
}

//======================================================================================================================


async function initiate_pomo_start(total_second = 0) {
    let min_input = document.querySelector("#min-break-input");
    let hr_input = document.querySelector('#hr-session-input');

    const minutes_break = parseInt(min_input.value) || 0;
    const work_hour = parseInt(hr_input.value) || 0;

    const work_sec = work_hour * 3600;
    const break_sec = minutes_break * 60;

    if(!is_valid_input(total_second, work_sec, break_sec)) return;


    const next_break = total_second - work_sec;
    const break_end = next_break - break_sec;

    //save all elements at once, instead of having to save smaller component several time and causing slight delays.
    await chrome.storage.local.set({
        Total_Second: total_second,
        isActive: true,
        timestamp: {
            minutes_breaks: minutes_break,
            session_per_hour: work_hour,
            next_break: next_break,
            break_end: break_end,
            state: "working"
        }
    });

    next_break_time(
        work_hour * 3600,
        (work_hour !== 0 && minutes_break !== 0)
    );
    
    let msg = await display_session_formats(total_second, work_hour, minutes_break);
    show_announcement(true, {
        title: "SESSION SUMMARY",
        description: msg
    });
}


async function counts(hour, minute, second, toggle = false, mode = "") {
    if (!toggle) {
        await stopTimer();
        return;
    }

    total_second = getTotalSeconds(hour, minute, second);

   
    if (mode === "pomodoro") {

        await initiate_pomo_start(total_second);

    } else {
        await chrome.storage.local.set({
            Total_Second: total_second,
            isActive: toggle
        });

        
    
    }
}


// =================================================================================================
// MANUAL INCREMENT / DECREMENT FOR CLOCK/TIMER
// =================================================================================================

async function update_timer(mode_toggle) {
    (mode_toggle === true)
        ? total_second += 1
        : (total_second > 0)
            ? total_second -= 1
            : total_second = 0;

    await chrome.storage.local.set({ Total_Second: total_second });
    changeTime(total_second);
}

let hold = 0;

function _startincrement(mode) {
    clearInterval(hold);
    update_timer(mode);
    hold = setInterval(() => update_timer(mode), 100);
}

async function stop_increment() {
    clearInterval(hold);
}

async function clear_interval() {
    await chrome.storage.local.set({
        Total_Second: 0,
        isActive: false,
        Time_Mode: "default",
        timestamp: {
            minutes_breaks: 0, 
            session_per_hour: 0, 
            next_break: 0, 
            break_end: 0,
            state: "idle"
        }
    });

    mode_changes_display("default");
    changeTime();
}


// =================================================================================================
// CLOCK MODE (Live system time)
// =================================================================================================

function clock_time() {

    const current_time = new Date();
    let hours = current_time.getHours() * 3600;
    let mins = current_time.getMinutes() * 60;
    let secs = current_time.getSeconds();
    return hours + mins + secs;
}


let intervalId = null;
async function run_real_time() {
    const data = await chrome.storage.local.get(["Time_Mode", "isActive", "set_standard_time"]);

    const isStandard = data.set_standard_time || false;

    clearInterval(intervalId);
    intervalId = null;
    
    console.log(data.set_standard_time)
    if (data.Time_Mode === "clock" && data.isActive === true) {
        intervalId = setInterval(() => {
            
            changeTime(clock_time(), isStandard);
            
        }, 1000);

    }
}
// =================================================================================================
// POMODORO STORAGE AND MODIFICATION
// =================================================================================================

//this function is only reserved for saving timestamp objects.
async function saving_selective_sets(updates = {}) {
    let { timestamp } = await chrome.storage.local.get("timestamp");

    const updated_sets = {
        ...(timestamp || {}),
        ...updates
    };

    await chrome.storage.local.set({ timestamp: updated_sets });
}

async function take_snapshot_time(total_second) {
    let data = await chrome.storage.local.get({
        timestamp: {
            minutes_breaks: 0, 
            session_per_hour: 0, 
            next_break: 0, 
            break_end: 0,
            state: "idle"
        }
    });

    let next_br_ = total_second - (data.timestamp.session_per_hour * 3600);
    let end_br_ = next_br_ - (data.timestamp.minutes_breaks * 60);
    await saving_selective_sets({
        next_break: next_br_,
        break_end: end_br_,
        state: "working"
    });
}


let IntervalID = null;
async function set_alarm(toggle = false, theend= false)
{
    
    clearInterval(IntervalID);

    if(toggle == true)
    {
        play_alarm_sound();

        IntervalID = setInterval(async () => {
        play_alarm_sound()
        }, 5000)

        await chrome.storage.local.set({set_urgency: true})

        if(theend === true)
        {
            show_announcement(true, {
                title: "TIME IS UP!",
                description: "You reach to the end!"
                })
            
        } else {
            show_announcement(true, {
                title: "CHECKPOINT",
                description: "Well done, you work hard! Click the button below to begin your break duration."
                })
        
        }

        
        let proceed = document.querySelector(".proceed-btn")
        proceed.addEventListener("click", () => {
        set_alarm(false);
        })

        return;
    }

   
    show_announcement(false);
}










// =================================================================================================





// =================================================================================================
// POMODORO CYCLE LOGIC
// =================================================================================================
async function next_cycle(data) {

    if (!data.isActive) return; 
    if(data.timestamp.state == "idle") return;
    //total session in seconds
    let total_session = data.Total_Second || 0;
    let pomodoro = data.timestamp;

    //stop progressing if any key values in pomodoro or total session is missing.
    if(!pomodoro || !total_session) return;

    //work in terms of work session per hour
    const work_in_seconds = (pomodoro.session_per_hour || 0) * 3600;
    

    //how long the user take rest in minutes
    const break_in_seconds = (pomodoro.minutes_breaks || 0) * 60;

    let current_state = pomodoro.state;

  
  
    if(current_state == "working")
    {   
        // If the user is in working state. Check whethers the countdown timer has reach designated break time.
        if(total_session <= pomodoro.next_break)
        {
            //change the current state to resting.
            pomodoro.state = "resting";

            //compute the next break where the this break interval finishes.
            //Example: If next_break was 14,400s (4 hours remaining), the break ends at 12,600s (3.5 hours remaining)
            pomodoro.break_end = pomodoro.next_break - break_in_seconds;
            if(pomodoro.break_end <= 0) pomodoro.break_end = 0;

            await saving_selective_sets({
                state: "resting",
                break_end: pomodoro.break_end
            });

            set_alarm(true)
            return;
        }
    }

    else if(current_state == "resting")
    {
        //If the user is in resting state, check if the clock has counted down to or past the end of the break time.
        if (total_session <= pomodoro.break_end) 
        {

            
            

            //Update the current with the next checkpoint of the next break by another full work hour including break gaps.
            let subsequent_next_break = pomodoro.break_end - work_in_seconds;
            if(subsequent_next_break <= 0) subsequent_next_break = 0;

           

            await saving_selective_sets({
                state: "working",
                next_break: subsequent_next_break
            });
  
            set_alarm(false)
            return;
        }
    }
}



// =================================================================================================
// CLOCK RENDER LOOP (Runs every second)
// =================================================================================================

let interval_ID = null;

async function getClockData() {
    return await chrome.storage.local.get({
        Time_Mode: "default",
        isActive: false,
        Total_Second: 0,
        timestamp: {
            rest_min: 0,
            work_session: 0,
            state: "idle"
        }
    });
}



async function handlePomodoroCycle(data) {
    if (data.Time_Mode !== "pomodoro") return;
    if (data.timestamp.state == "idle") return;
    await next_cycle(data);
}

function updateClockUI(isPomodoro) {
    toggle_pomodoro_interface(false, "input");
    toggle_pomodoro_interface(isPomodoro, "display");
}

async function computeClockYield(data) {
 
    if (data.Time_Mode === "pomodoro" || data.Time_Mode === "default") {

        check_pomo_status(data);
           
           
        //when the clock reaches 0, reset.
        if(data.Total_Second <= 0 && data.isActive == true) set_alarm(true, true)
        
        return parseInt(data.Total_Second) || 0;
    }

    return 0;
}





async function render_clock() {


    //event reserved for pomodoros and countdown.
    chrome.storage.onChanged.addListener(async (clock, area) => {
        if (area !== "local") return;

        // Only react when Total_Second changes
        if(clock.Total_Second) {
            const data = await getClockData();
        if (!data.isActive) return;

        const isPomodoro = data.Time_Mode === "pomodoro";

        await handlePomodoroCycle(data);
        updateClockUI(isPomodoro);
        
        const yieldResult = await computeClockYield(data);
        changeTime(yieldResult)
    }

    });
    //event reserved for real time clock changes.
    chrome.storage.onChanged.addListener(await run_real_time);
}


// =================================================================================================
// SWITCHING MODE (default ↔ clock ↔ pomodoro)
// =================================================================================================

let list_mode = ["default", "clock", "pomodoro"];

async function change_mode(direction) {
    let data = await chrome.storage.local.get({ Time_Mode: "default" });

    //return -1 if there is no element in Time_Mode that matches list_mode
    //otherwise, return the current index based on the element that matches.
    let current_index = list_mode.indexOf(data.Time_Mode);

    clear_interval();

    if (direction == "left")
        current_index = (current_index - 1 + list_mode.length) % list_mode.length;

    if (direction == "right")
        current_index = (current_index + 1) % list_mode.length;

    await chrome.storage.local.set({
        Time_Mode: list_mode[current_index],
        Total_Second: 0
    });

    mode_changes_display(list_mode[current_index]);
}


// =================================================================================================



export 
{ 
    counts, 
    changeTime, 
    _startincrement, 
    stop_increment, 
    loadData, 
    clear_interval, 
    change_mode, 
    run_real_time,
    split_total_second, 
    take_snapshot_time, 
    next_cycle, 
    render_clock 
};
