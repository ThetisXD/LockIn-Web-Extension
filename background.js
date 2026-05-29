

let intervalID = null

/**@type {typeof import('chrome')} */


/**
     * Total_second: meant to stored the full value of Total_Second for time computation
     * isActive: check if the current time is running or not.
     * 
     * Time_Mode: check current mode of the timer and allow system to act accordingly.
     * isTextDisplay: (triggered through setting switch toggle)
     * 
     * TabList: a list of every avaliable URL that is blacklisted.
     * Rest_Min: estimate minutes that user has set to rest.
     * 
     * p_info: reserved for help tab.
     */
const default_data = {
    Total_Second: 0, 
    isActive: false, 
    Time_Mode: "default",

    set_urgency: false,
    set_volume: true,
    set_tooltip: false,
    set_standard_time: false,

    TabList: [],
    is_monitor: false,
    timestamp: {
        minutes_breaks: 0, 
        session_per_hour: 0, 
        next_break: 0, 
        break_end: 0,
        state: "idle"
    },

    
}


chrome.runtime.onInstalled.addListener(async (info) => {

    //upon starting the extension, check if the user current has key values, if not create one that is missing.
    try {
        // 1. Clean MV3 Promise Lookup (No callbacks!)
        const current_data = await chrome.storage.local.get(null);
        
        // 2. Merge user variables safely with your default fallbacks
        const merged_data = { ...default_data, ...current_data };

       
        await chrome.storage.local.set(merged_data);
        
    } catch (error) {
        console.error("An error has occured during bootup:", error);
    }
       
})


function clean_tab_URL(tab) {
    // Skip tabs with no URL or internal Chrome pages
    
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("about:")) return;

    // Convert raw URL into a URL object for easy parsing
    let full_url = new URL(tab.url);
   
    // Strip "www." from the hostname or spits the url path to several component for duplicate check. 
    return full_url.hostname.replace(/^www\./i, "");
}




async function monitor_tabs() {
    let data = await chrome.storage.local.get(["TabList", "is_monitor"]);
    if(data.is_monitor == false) return;

    let blacklist = data.TabList;
    // Query all tabs once
    let tabs = await chrome.tabs.query({});

    // Identify the active tab (never close this one)
    let current_tab_id = tabs.find(t => t.active && t.highlighted)?.id;
    
    for (let tab of tabs) {
        
        // Skip active tab
        if (tab.id === current_tab_id) continue;

        // Skip internal Chrome pages
        if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("about:") || tab.url.includes("ntp.msn.com")) continue;

        let domain = clean_tab_URL(tab);
        if (!domain) continue;

        // Check if domain is in blacklist
        let isBlocked = blacklist.some(item => item.name === domain);

        if (isBlocked) {
            await chrome.tabs.remove(tab.id);
        }
    }
}




function clock_runtime()
{
    
    clearInterval(intervalID)

    intervalID = setInterval(async() => {

        let data = await chrome.storage.local.get(["Total_Second", "isActive", "Time_Mode", "set_urgency"]);

        let total_sec = parseInt(data.Total_Second) || 0;
        let current_mode = data.Time_Mode || "default";

        //temporary pause the clock at urgency until the announcement is dismiss.
        if(data.set_urgency == true) return;
        
        //if the user pressed stop or when the timer has reach to the end, pause the interval.
        if(data.isActive === false)
        {
            clearInterval(intervalID)
            return;
        }
        /**
         * Since clock is being computed in sidepanel.
         * check if the current mode is set to clock, do nothing 
        */

        if(current_mode == "clock") {
            monitor_tabs();
            return;
        }
    
        if (current_mode == "default" || current_mode == "pomodoro")
        {
            if(total_sec <= 0 || data.isActive == false)
            {   
                clearInterval(intervalID)
                await chrome.storage.local.set({isActive: false})
                return;
            }
            total_sec -= 1;
            await chrome.storage.local.set({Total_Second: total_sec})
        } 
        monitor_tabs()
    }, 1000)
    
}



chrome.storage.onChanged.addListener((clock, storage_area) => {
    if(storage_area !== "local") return;
    if(clock.isActive) {

        if (clock.isActive.newValue === true) {
            clock_runtime();
            
        } else if (clock.isActive.newValue === false) {
            clearInterval(intervalID);
        }
    }
})

