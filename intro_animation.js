window.addEventListener('load', () => {runIntroUpdate(0)})

function runIntroUpdate(i) {
    const logo_blue_text = "Tate";
    const logo_black_text = "Rowney";

    const wait_time = 12;

    let logo_black = document.getElementById("logo-black");
    let logo_blue = document.getElementById("logo-blue");
    if (i < wait_time) {
        if (Math.floor(i/4) % 2 == 0) {
            logo_black.innerHTML = "_";
        }
        else {
            logo_black.innerHTML = "";
        }
    }
    else if (i < wait_time + logo_blue_text.length) {
        logo_black.innerHTML = "_";
        logo_blue.style.display = "inline"
        logo_blue.innerHTML = logo_blue_text.substring(0, i - wait_time + 1);
    }
    else if (i < wait_time + logo_blue_text.length + logo_black_text.length) {
        logo_blue.innerHTML = logo_blue_text;
        logo_black.style.display = "inline"
        logo_black.innerHTML = logo_black_text.substring(0, i - wait_time - logo_blue_text.length + 1) + "_";
    }
    else {
        document.getElementById("intro").classList.add("slide-out-top");
        window.setTimeout(() => {document.getElementById("intro").style.display = "none"}, 500);
        document.getElementById("main").classList.add("fade-in");
        document.getElementById("main").style.display = "block";
        return;
    }
    window.setTimeout(() => {runIntroUpdate(i+1)}, 100);
}
