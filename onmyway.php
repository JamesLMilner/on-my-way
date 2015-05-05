<?php

    error_reporting(E_ALL);
    ini_set("display_errors", 1);

    function getData() {
        //The Twilio PHP Library
        require('twilio/Twilio.php'); 

        //Set auth variables
        require('auth.php');
        
        
        //Get postcode and phone number
        $userX = (string)$_GET["userX"];
        $userY = (string)$_GET["userY"];
        $postCode = (string)$_GET["postCode"];
        $phoneNum = (string)$_GET["phoneNum"];
        $mode = (string)$_GET["mode"];
        
        $invalidNumbers = array("999", "911", "+999", "+911"); //etc
        
        // Check that they're all valid
        if ($userX && $userY && $postCode && $phoneNum && $mode && in_array($phoneNum, $invalidNumbers) == false) {

            // Generate a ArcGIS REST request string
            $appId = "?client_id=" . $arcgisAppId;
            $appSecret = "&client_secret=" . $arcgisAppSecret;
            $expiration = "&expiration=1440";
            $grantType = "&grant_type=client_credentials";
            $format = "&f=json";
            $tokenUrl = 'https://www.arcgis.com/sharing/rest/oauth2/token/';

            //Final url
            $url = $tokenUrl . $appId . $appSecret . $grantType . $expiration . $format;

            function request($request_url) {
                // Get cURL resource
                $curl = curl_init();
                // Set some options - we are passing in a useragent too here
                curl_setopt_array($curl, array(
                    CURLOPT_RETURNTRANSFER => 1,
                    CURLOPT_URL => $request_url,
                    CURLOPT_FAILONERROR => 1
                ));
                // Send the request & save response to $resp
                $resp = curl_exec($curl);
                $json = json_decode($resp); // true == associative array
                // Close request to clear up some resources
                curl_close($curl);

                return $json;
            }

            $token = request($url);
            //echo $token;
            $access_token = $token->access_token;
            $tokenUrl = "&token=" . $access_token;

            //$postCode = "BA2 4QP";
            $geocodeURL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?text=" . urlencode($postCode) . "&f=json";
            $geocode_resp = request($geocodeURL);

            $x = (string)$geocode_resp->locations[0]->feature->geometry->x; // true sets return as variable
            $y = (string)$geocode_resp->locations[0]->feature->geometry->y;

            $stops = "?stops=" . $x . "," . $y . ";" . $userX . "," . $userY;
            $walkTime = "&directionsTimeAttributeName=WalkTime";
            $walkRouteURL= "http://route.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve" . $stops . $tokenUrl . $walkTime . "&f=json";
            $driveRouteURL = "http://route.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve" . $stops . $tokenUrl . "&f=json";
            
            // Create blank strings
            $routeWalkTime = "";
            $routeDriveTime = "";
            $messageText = "";
            $routePolyline = "";

            if ($mode == "walking") {
                $walkRoute = request($walkRouteURL);
                $routeWalkTime = (string)$walkRoute->directions[0]->summary->totalTime;
                $routeLength = (string)$walkRoute->directions[0]->summary->totalLength; //Length in KM
                $messageText = "Your friend is on their way, they are walking and currently " . round($routeLength, 0, PHP_ROUND_HALF_UP) .
                                "km away (along the route network). They will be with you in about " . round($routeWalkTime, 0, PHP_ROUND_HALF_UP) .
                                " minutes.";
                $routePolyline = json_encode($walkRoute->routes->features[0]->geometry->paths);
            }

            if ($mode == "driving") {
                $driveRoute = request($driveRouteURL);
                $routeDriveTime = (string)$driveRoute->directions[0]->summary->totalTime;
                $routeLength = (string)$driveRoute->directions[0]->summary->totalLength; //Length in KM
                $roundedDriveTime = round($routeDriveTime, 0, PHP_ROUND_HALF_UP);  
                $messageText = "Your friend is on their way, they are driving and currently " . round($routeLength, 0, PHP_ROUND_HALF_UP) . 
                                "km away (along the route network). They will be with you in about " . round($routeDriveTime, 0, PHP_ROUND_HALF_UP) .
                                " minutes.";
                $routePolyline = json_encode($driveRoute->routes->features[0]->geometry->paths);
                
            }

            $returnData = '{ "routeLength" : "' . $routeLength . 
                          '", "routeWalkTime" :"' . $routeWalkTime .
                          '", "routeDriveTime" : "' .  $routeDriveTime . 
                          '", "routePolyline" : "' . $routePolyline . 
                          '"}';

            // TWILIO CODE --------------
            // Send text message to your friend
            if ($messageText != "" && intval($routeLength) != 0) {
                
                $sid =  $twilioSid; // Your Account SID from www.twilio.com/user/account
                $token = $twilioToken; // Your Auth Token from www.twilio.com/user/account
                $client = new Services_Twilio($sid, $token);

                $message = $client->account->messages->sendMessage(
                  '447903577809', // From a valid Twilio number
                  $phoneNum, // Text this number!
                  $messageText // The final message to send
                );
            }
        }
        
        return $returnData;
    }

    echo getData(); 
       
?>