var cities = [];

var cityFormEl=document.querySelector("#city-search-form");
var cityInputEl=document.querySelector("#city");
var weatherContainerEl=document.querySelector("#current-weather-container");
var citySearchInputEl = document.querySelector("#searched-city");
var forecastTitle = document.querySelector("#forecast");
var forecastContainerEl = document.querySelector("#fiveday-container");
var pastSearchButtonEl = document.querySelector("#past-search-buttons");

var formSumbitHandler = function(event){
    event.preventDefault();
    var city = cityInputEl.value.trim();
    if(city){
        getCityWeather(city);
        get5Day(city);
        cities.unshift({city});
        cityInputEl.value = "";
    } else{
        alert("Please enter a City");
    }
    saveSearch();
    pastSearch(city);
}

var saveSearch = function(){
    localStorage.setItem("cities", JSON.stringify(cities));
};

var getCityWeather = function(city) {
    var apiKey = 'f6698c6bc3e491ae5c183fe57e2a6522';
    var apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`
    
    fetch(apiUrl)
    .then(function(response){
        response.json().then(function(data){
            displayWeather(data, city);
        });
    });
};




//using saved city name, get 5 day forecasr get request from weather api

//parse response to display forecast for next 5 days current conditions




//save users search requests and display them underneath search form

//on page load automatically grab and pull last city search and display 5 day forecast