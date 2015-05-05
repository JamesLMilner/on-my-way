            
    // Hovering
    function hoverButtons() {
        $(".go").hover( 
            function() {
                var currentFontSize = parseInt( $(this).css("font-size") );
                $(this).css("font-size", currentFontSize + 2);
                $(this).css("background-color", "rgba(192, 124, 124, 0.42)");
            },
            function() {
                var exitFontSize = parseInt( $(this).css("font-size") ) - 2;
                $(this).css("font-size", exitFontSize);
                $(this).css("background-color", "rgba(200, 200, 200, 0.42)");
            }
        );
    }
    hoverButtons();

    // Click on one of the buttons; driving or walking
    $(".go").click(function(event) {

        event.preventDefault(); 
        var mode = checkMode(this.value);
        var postCode = $("#postCode")[0].value;
        var phoneNum = $("#phoneNum")[0].value;
        if (postCode && phoneNum) {

            // HTML5 geolocation is an asynchronous task
            if (Modernizr.geolocation) {
                console.log("Geolocation enabled");
                navigator.geolocation.getCurrentPosition(function(position) {
                    var userX = String(position.coords.longitude);
                    var userY = String(position.coords.latitude);
                    waiting();
                    $.ajax({
                        method: "get",
                        url: "onmyway.php",
                        dataType: "json",
                        data: {
                            userX: userX,
                            userY: userY,
                            postCode: postCode,
                            phoneNum: phoneNum,
                            mode: mode
                            },
                        success: function(data) {
                            console.log(data);
                            if (data.routePolyline != "" && data.routeLength != "") {
                
                                var eta;
                                var routeLength = parseFloat(data.routeLength).toFixed(2);
                                var routeWalkTime = parseFloat(data.routeWalkTime).toFixed(0);
                                var routeDriveTime = parseFloat(data.routeDriveTime).toFixed(0);
                                var routePolyline = $.parseJSON(data.routePolyline);

                                var text = "<h1 class='sent'>Message sent to " + phoneNum + "!</h1><p class='usermessage'> You are <b>" + 
                                            routeLength + "km </b> away from your friend, and you are ";

                                if (mode == "walking") {
                                    //Create date object and add the difference
                                    eta =  new Date(new Date().getTime() + routeWalkTime*60000);
                                    text += "<b>walking</b> so it should take you about <b>" +  convertToHours(routeWalkTime);
                                }
                                if (mode == "driving") {
                                    //Create date object and add the difference
                                    eta = new Date(new Date().getTime() + routeDriveTime*60000);
                                    text += "<b>driving</b> so it should take you about <b>" + convertToHours(routeDriveTime);
                                }
                                
                                var goAgain = '<form id="sendform"><input class="go" id="send" type=button value="Send Another!" onClick="history.go()"></form>'
                                text += " </b> You should arrive around <b>" + eta.toLocaleTimeString() + "</b>. " + goAgain +
                                        "<div id='map'></div> ";
                                console.log(text);
                                $("#userinput").html(text);
                                generateMap(userX, userY, routePolyline);
                            }
                            else {
                                throwError();
                            }
                            finished();
                        },
                        error: function(error) {
                            console.log("There was an error! ", error);
                            throwError();
                            finished();
                        }
                    }); //End of Ajax 
                }); // End of geolocation
            } // End of Modnizr check 
            
            else {
                console.log("No geolocation detected in browser");
                $("#userinput").html("<h1 class='sent'> Your browser doesn't support geolocation! </h1>");
            }
            
        } // End of check for postcode and number

        function throwError() {
            var refreshButton = '<form><input class="go" id="retry" type=button value="Retry!" onClick="history.go()"></form>'
            $("#userinput").html("<h1 class='sent'> Sorry there was an error! </h1><br>" + refreshButton);
        }
        
        // Change cursor to waiting; trying to find route
        function waiting() {
            $("body, .content, input, .go, input__label-content").css("cursor", "wait");
        }

        // Change cursor to normal; finished trying to find route, or error thrown
        function finished() {
            $("body, .content, input, .go, input__label-content").css("cursor", "auto");
            hoverButtons();
        }

        // Check the mode of transport clicked
        function checkMode(value) {
            if(value === "Walking!") { 
                return "walking"
            }
            else {
                return "driving"
            }
        }
        
        // Convert raw minutes into hours and hinutes
        function convertToHours(minutes) {
            var hours = Math.floor( minutes / 60);          
            var mins = minutes % 60;
            if (hours == 0) {
                return String(minutes) + " minutes.";
            }
            else {
                return hours + " hours and " + mins + " minutes.";
            }
        }

        function generateMap(lon, lat, routeObject) {
             require([  
             "esri/map",
             "esri/geometry/Polyline",
             "esri/Color",
             "esri/symbols/SimpleLineSymbol",
             "esri/graphic",
             "dojo/domReady!"

             ],   
             function(Map, Polyline, Color, SimpleLineSymbol, Graphic) {  

                 var routeMap = new Map("map", {  
                    basemap: "topo",
                    center: [lon, lat], //sada longitude, latitude  
                    zoom: 10  
                 }); 

                 routeMap.on("load", function() {
                     var route = { "paths": routeObject , "spatialReference": {"wkid":4326} }; 
                     var routeGeometry = new Polyline(route);
                     var routeSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_LONGDASH, new Color([240,20,20]), 3);
                     var routeGraphic = new Graphic(routeGeometry, routeSymbol);
                     routeMap.graphics.add(routeGraphic);
                 });

            }); // End of esri require block
        } // End of generateMap
    }); // End of go click