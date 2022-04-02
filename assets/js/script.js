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

var displayWeather = function(){
    //clear old content
    //create date element
    //create an image element
    //create span element to hold temps
    //create span element to hold humidity
    //create span element to hold wind
    //append each new element to container temp
    //append each new element to container humid
    //append each new element to container wind
}


//using saved city name, get 5 day forecasr get request from weather api
var get5Day = function() {

}
var display5Day = function() {

}

var pastSearch = function(){
 //create element to display past search cities
}


var pastSearchHandler = function(){
    //city weather
    //5day forecast
}


//button listeners