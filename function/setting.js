import { show_announcement, set_tooltip_bubble } from "./utility.js";

const tabs_container = document.querySelector(".tab-scroll-box");



// =================================================================================================
// URL or URL + FAVICON cleaner.
// =================================================================================================

function clean_tab_URL(tab, purpose = "blacklist") {
    // Skip tabs with no URL or internal Chrome pages
    
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("about:")) return;

    // Convert raw URL into a URL object for easy parsing
    let full_url = new URL(tab.url);
   
    // Strip "www." from the hostname or spits the url path to several component for duplicate check. 
    return (purpose == "blacklist") ? full_url.hostname.replace(/^www\./i, "") : full_url.pathname.split("/");
}




// =================================================================================================
// DUPLICATION CHECK (help ensure that only one entry can exist at a time)
// =================================================================================================

let sets = new Set();

function check_duplication(tab) {
    // tab[0] = domain name
    let domain_name = tab[0];

    // If domain not seen before → add to set and allow
    if (!sets.has(domain_name)) {
        sets.add(domain_name);
        return false; // not duplicate
    }

    return true; // duplicate
}


// =================================================================================================
// STORAGE HELPERS
// =================================================================================================

async function append_tab(lists) {
    // Save the cleaned tab list into Chrome storage
    await chrome.storage.local.set({ TabList: lists });
}


// =================================================================================================
// TAB SCANNING (Reads all open tabs and extracts domain + favicon)
// =================================================================================================

function return_tab_favicorn_URL(tab) {
    let new_url = clean_tab_URL(tab);

    // Some tabs may not have a favicon — return empty string in that case
    let favicon = tab.favIconUrl ? tab.favIconUrl.toString() : "";

    // Return [domain, favicon] pair
    return [new_url, favicon];
}



const get_all_tab = async function() {
    return await chrome.tabs.query({})
}

async function listen_tabs() {
    try {
        let lists = [];

        // Reset duplication tracker for each scan
        sets = new Set();

        // Query all open tabs in the browser
        const tabs = await get_all_tab();

        for (let tab of tabs) {
            let get_url = return_tab_favicorn_URL(tab);

            // Skip duplicates and invalid URLs
            if (!check_duplication(get_url)) {
                if (get_url) {
                    lists.push({
                        name: get_url[0],
                        favicon: get_url[1]
                    });
                }
            }
        }

        // Return the freshly temporary list.
        return lists;

    } catch (err) {
        console.error("An error has occured while creating temporary list! ", error)
    }
}


// =================================================================================================
// UI GENERATION (Builds the visual list of tabs)
// =================================================================================================

function generate_tab_box(lists_tabs = []) {
    // Clear previous UI
    tabs_container.innerHTML = "";

    for (let i = 0; i < lists_tabs.length; i++) {
        const tab_infos = lists_tabs[i];

        let row_item = document.createElement("div");

        /**
         * tab-item-box → defines row layout
         * target-blocked → used for filtering/removal logic
         */
        row_item.className = "tab-item-box target-blocked";

        // Attach a distinct domain name for later filtering purposes.
        row_item.setAttribute("data-domain", tab_infos.name);

        //In case if a tab do not have a favicon, (ex: a new tab), replace the missing favicon with default png.
        if (!tab_infos.favicon) tab_infos.favicon = "assets/default.ico";
    


        // Build one row for the tab list:
        // - favicon + domain text
        // - whitelist button
        row_item.innerHTML = `
            <div class="tab-meta">
                <img class="site-favicon" src="${tab_infos.favicon}">
                <span class="domain-brand">${tab_infos.name}</span>
            </div>
            <button class="whitelist-btn tip" 
            info-tip="Click this button to remove this tab from the blacklist" 
            data-target="${tab_infos.name}">X</button>
        `;

        tabs_container.append(row_item);
    }
}


// =================================================================================================
// SETTING TOGGLEs
// =================================================================================================

let toggle;
async function toggle_monitoring()
{
    let data = await chrome.storage.local.get(["is_monitor"]);
    toggle = !data.is_monitor;
    await chrome.storage.local.set({is_monitor: toggle});


}

let tog;
async function toggle_volume()
{
    let data = await chrome.storage.local.get(["set_volume"]);
    tog = !data.set_volume;
    await chrome.storage.local.set({set_volume: tog});
}


let togs;
async function toggle_tooltip()
{
    let data = await chrome.storage.local.get(["set_tooltip"]);
    togs = !data.set_tooltip
    await chrome.storage.local.set({set_tooltip: togs});

    await set_tooltip_bubble()
}


// =================================================================================================
// SETTINGS ACTIONS (Save, Clear, Scan)
// =================================================================================================


async function clear_list() {
    await chrome.storage.local.set({ TabList: [] });
    
    // Clear the UI and temporal list if passed through.
    tabs_container.innerHTML = "";
    get_new_list = [];

    change_description_tabs("Click the refresh button below to reload all your open tabs.");

    show_announcement(true, {
        title: "SUCCESS", 
        description: `Your blacklists site has been lifted!\nPress [REFRESH] to load a fresh new blacklist list!`
    })
}




function change_description_tabs(text = "")
{
    //update the text
    const description = document.querySelector(".subheading");
    description.textContent = text;
}




let get_new_list = [];

async function get_tabList() {
    let data = await chrome.storage.local.get(["TabList"]);
    return data.TabList;
}

async function run_browsers_scan() {
    // Load saved list
    let saved_list = await get_tabList()
    
    // Always perform a fresh scan
    let new_list = await listen_tabs();

    // If saved list exists → use it; otherwise use a fresh list.
    get_new_list = (saved_list.length !== 0) ? saved_list : new_list;

    change_description_tabs("Once you are done, press save to update the changes.");
    

    generate_tab_box(get_new_list);
}



async function save_change() {

    //this return an empty list when the user before save, filter out tab away from blacklist, resulting in warning msg.
    console.log(get_new_list)
    await append_tab(get_new_list);

    let data = await get_tabList()
    
    if (!data || data.length === 0) {
        show_announcement(true, {
        title: "WARNING", 
        description: `You can't saved an empty tab list. Please press [REFRESH] to load all avaliable tabs you've opened and try again.`
        })
        return;
    }

    change_description_tabs("Nice! The next time you refresh, your updated blacklist will be shown below.");

    show_announcement(true, {
        title: "SUCCESS!", 
        description: `Your list is saved! Simply press the [START] button in the timer and make sure to enable the feature to start monitoring.`
    })
}


tabs_container.addEventListener("click", async (event) => {

    //Check if the clicked element is the "remove from blacklist" button
    if (event.target.classList.contains("whitelist-btn")) {

        //Copy the current working blacklist (the list shown in the UI)
        let list = get_new_list;

        //Read the domain name attached to the clicked button
        const read_domain = event.target.dataset.target;

        //Remove that domain from the internal list
        //This keeps the internal data in sync with the UI
        list = list.filter(item => item.name !== read_domain);

        //Replace the old with the new working list
        get_new_list = list;

        await chrome.storage.local.set({ TabList: list });

        //Remove the tab row from the UI
        const get_current_tab = event.target.closest(".tab-item-box");
        get_current_tab.remove();
    }
});



// =================================================================================================

export { 
    run_browsers_scan, 
    save_change, 
    listen_tabs, 
    clear_list, 
    toggle_monitoring, 
    toggle_volume,
    toggle_tooltip,
    get_all_tab,
    clean_tab_URL
};
