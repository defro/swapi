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

    var this_entity = this;

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
        var swapi = getFromSession("swapi");

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

                if (swapi[entity].hasOwnProperty(id)) {
                    value = swapi[entity][id].name;
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
                    .then(this.populateDataItem.bind(this_entity, type, id));
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

    this.populateDataItem = function(type, id, data) {
        // instantiate this entity
        var entity = getEntityFromSession(type, id);

        var selector =
            '.associated[data-entity="' + type + '"] [data-id="' + id + '"]';
        var elem = document.querySelectorAll(selector)[0];

        // change the content to the entity's name
        elem.innerHTML =
            '<span class="value">' +
            // ensure we're using the correct heading field
            data[entity.heading_field] +
            "</span>" +
            '<span class="view"><button class="view_entity">view</button></span>';
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