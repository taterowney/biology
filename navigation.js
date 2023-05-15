
window.addEventListener('load', () => {
    const buttons = document.getElementsByClassName("navbar-subtopic");
    const subtopics = document.getElementsByClassName("main-idea");
    if (buttons.length != subtopics.length) {
        throw new Error("Number of buttons and subtopics do not match");
    };
    const all_elems = Array.prototype.slice.call(document.getElementById("content").children);
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].id = "subtopic-" + i;
        subtopics[i].id = buttons[i].id + "-target";
        subtopics[i].prev = all_elems[all_elems.indexOf(subtopics[i]) - 1];
        buttons[i].addEventListener("click", () => {
            subtopics[i].prev.scrollIntoView({behavior:"smooth", block:"start", inline:"end"});
//            document.getElementById(buttons[i].id).scrollIntoView({behavior:"smooth", block:"start", inline:"center"});
            update_active_nav_button();
        })
    }
})

function update_active_nav_button() {
    const buttons = document.getElementsByClassName("navbar-subtopic");
    const subtopics = document.getElementsByClassName("main-idea");
    document.getElementsByClassName("active")[0].classList.remove("active");
    for (let i = 0; i < buttons.length; i++) {
        if (subtopics[i].getBoundingClientRect().top > 50) {
            buttons[i].classList.add("active");
            return;
        }
    }
    buttons[buttons.length - 1].classList.add("active");
}

window.addEventListener('scroll', () => {update_active_nav_button()});
