/**
 *  returns a promise wrapped XHR
 *  @url string location of api resource
 *  @return promise resolving with swapi data
 */

function getXHR(url) {
    var xhr_promise = new Promise(function(resolve, reject) {
        var xhr = window.XMLHttpRequest
            ? new XMLHttpRequest()
            : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.open("GET", url);

        xhr.onreadystatechange = function() {
            if (xhr.readyState > 3) {
                // returned successfully: resolve with response
                if (xhr.status == 200) {
                    resolve(xhr.responseText);
                }

                // did not return successfully: reject with status code
                reject(xhr.status);
            }
        };

        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.send();
        return xhr;
    });

    return xhr_promise;
}

/**
 *  gets data from the window object if available or api if not
 *  @type string type of starwars entity
 *  @id numeric id of starwas entity
 *  @return promise resolving with swapi data
 */

function getData(type, id) {
    return new Promise(function(resolve, reject) {
        // if we've already stored the data, resolve the promise with it
        if (Window.swapi[type].hasOwnProperty(id)) {
            resolve(Window.swapi[type][id]);

            // but if we haven't got the data
        } else {
            // request it from the swapi (returns a promise)
            getXHR("https://swapi.co/api/" + type + "/" + id + "/")
                .then(function(res) {
                    // parse the resulting json and instantiate the entity
                    var entity = instantiate(type, JSON.parse(res));

                    // store the entity to avoid repeat XHRs
                    Window.swapi[type][id] = entity;

                    // resolve data_promise with response from getXHR promise
                    resolve(entity);
                })
                .catch(function(err) {
                    // reject promise with error from getXHR promise
                    reject(err);
                });
        }
    });
}

/**
 *  get an instantiated object which inherts from a main entity object
 *  with various setup and methods
 *  @type string type of starwars entity
 *  @id numeric id of starwas entity
 *  @return object instantiated starwars entity
 */

function instantiate(type, data) {
    return {
        people: function(data) {
            return new Person(data);
        },
        starships: function(data) {
            return new Starship(data);
        },
        films: function(data) {
            return new Film(data);
        },
        planets: function(data) {
            return new Planet(data);
        },
        species: function(data) {
            return new Species(data);
        },
        vehicles: function(data) {
            return new Vehicle(data);
        }
    }[type](data);
}

/**
 *  Gets data for a single entity from the SWAPI
 *  @return object star wars entity
 */

async function getEntity(type, id) {
    // if this data is not available locally
    if (!Window.swapi[type].hasOwnProperty(id)) {
        // get it the data from the swapi. await the response as the
        // data is required to build the markup for the page
        var response = await getXHR(
            "https://swapi.co/api/" + type + "/" + id + "/"
        );

        // parse it
        var data = JSON.parse(response);

        // store it for access later, saving XHRs
        Window.swapi[type][id] = instantiate(type, data);
    }

    var entity = Window.swapi[type][id];

    return entity;
}

async function printEntity(type, id) {
    var entity = await getEntity(type, id);
    entity.printData();
    entity.printAssociatedFields();
}

/**
 *	Takes a SWAPI url and gets the type of entity and id
 *  @return numeric entity id
 */

function getIdFromURL(url) {
    // stip out trailing slash
    var id = url.replace(/\/$/, "");
    // stip out everything up to the last slash
    id = id.replace(/^.*\//, "");
    // should be left with a number, parse it
    id = parseInt(id, 10);
    // and return it
    return id;
}

// top level Entity constructor
function Entity(data, arr_data_fields, arr_associated_fields, heading_field) {
    this.arr_data_fields = arr_data_fields;
    this.arr_associated_fields = arr_associated_fields;

    this.data = {};
    this.associated = {};
    this.heading_field = heading_field;

    if (this.heading_field !== "name") {
        this.data.name = data[this.heading_field];
    }

    // populate entity data fields

    // loop over data fields
    for (var data_item of this.arr_data_fields) {
        // if this data_item is present
        if (data.hasOwnProperty(data_item)) {
            // set it on this entity
            this.data[data_item] = data[data_item];
        }
    }

    // populate entity associated fields

    // loop over assocaited fields
    for (var obj_associated of this.arr_associated_fields) {
        var title = Object.keys(obj_associated)[0];
        var type = obj_associated[title];

        // if this assocaited_entity is present
        if (data.hasOwnProperty(title)) {
            // set it on this entity as an empty array
            this.associated[type] = [];

            // loop over associated swapi urls
            for (var url of data[title]) {
                // extract their entity ids from the urls and add them to this array
                this.associated[type].push(getIdFromURL(url));
            }
        }
    }

    /**
     *  Print this entity's data items to the page
     */

    this.printData = function() {
        var html =
            '<div class="section_container">' +
            "<h2>" +
            this.data[this.heading_field] +
            "</h2>" +
            "<table><tbody>";

        for (var key in this.data) {
            // we've already used the name as the title
            if (key === this.heading_field || key === "name") {
                continue;
            }

            var field = key.replace(/_/g, " ");

            html +=
                '<tr class="data_item"><td class="field">' +
                field +
                "</td>" +
                '<td class="value">' +
                this.data[key] +
                "</td></tr>";
        }

        html += "</tbody></table>";

        // add built html to the DOM
        document.getElementById("data").innerHTML = html;
    };

    /**
     *  Print this entity's associated items to the page
     *  Note: prints hidden items, which are unhidden when we have appropriate data
     */

    this.printAssociatedFields = function() {
        var html = "";

        // loop over assocaited fields
        for (var entity in this.associated) {
            html +=
                '<div class="section_container associated" data-entity="' +
                entity +
                '">' +
                "<h2>" +
                entity +
                "</h2>";

            for (var id of this.associated[entity]) {
                var value = id;

                if (Window.swapi[entity].hasOwnProperty(id)) {
                    value = Window.swapi[entity][id].data.name;
                }

                html +=
                    '<div class="data_item' +
                    (value === id ? " hidden" : "") +
                    '" ' +
                    'data-id="' +
                    id +
                    '">' +
                    value +
                    "</div>";
            }

            html += "</div>";
        }

        // add built html to the DOM
        document.getElementById("associated").innerHTML = html;
        this.populateData();
    };

    /**
     *  Loop over all assocaited items, get the relevant data and process them
     */

    this.populateData = function() {
        // loop over associated types
        for (var type in this.associated) {
            // loop over entity ids
            for (var id of this.associated[type]) {
                // get the data, either locally or from the swapi
                getData(type, id)
                    // add it to the page
                    .then(this.populateDataItem.bind(null, type, id));
            }
        }
    };

    /**
     *  For an individual associated item, locate it in them DOM, set it's name,
     *  show it, and add click handler
     *  @type string type of starwars entity
     *  @id numeric id of starwas entity
     *  @entity instantiated starwars entity
     */

    this.populateDataItem = function(type, id, entity) {
        var selector =
            '.associated[data-entity="' + type + '"] [data-id="' + id + '"]';
        var elem = document.querySelectorAll(selector)[0];

        // change the content to the entity's name
        elem.innerHTML = entity.data.name;
        // show the element
        elem.classList.remove("hidden");
        // add a click handler to show this entity
        elem.addEventListener("click", function() {
            // on click print the requested entity to the DOM
            printEntity(this.parentNode.dataset.entity, this.dataset.id);
        });
    };
}

/**
 *  person constructor, inherits from Entity
 */

function Person(data) {
    var arr_data_fields = [
        "birth_year",
        "eye_color",
        "gender",
        "hair_color",
        "height",
        "mass",
        "name",
        "skin_color"
    ];

    var arr_associated_fields = [
        { films: "films" },
        { species: "species" },
        { starships: "starships" },
        { vehicles: "vehicles" }
    ];

    var heading_field = "name";

    Entity.call(
        this,
        data,
        arr_data_fields,
        arr_associated_fields,
        heading_field
    );
}

/**
 *  starship constructor, inherits from Entity
 */

function Starship(data) {
    var arr_data_fields = [
        "MGLT",
        "cargo_capacity",
        "consumables",
        "cost_in_credits",
        "crew",
        "hyperdrive_rating",
        "length",
        "manufacturer",
        "max_atmospheric_speed",
        "model",
        "name",
        "passengers",
        "starship_class"
    ];

    var arr_associated_fields = [{ films: "films" }, { pilots: "people" }];

    var heading_field = "name";

    Entity.call(
        this,
        data,
        arr_data_fields,
        arr_associated_fields,
        heading_field
    );
}

/**
 *  film constructor, inherits from Entity
 */

function Film(data) {
    var arr_data_fields = [
        "director",
        "episode_id",
        "opening_crawl",
        "producer",
        "release_date",
        "title"
    ];

    var arr_associated_fields = [
        { characters: "people" },
        { planets: "planets" },
        { species: "species" },
        { starships: "starships" },
        { vehicles: "vehicles" }
    ];

    var heading_field = "title";

    Entity.call(
        this,
        data,
        arr_data_fields,
        arr_associated_fields,
        heading_field
    );
}

/**
 *  planet constructor, inherits from Entity
 */

function Planet(data) {
    var arr_data_fields = [
        "climate",
        "diameter",
        "gravity",
        "name",
        "orbital_period",
        "population",
        "rotation_period",
        "surface_water",
        "terrain"
    ];

    var arr_associated_fields = [{ films: "films" }, { residents: "people" }];

    var heading_field = "name";

    Entity.call(
        this,
        data,
        arr_data_fields,
        arr_associated_fields,
        heading_field
    );
}

/**
 *  species constructor, inherits from Entity
 */

function Species(data) {
    var arr_data_fields = [
        "average_height",
        "average_lifespan",
        "classification",
        "designation",
        "eye_colors",
        "hair_colors",
        "language",
        "name",
        "skin_colors"
    ];

    var arr_associated_fields = [{ films: "films" }, { people: "people" }];

    var heading_field = "name";

    Entity.call(
        this,
        data,
        arr_data_fields,
        arr_associated_fields,
        heading_field
    );
}

/**
 *  vehicle constructor, inherits from Entity
 */

function Vehicle(data) {
    var arr_data_fields = [
        "cargo_capacity",
        "consumables",
        "cost_in_credits",
        "crew",
        "length",
        "manufacturer",
        "max_atmosphering_speed",
        "model",
        "name",
        "passengers",
        "vehicle_class"
    ];

    var arr_associated_fields = [{ films: "films" }, { pilots: "people" }];

    var heading_field = "name";

    Entity.call(
        this,
        data,
        arr_data_fields,
        arr_associated_fields,
        heading_field
    );
}

/**
 *  Self-calling initialisation function
 */

(async function init() {
    console.clear();

    // setup window object to store data
    Window.swapi = {
        people: {},
        planets: {},
        species: {},
        starships: {},
        vehicles: {},
        films: {}
    };

    // start somewhere
    // printEntity( "films", 1 );
    getAllData(printEntity.bind(null, "films", 1));
})();

/**
 *  process the result of a swapi api call for a group of entities
 *  @resolve function the resolve function for the wrapped promise
 *  @type string the type of swapi entity
 *  @total numeric the total amount of data that should be retrieved
 *  @cumulative numeric the amount of data retreived so far
 *  @res json data returned from swapi
 *  @return void either calls itself recurrsively or resolve a promise
 */

function process(resolve, type, total, cumulative, res) {
    var data = JSON.parse(res);
    total = data.count;
    cumulative += data.results.length;

    // loop over returned data
    for (var item of data.results) {
        // stor instantiated entities
        Window.swapi[type][getIdFromURL(item.url)] = instantiate(type, item);
    }

    // if this type has more data that we don't yet have, call this fn recursively
    // to make another request. Pass in the all the args we need using bind()
    if (total > cumulative) {
        getXHR(data.next).then(
            process.bind(null, resolve, type, total, cumulative)
        );
    } else {
        Window.completed_types += 1;
        var percent = (Window.completed_types / Window.total_types) * 100;

        var bar = document.querySelectorAll(".loading_bar")[0];
        bar.setAttribute("style", "width:" + percent + "%");

        resolve(type);
    }
}

async function getAllData(callback) {
    var arr_types = [
        "people",
        "planets",
        "species",
        "starships",
        "films",
        "vehicles"
    ];

    Window.total_types = arr_types.length;
    Window.completed_types = 0;

    var arr_promises = [];

    // loop over all the types
    for (var type of arr_types) {
        var total = 0;
        var cumulative = 0;

        // add a promise for each type. It will get resolved when
        // all the data for that type has been retrieved
        arr_promises.push(
            new Promise(function(resolve, reject) {
                getXHR("https://swapi.co/api/" + type + "/")
                    .then(process.bind(null, resolve, type, total, cumulative))
                    .catch(function(err) {
                        reject(err);
                    });
            })
        );
    }

    Promise.all(arr_promises)
        .then(function(values) {
            console.log(values);

            // it annoying if you don't get to see it finish
            setTimeout(function() {
                var bar_wrapper = document.querySelectorAll(
                    ".loading_bar_wrapper"
                )[0];
                bar_wrapper.classList.add("hidden");
            }, 100);

            callback();
        })
        .catch(function(err) {
            console.log(err);
        });
}
