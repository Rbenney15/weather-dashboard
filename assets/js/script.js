
var inputEl = document.getElementById("city-input");
var searchEl = document.getElementById("search-button");
var clearEl = document.getElementById("clear-history");
var nameEl = document.getElementById("city-name");
var currentPicEl = document.getElementById("current-pic");
var currentTempEl = document.getElementById("temperature");
var currentHumidityEl = document.getElementById("humidity");
var currentWindEl = document.getElementById("wind-speed");
var currentUVEl = document.getElementById("UV-index");
var historyEl = document.getElementById("history");
var searchHistory = JSON.parse(localStorage.getItem("search")) || [];
console.log(searchHistory);

//when search button is clicked, locate city name typed by user
function getWeather(cityName) {
    var queryUrl = "" + cityName + "" + APIKey;
     
}


//execute get weather function to gather 5 day forcast

//parse response to display current conditions

//using saved city name, get 5 day forecasr get request from weather api

//parse response to display forecast for next 5 days current conditions




//save users search requests and display them underneath search form

//on page load automatically grab and pull last city search and display 5 day forecast