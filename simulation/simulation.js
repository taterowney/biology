window.addEventListener("load", function() {
    window.renderStack = [];
    window.labels = [];
    window.cursorObject = null;
    window.assets = {};
    window.totalAssets = 4;
    window.numAssetsLoaded = 0;
    window.isReady = false;
    window.show_labels = false;
    window.is_simulating = false;
    window.simulation_speed = 200;
    window.x_offset = () => {return document.getElementById("canvas").getBoundingClientRect().x}
    window.y_offset = () => {return document.getElementById("canvas").getBoundingClientRect().y}
    load_image("./neuron.png");
    load_image("./trash.png");
    load_image("./synapse.png");
    load_image("./axon.png");
});

// load an image from a path
function load_image(path) {
    let image = new Image();
    image.src = path;
    image.onload = () => {
        window.numAssetsLoaded++;
        let name = image.src.split("/").slice(-1)[0].split(".")[0]
        window.assets[name] = image;
        if (window.numAssetsLoaded == window.totalAssets) {
            window.isReady = true;
            begin();
            render();
        }
    }
}

// once all assets are successfully loaded, enable the simulation
function begin() {
    console.log('all assets loaded successfully');
    document.getElementById("canvas").addEventListener("mousemove", function(e) {
        update_placing_synapse(e.clientX - window.x_offset(), e.clientY - window.y_offset());
        render();
        if (window.cursorObject) {
            let x = e.clientX - window.x_offset();
            let y = e.clientY - window.y_offset();
            const ctx = document.getElementById("canvas").getContext("2d");
            if (window.cursorObject.type == "image") {
                ctx.drawImage(window.cursorObject.asset, x - 0.5*window.cursorObject.asset.width, y - 0.5*window.cursorObject.asset.height);
//                if (window.cursorObject.asset == window.assets["neuron"] && window.cursorObject.synapse) {
//                    window.cursorObject.synapse.isPlacingSynapse = true;
//                    window.cursorObject.synapse.parent = window.cursorObject;
//                    update_placing_synapse(window.cursorObject.synapse.x, window.cursorObject.synapse.y);
//                }
            }
        }
    });
    document.getElementById("canvas").addEventListener("click", function(e) {
        let x = e.clientX - window.x_offset();
        let y = e.clientY - window.y_offset();
        handle_click(x, y);
    });
    bind_buttons();
}

//clear the canvas
function clear() {
    const ctx = document.getElementById("canvas").getContext("2d");
    ctx.clearRect(0, 0, document.getElementById("canvas").width, document.getElementById("canvas").height);
}

// places down an image on the canvas at the desired position
function add_image(x, y, name) {
    let image = window.assets[name];
    window.renderStack.push({type:"image", asset: image, x: x, y: y, uid: generate_uid(), center: [x + 0.5*image.width, y + 0.5*image.height], charge: 0});
}

// places down an image on the canvas at the desired position
function add_image_from_object(x, y, image) {
    window.renderStack.push({type:"image", asset: image, x: x, y: y, uid: generate_uid(), center: [x + 0.5*image.width, y + 0.5*image.height], charge: 0});
}

// adds decorative label to object
function add_label(object, text) {
    let label = {type:"text", text: text, x: object.x + 0.5*object.asset.width, y: object.y + 0.5*object.asset.height, uid: generate_uid(), decorative: true};
    window.renderStack.push(label);
    window.labels.push(label);
}

// removes an object from the canvas
function remove_object(object) {
    let index = window.renderStack.indexOf(object);
    if (index > -1) {
        if (window.renderStack[index].synapse) {
            remove_object(window.renderStack[index].synapse);
        }
        else if (window.renderStack[index].axons) {
            for (let i = 0; i < window.renderStack[index].axons.length; i++) {
                remove_object(window.renderStack[index].axons[i]);
            }
        }
        window.renderStack.splice(index, 1); 
    }
}

// renders each item in the render stack
function render() {
    clear();
    maybe_show_charge_labels();
    window.influence_matrix = [];
    window.influence_agents = [];
    const ctx = document.getElementById("canvas").getContext("2d");
    for (let i = 0; i < window.renderStack.length; i++) {
        let item = window.renderStack[i];
        if (item.angle_vec) {
            ctx.translate(item.center[0], item.center[1]);
            ctx.rotate(get_angle_from_vec(item.angle_vec));
            ctx.translate(-item.center[0], -item.center[1]);
        }
        if (item.type == "image") {
            ctx.drawImage(item.asset, item.x, item.y);
        }
        else if (item.type == "text") {
            ctx.font = item.style;
            ctx.fillText(item.text, item.x, item.y);
        }
        ctx.resetTransform();
        if (!item.decorative) {
            window.influence_matrix.push([]);
            window.influence_agents.push(item);
            for (let j = 0; j < window.renderStack.length; j++) {
                if (!window.renderStack[j].decorative) {
                    if (i == j) {
                        window.influence_matrix[window.influence_matrix.length - 1].push(0.5);
                    } else {
                        window.influence_matrix[window.influence_matrix.length - 1].push(0);
                    }
                }
            }
        }
    }
}

function get_angle_from_vec(vec) {
    return Math.atan2(vec[1], vec[0]);
}

// find which object was clicked on
function get_topmost(x, y) {
    for (let i = window.renderStack.length - 1; i >= 0; i--) {
        let item = window.renderStack[i];
        if (item.type == "image") {
            if (x >= item.x && x <= item.x + item.asset.width && y >= item.y && y <= item.y + item.asset.height) {
                return item;
            }
        }
    }
    return null;
}


// moves an image with the cursor
function add_cursor_image(name) {
    if (window.assets[name]) {
        window.cursorObject = {type: "image", asset: window.assets[name], name: name};
    }
}

// removes the cursor image
function remove_cursor_image() {
    window.cursorObject = null;
}

// place cursor image on canvas
function place_image(x, y) {
    if (window.cursorObject) {
        add_image_from_object(x - 0.5*window.cursorObject.asset.width, y - 0.5*window.cursorObject.asset.height, window.cursorObject.asset);
        window.cursorObject = null;
        render();
    }
}

// grab image from canvas
function pipette_image(x, y) {
    let item = get_topmost(x, y);
    if (item) {
        window.cursorObject = item;
        remove_object(item);
        window.cursor_mode = "place";
        document.getElementById("canvas").style.cursor = "none";
        render();
    }
}

// generate a unique id
function generate_uid() {
    if (!window.current_uid) {
        window.current_uid = 0;
    }
    window.current_uid++;
    return window.current_uid;
}










// from here down is specific to the simulation that I'm making

// adds functionality to the menu buttons
function bind_buttons() {
    document.getElementById("neuron-button").addEventListener("click", function() {
        remove_cursor_image();
        add_cursor_image("neuron");
        window.cursor_mode = "place";
        document.getElementById("canvas").style.cursor = "none";
    });
/*     document.getElementById("move-button").addEventListener("click", function() {
        remove_cursor_image();
        window.cursor_mode = "move";
        document.getElementById("canvas").style.cursor = "move";
    }); */
    document.getElementById("delete-button").addEventListener("click", function() {
        remove_cursor_image();
        window.cursor_mode = "delete";
        add_cursor_image("trash");
        document.getElementById("canvas").style.cursor = "none";
    });
    document.getElementById("axon-button").addEventListener("click", function(e) {
        remove_cursor_image();
        window.cursor_mode = "choose_synapse";
        document.getElementById("canvas").style.cursor = "default";
    });
    document.getElementById("label-button").addEventListener("click", function(e) {
        window.show_labels = !window.show_labels;
        if (window.show_labels) {
            document.getElementById("label-button").innerHTML = "Hide Charge Labels";
        } else {
            document.getElementById("label-button").innerHTML = "Show Charge Labels";
        }
        render();
        render();
    });
    document.getElementById("activate-button").addEventListener("click", function(e) {
        remove_cursor_image();
        window.cursor_mode = "activate";
//        add_cursor_image("lightning_bolt");
    });
    document.getElementById("begin-button").addEventListener("click", function(e) {
        if (!window.is_simulating) {
            document.getElementById("begin-button").innerHTML = "Pause Simulation";
            window.is_simulating = true;
            window.setTimeout(function() {
                tick_simulation()}, window.simulation_speed);
        }
        else {
            document.getElementById("begin-button").innerHTML = "Begin Simulation";
            window.is_simulating = false;
        }
    });
}

function handle_click(x, y) {
    if (window.cursor_mode == "place") {
        place_image(x, y, "neuron");
        document.getElementById("canvas").style.cursor = "default";
    } else if (window.cursor_mode == "delete") {
        let item = get_topmost(x, y);
        if (item) {
            remove_object(item);
            render();
            render();
        }
    } else if (window.cursor_mode == "move") {
        pipette_image(x, y);
    }
    else if (window.cursor_mode == "choose_synapse") {
        clicked_object = get_topmost(x, y);
        if (clicked_object) {
            if (clicked_object.asset == window.assets["neuron"]) {
                if (clicked_object.synapse) {
                    remove_object(clicked_object.synapse);
                }
                window.cursor_mode = "place_synapse";
                let image = window.assets["synapse"];
                window.renderStack.push({type:"image", asset: image, x: x, y: y, uid: generate_uid(), center: [x + 0.5*image.width, y + 0.5*image.height], parent: clicked_object, isPlacingSynapse: true, charge:0});
                update_placing_synapse(x, y);
                render();
            }
        }
    }
    else if (window.cursor_mode == "place_synapse") {
        for (let i = 0; i < window.renderStack.length; i++) {
            let synapse;
            if (window.renderStack[i].isPlacingSynapse) {
                synapse = window.renderStack[i];
                synapse.isPlacingSynapse = false;
                window.cursor_mode = "choose_synapse";
                break;
            }
        }
    }
    else if (window.cursor_mode == "activate") {
        let top = get_topmost(x, y);
        if (top) {
            if (!top.decorative) {
                top.charge = 1;
                render();
                render();
            }
        }
    }
}

function update_placing_synapse(x, y) {
    // find the closest neuron
    for (let i = 0; i < window.renderStack.length; i++) {
        var synapse;
        if (window.renderStack[i].isPlacingSynapse) {
            synapse = window.renderStack[i];
            let min_dist = 1000;
            var best_pos = [x, y];
            var target;
            for (let i = 0; i < window.renderStack.length; i++) {
                let item = window.renderStack[i];
                if (item.type == "image" && item.asset == window.assets["neuron"] && distance(item.center, [x, y]) < min_dist && item.uid != synapse.parent.uid) {
                    min_dist = distance(item.center, [x, y]);
                    best_pos = item.center;
                    target = item;
                }
            }
            break;
        }
    }
    if (synapse) {
        let parent = synapse.parent;
        synapse.target = target;
        synapse.start = vec_add(parent.center, scale_to_magnitude(angle_vec_towards(parent.center, best_pos), 0.25*parent.asset.width));
        synapse.end = vec_add(best_pos, scale_to_magnitude(angle_vec_towards(best_pos, parent.center), 0.5*parent.asset.width));
        synapse.x = synapse.end[0]-0.5*synapse.asset.width;
        synapse.y = synapse.end[1]-0.5*synapse.asset.height;
        synapse.center = [synapse.end[0], synapse.end[1]];
        parent.angle_vec = [synapse.start[0] - parent.center[0], synapse.start[1] - parent.center[1]];
        parent.synapse = synapse;
        synapse.control = get_control_point(synapse.start, synapse.end);
        synapse.angle_vec = quadratic_bezier_slope(synapse.start, synapse.end, synapse.control, 1);
        // update axon segments
        if (synapse.axons) {
            for (let i = 0; i < synapse.axons.length; i++) {
                let axon = synapse.axons[i];
                remove_object(axon);
            }
        }
        synapse.axons = [];
        let num_axons = Math.floor(distance(synapse.start, synapse.end)/13);
        for (let i=0; i < num_axons-1; i++) {
            let t = i/(num_axons);
            let pos = quadratic_bezier(synapse.start, synapse.end, synapse.control, t);
            let angle = quadratic_bezier_slope(synapse.start, synapse.end, synapse.control, t);
            let axon_asset = window.assets["axon"]
            let axon = {type: "image", asset:axon_asset, x:pos[0]-0.5*axon_asset.height, y:pos[1]-0.5*axon_asset.height, uid: generate_uid(), parent: synapse, angle_vec:angle, center:pos, charge:0};
            if (i==0) {
                axon.prev = synapse.parent;
            }
            else {
                axon.prev = synapse.axons[i-1];
            }
            window.renderStack.push(axon);
            synapse.axons.push(axon);
        }
        synapse.prev = synapse.axons[synapse.axons.length - 1];
    }
    // make it so that the synapse connects to the outside of the target neuron
    
}

function vec_add(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}

function vec_scale(vec, scale) {
    return [vec[0]*scale, vec[1]*scale];
}

function distance(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

function quadratic_bezier(start, end, control, t) {
    let x = Math.pow(1 - t, 2)*start[0] + 2*(1 - t)*t*control[0] + Math.pow(t, 2)*end[0];
    let y = Math.pow(1 - t, 2)*start[1] + 2*(1 - t)*t*control[1] + Math.pow(t, 2)*end[1];
    return [x, y];
}

function quadratic_bezier_slope(start, end, control, t) {
    let x = 2*(1 - t)*(control[0] - start[0]) + 2*t*(end[0] - control[0]);
    let y = 2*(1 - t)*(control[1] - start[1]) + 2*t*(end[1] - control[1]);
    return [x, y];
}

function angle_vec_towards(object, target) {
    return [target[0] - object[0], target[1] - object[1]];
}

function rotate_towards(object, target) {
    let angle = Math.atan2(target[1] - object.center[1], target[0] - object.center[0]);
    object.angle = angle;
}

function rotate_from_slope_vec(object, slope_vec) {
    let angle = Math.atan2(slope_vec[1], slope_vec[0]);
    object.angle = angle;
}

function scale_to_magnitude(vec, length) {
    let mag = Math.sqrt(Math.pow(vec[0], 2) + Math.pow(vec[1], 2));
    return [vec[0]*length/mag, vec[1]*length/mag];
}

function get_control_point(start, end) {
    let dist = [(end[0] - start[0])/2, (end[1] - start[1])/2];
    let perp = [-dist[1]/5, dist[0]/5];
    return [start[0] + dist[0] + perp[0], start[1] + dist[1] + perp[1]];
}

function sigmoid(x) {
    return 1/(1 + Math.pow(Math.E, -x));
}

function matrix_apply(matrix, vec) {
    let result = [];
    for (let i=0; i<matrix.length; i++) {
        let sum = 0;
        for (let j=0; j<matrix[i].length; j++) {
            sum += matrix[i][j]*vec[j];
        }
        result.push(sum);
    }
    return result;
}


function influences(source, target, amount) {
    window.influence_matrix[window.renderStack.indexOf(target)][window.renderStack.indexOf(source)] = amount;
}

function update_connected_elements() {
    for (let i=0; i < window.renderStack.length; i++) {
        let item = window.renderStack[i];
        if (item.prev) {
            influences(item.prev, item, 0.5);
        }
    }
}


function tick_simulation() {
    update_connected_elements();
    let charges = [];
    for (let i=0; i < window.influence_agents.length; i++) {
        let item = window.renderStack[i];
        charges.push(item.charge);
    }
    let new_charges = matrix_apply(window.influence_matrix, charges);
    for (let i=0; i < window.influence_agents.length; i++) {
        let item = window.renderStack[i];
        item.charge = new_charges[i];
        if (item.target) {
            console.log(item.target)
            if (item.charge > 0.05) {
                item.target.charge = 0.5;
            }
        }
    }
    if (window.is_simulating) {
        window.setTimeout(function() {
            tick_simulation();
            render();
        }, window.simulation_speed);
    }
}

function maybe_show_charge_labels() {
    if (window.charge_labels) {
        for (let i=0; i < window.charge_labels.length; i++) {
            remove_object(window.charge_labels[i]);
        }
    }
    else {
        window.charge_labels = [];
    }
    if (window.show_labels) {
        for (let i=0; i < window.influence_agents.length; i++) {
            let item = window.influence_agents[i];
            if (item) {
                let label;
                if (item.asset == window.assets["axon"]) {
                    label = {type:"text", text: Math.round(item.charge*220-55), x: item.x + 0.5*item.asset.width, y: item.y + 0.5*item.asset.height, uid: generate_uid(), decorative: true, style:"8px Arial"};
                }
                else {
                    label = {type:"text", text: Math.round(item.charge*220-55), x: item.x + 0.5*item.asset.width, y: item.y + 0.5*item.asset.height, uid: generate_uid(), decorative: true, style:"15px Arial"};
                }
                window.charge_labels.push(label);
                window.renderStack.push(label);
            }
        }
    }
}
