// top level Entity constructor
function Entity(
    data,
    arr_data_fields,
    arr_associated_fields,
    heading_field,
    type
) {
    this.arr_data_fields = arr_data_fields;
    this.arr_associated_fields = arr_associated_fields;
    this.type = type;

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

            // if for some reason we had a property for this but no data,
            // get rid of that property
            if (!this.associated[type].length) {
                delete this.associated[type];
            }
        }
    }

    /**
     *  Print this entity's data items to the page
     */

    this.printData = function() {
        var html = `<div class="section_container" data-entity="${this.type}">`;
        html += `<div class="heading"><div class="title"><h2>${
            this.data[this.heading_field]
        }</h2></div>`;
        html += `<div class="action"><button class="btn view_all" data-entity="${
            this.type
        }">View all ${this.type}</button></div></div>`;
        html += `<table><tbody>`;

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
        for (var type in this.associated) {
            html += printAssociatedEntities(type, this.associated[type]);
        }

        // add built html to the DOM
        document.getElementById("associated").innerHTML = html;

        addEventListeners(
            ".associated .data_item",
            "click",
            associatedClickhandler
        );

        addEventListeners(".view_all", "click", viewAllClickhandler);
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
        heading_field,
        "people"
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
        heading_field,
        "starships"
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
        heading_field,
        "films"
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
        heading_field,
        "planets"
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
        heading_field,
        "species"
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
        heading_field,
        "vehicles"
    );
}
