/* -------------- */
/* Data functions */
/* -------------- */

/**
 * Helper method for cross-browser handling of CORS requests
 * taken from https://humanwhocodes.com/blog/2010/05/25/cross-domain-ajax-with-cross-origin-resource-sharing/
 * @method string request verb
 * @url string location of api resource
 */

function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {

    // Check if the XMLHttpRequest object has a "withCredentials" property.
    // "withCredentials" only exists on XMLHTTPRequest2 objects.
    xhr.open(method, url, true);

  } else if (typeof XDomainRequest != "undefined") {

    // Otherwise, check if XDomainRequest.
    // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
    xhr = new XDomainRequest();
    xhr.open(method, url);

  } else {

    // Otherwise, CORS is not supported by the browser.
    xhr = null;

  }
  return xhr;
}

/**
 *  returns a promise wrapped XHR
 *  @url string location of api resource
 *  @return promise resolving with swapi data
 */

function getXHR(url) {
    var xhr_promise = new Promise(function(resolve, reject) {
        var xhr = createCORSRequest('GET', url);
        if (!xhr) {
            throw new Error('CORS not supported');
        }

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
        // get swapi data from session storage
        var swapi = getFromSession("swapi");
        // if this data is not available locally
        if (swapi[type].hasOwnProperty(id)) {
            resolve(swapi[type][id]);

            // but if we haven't got the data
        } else {
            // request it from the swapi (returns a promise)
            getXHR("https://swapi.dev/api/" + type + "/" + id + "/")
                .then(function(res) {
                    // parse the resulting json
                    var data = JSON.parse(res);

                    // store the data to avoid repeat XHRs
                    updateSwapiData(type, id, data);

                    // instantiate the entity
                    var entity = instantiate(type, data);

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
 *  Gets data for a single entity from the SWAPI
 *  @return object star wars entity
 */

async function getEntity(type, id) {
    var entity;

    // get swapi data from session storage
    var swapi = getFromSession("swapi");

    // if this data is not available locally
    if (!swapi[type].hasOwnProperty(id)) {
        // get it the data from the swapi. await the response as the
        // data is required to build the markup for the page
        var response = await getXHR(
            "https://swapi.dev/api/" + type + "/" + id + "/"
        );

        // parse it
        var data = JSON.parse(response);

        // store it for access later, saving XHRs
        // entity = instantiate(type, data);
        updateSwapiData(type, id, data);
    }

    entity = getEntityFromSession(type, id);
    return entity;
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
        var id = getIdFromURL(item.url);
        // store data
        updateSwapiData(type, id, item);
    }

    // if this type has more data that we don't yet have, call this fn recursively
    // to make another request. Pass in the all the args we need using bind()
    if (total > cumulative) {
        // Annoyingly "next page" URLs are supplied as http
        var nextPage = data.next.replace(/^http:/, "https");
        getXHR(nextPage).then(
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

/**
 *  get all the available data from the swapi
 *  @callback function to fire once all data is available
 */

async function getAllData(callback) {
    // get swapi data from session - will be empty to begin with
    var swapi = getFromSession("swapi");

    var arr_types = [
        "people",
        "planets",
        "species",
        "starships",
        "films",
        "vehicles"
    ];

    // determine if we have data for each entity
    var has_data = arr_types.reduce(function(reducer, type) {
        // if we don't have this property, return false
        if (!swapi.hasOwnProperty(type)) {
            return false && reducer;
        }

        // if the property doesn't have keys, return false
        return Object.keys(swapi[type]).length > 0 && reducer;
    });

    // if we have the data already
    if (has_data) {
        // run the supplied call back
        callback();
        // hide the loading bar which is shown by default
        hideLoadingBar();
        // don't go to the api for the data
        return false;
    }

    // setup object to store data
    var swapi = {
        people: {},
        planets: {},
        species: {},
        starships: {},
        vehicles: {},
        films: {}
    };

    setInSession("swapi", swapi);

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
                getXHR("https://swapi.dev/api/" + type + "/")
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
                hideLoadingBar();
            }, 100);

            callback();
        })
        .catch(function(err) {
            console.log(err);
        });
}

/**
 *  Small helper function to locate the loading bar element and hide it
 */

function hideLoadingBar() {
    var bar_wrapper = document.querySelectorAll(".loading_bar_wrapper")[0];
    bar_wrapper.classList.add("hidden");
}

/* ----------------- */
/* Storage functions */
/* ----------------- */

/**
 *  Helper function for getting things from Session Storage
 *  @key string key of property to return from storage
 *  @return object from storage, or empty object
 */

function getFromSession(key) {
    var value = sessionStorage.getItem(key);
    value = JSON.parse(value);
    // if value is null, return empty object
    return value === null ? {} : value;
}

/**
 *  Helper function for setting things in Session Storage
 *  @key string key of property to return from storage
 *  @return void
 */

function setInSession(key, data) {
    var value = JSON.stringify(data);
    sessionStorage.setItem(key, value);
}

/**
 *  Helper function for updating swapi data in Session Storage
 *  @type string type of swapi entity
 *  @id numeric id of swapi entity
 *  @return void
 */

function updateSwapiData(type, id, data) {
    var swapi = getFromSession("swapi");
    swapi[type][id] = data;
    setInSession("swapi", swapi);
}

/**
 *  Helper function for instantiating swapi entity from data
 *  in Session Storage
 *  @type string type of swapi entity
 *  @id numeric id of swapi entity
 *  @return void
 */

function getEntityFromSession(type, id) {
    var swapi = getFromSession("swapi");
    return instantiate(type, swapi[type][id]);
}

/* ---------------- */
/* Markup functions */
/* ---------------- */

/**
 *  Gets an instantiated entity, either from the the window object
 *  or the swapi and uses it's inherited methods to print it's data
 *  @return void, amendeds the DOM as a side effect
 */

async function printEntity(type, id) {
    var entity = await getEntity(type, id);
    entity.printData();
    entity.printAssociatedFields();
    // go to top of page
    scroll(0, 0);
}

/**
 *  returns markup for a list of associated entities
 *  @type string type of swapi entity
 *  @arr_entity_ids array of swapi entity ids
 *  @return string html
 */

function printAssociatedEntities(type, arr_entity_ids) {
    var html = "";
    var swapi = getFromSession("swapi");

    html += `<div class="section_container associated" data-entity="${type}">`;
    html += `<div class="heading"><div class="title"><h2>${type}</h2></div>`;
    html += `<div class="action"><button class="btn view_all" data-entity="${type}">View all ${type}</button></div></div>`;

    for (var id of arr_entity_ids) {
        var value = id;
        // if we have the appropraite value for this, use it
        if (swapi[type].hasOwnProperty(id)) {
            var entity = getEntityFromSession(type, id);
            value =
                '<span class="value">' +
                // ensure we're using the correct heading field
                entity.data[entity.heading_field] +
                "</span>" +
                '<span class="view"><button class="btn view_entity">view</button></span>';
        }

        html += `<div class="data_item" data-id="${id}">${value}</div>`;
    }

    var arr_elems = document.querySelectorAll;

    html += "</div>";
    return html;
}

/**
 *  Gets an instantiated entity, either from the the window object
 *  or the swapi and uses it's inherited methods to print it's data
 *  @return void, amendeds the DOM as a side effect
 */

async function printAllEntity(type) {
    var swapi = getFromSession("swapi");
    var arr_entity_ids = [];

    for (var key in swapi[type]) {
        arr_entity_ids.push(key);
    }

    var html = printAssociatedEntities(type, arr_entity_ids);

    document.querySelectorAll("#data")[0].innerHTML = "";
    document.querySelectorAll("#associated")[0].innerHTML = html;

    addEventListeners(
        ".associated .data_item",
        "click",
        associatedClickhandler
    );

    addEventListeners(".view_all", "click", viewAllClickhandler);

    // go to top of page
    scroll(0, 0);
}

/* ---------------- */
/* User Interaction */
/* ---------------- */

/**
 *  Adds event listeners to elements
 *  @selector string css selector to match elements to attach events to
 *  @action string type of interaction with elements
 *  @handler function to fire on interaction
 *  @return void
 */

function addEventListeners(selector, action, handler) {
    // get associated items on the page
    var arr_elems = document.querySelectorAll(selector);
    var cnt_elems = arr_elems.length;

    // loop over them
    for (var idx = 0; idx < cnt_elems; idx++) {
        var elem = arr_elems[idx];
        // add event listener
        elem.addEventListener(action, handler.bind(elem));
    }
}

/**
 *  click handler attached to associated items to print thier entities
 *  @this_arg dom element provides context for the function
 */

function associatedClickhandler(this_arg) {
    printEntity(this.parentNode.dataset.entity, this.dataset.id);
}

/**
 *  click handler attached to view all buttons to print all entities of type
 *  @this_arg dom element provides context for the function
 */

function viewAllClickhandler(this_arg) {
    printAllEntity(this.dataset.entity);
}

/* ------------------- */
/* page initialisation */
/* ------------------- */

/**
 *  Self-calling initialisation function
 */

(async function init() {
    console.clear();

    // get all data and pass in a callback to print a film
    getAllData(printEntity.bind(null, "films", 1));
    // getAllData(printAllEntity.bind(null, "people"));
})();
