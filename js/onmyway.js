
    require([
        "esri/map",
        "esri/geometry/Polyline",
        "esri/Color",
        "esri/symbols/SimpleLineSymbol",
        "esri/graphic",
        "dojo/on",
        "dojo/query",
        "dojo/request",
        "dojo/dom",
        "dojo/dom-style",
        "dojo/touch",
        "dojo/_base/lang",
        "dojo/json",
        "dojo/text!/demos/on-my-way/result.html", // Replace as necessary
        "dojo/domReady!"
    ],
    function(
        Map, Polyline, Color, SimpleLineSymbol, Graphic,
        on, query, request, dom, domStyle, touch, lang, JSON, result
    ) {

        // Setup button effects and click events
        buttonSetup();

        function buttonSetup() {
            query(".go").on( touch.enter, function(e){
                domStyle.set(this, "font-size", +domStyle.get(this, "font-size") + 2);
                domStyle.set(this, "background-color", "rgba(192, 124, 124, 0.42)");
            });
            query(".go").on( touch.leave, function(e){
                domStyle.set(this, "font-size", +domStyle.get(this, "font-size") - 2);
                domStyle.set(this, "background-color", "rgba(200, 200, 200, 0.42)");
            });
            // On press driving or walking
            query(".go").on(touch.press, function(event){
                event.preventDefault();
                var travelMode = this.value === "Walking!" ? "walking" : "driving";
                var postCode = dom.byId("postCode").value;
                var phoneNum = dom.byId("phoneNum").value;

                // Check that postcode phone number and geolocation enabled
                if (postCode && phoneNum) {
                    sendRequest(travelMode, postCode, phoneNum);
                }
                if (!navigator.geolocation) {
                   geolocationError();
                }
            }); // End of go click
        }

        function sendRequest(travelMode, postCode, phoneNum) {
            navigator.geolocation.getCurrentPosition( function(position) {
                waiting();
                var userX = String(position.coords.longitude);
                var userY = String(position.coords.latitude);
                request.post("onmyway.php", {
                    handleAs: "json",
                    data: {
                       userX: userX,
                       userY: userY,
                       postCode: postCode,
                       phoneNum: phoneNum,
                       mode: travelMode
                    }
                }).then( function(data) {

                    // GREAT SUCCESS
                    if (data.routePolyline && data.routeLength) {

                        var routeLength = toDecimal(data.routeLength, 2);
                        var routeWalkTime = toDecimal(data.routeWalkTime, 0);
                        var routeDriveTime = toDecimal(data.routeDriveTime, 0);
                        var routePolyline = JSON.parse(data.routePolyline);
                        var eta = getEta(routeWalkTime, routeDriveTime, travelMode);
                        var travelTime = getTravelTime(routeWalkTime, routeDriveTime, travelMode);
                        var templateVars = {
                                            phoneNum : phoneNum,
                                            routeLength: routeLength,
                                            travelMode: travelMode,
                                            travelTime: travelTime,
                                            eta: eta
                                            };
                        dom.byId("userinput").innerHTML = lang.replace( result, templateVars ); // Located in our result.html file
                        generateMap("map", userX, userY, routePolyline);

                    }
                    else {
                        throwError();
                    }
                    finished();
                },
                function(error) {
                    // ERROR
                    console.log("There was a server side  error! ", error);
                    backendError();
                    finished();
                }); //End of Ajax
            },
            function (error) {
                console.log("Geolocation error", error);
                geolocationError();
            }); // End of geolocation callbacks
        }

        // Take string and turn to float with x decimal places
        function toDecimal(str, to) {
            return parseFloat(str).toFixed(to);
        }

        // Return travel time depending on walking or driving
        function getTravelTime(routeWalkTime, routeDriveTime, travelMode) {
            return (travelMode  === "walking") ? convertToHours(routeWalkTime) : convertToHours(routeDriveTime);
        }

        // Return expected time of arrival
        function getEta(routeWalkTime, routeDriveTime, travelMode) {
            function eta(travelTime) {
                // Add travel to current time
                return new Date( new Date().getTime() + travelTime * 60000 );
            }
            return (travelMode === "walking") ? eta(routeWalkTime) : eta(routeDriveTime);
        }

        // Display an error to the user if browser doesn't support geolocation / it's declined
        function geolocationError() {
            var error = "<h1 class='sent'> Your browser doesn't support geolocation or it was declined! </h1>";
            dom.byId("userinput").innerHTML = error;
        }

        // Display an error to the user if there was an issue with the request
        function backendError() {
           var refreshButton = '<form><input class="go" id="retry" type=button value="Retry!" onClick="history.go()"></form>';
           dom.byId("userinput").innerHTML = "<h1 class='sent'> Sorry there was an error! </h1><br>" + refreshButton ;
        }

        // Change cursor to waiting; trying to find route
        function waiting() {
            domStyle.set( query("body, .content, input, .go, input-label-content"), "cursor", "wait" );
        }

        // Change cursor to normal; finished trying to find route, or error thrown
        function finished() {
            domStyle.set( query("body, .content, input, .go, input-label-content"), "cursor", "auto" );
            buttonEffects();
        }

        // Convert raw minutes into hours and hinutes
        function convertToHours(minutes) {
            var hours = Math.floor( minutes / 60);
            var mins = minutes % 60;
            if (hours === 0) {
                return String(minutes) + " minutes.";
            }
            else {
                return hours + " hours and " + mins + " minutes.";
            }
        }

       // Generate the map on success
       function generateMap(mapId, lon, lat, routeObject) {

           var routeMap = new Map(mapId, {
              basemap: "topo",
              center: [lon, lat], //sada longitude, latitude
              zoom: 10
           });

           // Once the map has loaded add our route onto it.
           routeMap.on("load", function() {
               var route = { "paths": routeObject , "spatialReference": {"wkid":4326} };
               var routeGeometry = new Polyline(route); // Take the route and generate Polyline
               var routeSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_LONGDASH, new Color([240,20,20]), 3);
               var routeGraphic = new Graphic(routeGeometry, routeSymbol); // Create route graphic
               routeMap.graphics.add(routeGraphic); // Add route to map
           });

      } // End of generateMap

}); // End of require block
