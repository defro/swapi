# SWAPI App

## Intro

Small pure js app which makes use of the Star Wars API. See it in action at [sauntimo.github.io/swapi](https://sauntimo.github.io/swapi).

The idea for this app was to use pure js and no libraries or tools whatsoever to build a small app to explore data from the Star Wars API (SWAPI) at [swapi.co](https://swapi.co).

## Planning

Initially I had planned to only request data which was required for a page, so starting with a single entity (eg a film in the series), the app would request data for each associated entity, that is, one request for each character or planet etc. However, when I discovered that I could make bulk requests for up to 10 entities, it made more sense to load all the data on launch, hence the small loading bar while that happens.

Because requests for data save retrieved data on the window object, subsequent requests check to see if data is available locally before making another request which might not be required. This meant that I could drop in a function to load all the data on start fairly easily, without having to amend the rest of the code.

## Inheritance

All of the entities available from the API (people, vehicles, films etc) are instantiated as javascript objects which each inherit from a main object. This provides access to common methods such as those use to build and output markup. The constructors determine which returned data properties are data purely relating to that entity and which properties associate that entity with another.

## Styling

Although the styling is fairly basic (not even bootstrap...) the app should be fairly responsive. In the future I'd like to make better use of larger screens.

## Issues and Future Development

Please see [issues](https://github.com/sauntimo/swapi/issues).
