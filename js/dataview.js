

(function(){
    const DATAFILES = {
        areas: 'data/PermitsByAreaPoint.json',
        blocks: 'data/PermitsByBlockPoint.json',
        areaPolys: 'data/AreaPermitCount.geojson'
    },
    ATTRIBUTES = {
        areas: {
            "AreaNumber" : "Area Number",
            "TotalPermits2018": "2018 Total Permits",
            "TotalPermits2019": "2019 Total Permits",
            "RenterPermits2018": "2018 Renter Permits",
            "RenterPermits2019": "2019 Renter Permits",
            "OwnerPermits2018": "2018 Owner Permits",
            "OwnerPermits2019": "2019 Owner Permits"
        },
        blocks: {
            "addr": "Block Name",
            "AreaNumber": "Area Number",
            "TotalPermits2018": "2018 Total Permits", 
            "TotalPermits2019": "2019 Total Permits",
            "RenterPermits2018": "2018 Renter Permits",
            "RenterPermits2019": "2019 Renter Permits",
            "OwnerPermits2018": "2018 Owner Permits",
            "OwnerPermits2019": "2019 Owner Permits"
        }
    },
    ADDITIONATTRIBUTETEXT = 'Change In Sales',
    YEARS = ['2018', '2019'],
    COLORS = [
        "#AC1D2C",
        "#c1cacd",
        "#065D8C"
    ],
    SCALEFACTORS = {
        blocksnumber: 20,
        blockspercent: 1,
        areasnumber: 15,
        areaspercent: 18
    },
    CENTERVALUE = 0,
    LEGENDLABELS = [
        'Increase',
        'No Change',
        'Decrease'
    ],
    INITIALMAX = 0,
    INITIALMIN = 50000,
    PROPLEGENDWIDTH = 94,
    PROPLEGENDPADDING = 12,
    PROPTEXTPADDING = 3;

    let mapLayers = {
        areas: {},
        blocks: {},
        areaPolys: {}
    },
    currentMapLayer = 'areas',
    currentStat = 'number',
    currentAttribute = 'TotalPermits',
    minMaxRadius = {
        max: 0,
        mid: 0,
        min: 50000
    };


    window.onload = function() {
        getData();
    }


    showHideControls($(window).width())

    $(window).resize(function() {
        showHideControls($(window).width());
    });

    $('#TotalPermits').prop('checked', true);

    let map = L.map('map', {
        center: [43.074706, -89.384123],
        zoom: 14,
        minZoom: 12,
        maxBounds: [
            [43.002474, -89.630654],
            [43.185284, -89.185559]
        ]
    });
    
    map.zoomControl.setPosition('topright')

    let CartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // let Esri_WorldGrayCanvas = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    //     attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    //     maxZoom: 19
    // }).addTo(map);



    //disable propagation for control panels that overlay map
    let stopPropPanels = $('.stop-prop'); //object of panels with class
    stopPropagationOnPanels(stopPropPanels);

    ///////////////////////
    ////Event Listeners////
    ///////////////////////
    
    //Overlay controls
    $('.data-overlay').on('click', function(e) {
        updateMap(e.target.id);
    });

    $('.stat').on('click', function(e) {

        currentStat = e.target.id;

        updateSymbology(mapLayers[currentMapLayer]);
    });

    $('.attribute').on('click', function(e) {

        currentAttribute = e.target.id;

        updateSymbology(mapLayers[currentMapLayer]);
    });

    //map controls collapsed on smaller screens
    function showHideControls(windowWidth) {
        if (windowWidth <= 767) {
            $("#dataControl").collapse('hide');
            $("#legend").collapse('hide')

        }
        else {
            $("#dataControl").collapse('show');
            //$("#graph").collapse('show');
            $("#legend").collapse('show');
        }   
    }

    //stop map interaction below control panels
    //leaflet stop prop utility only applies to one element at a time
    function stopPropagationOnPanels(panelObject) {
        for (i=0; i < stopPropPanels.length; i++) {
            L.DomEvent.disableScrollPropagation(stopPropPanels[i]);
            L.DomEvent.disableClickPropagation(stopPropPanels[i]);
        }

    }


    function updateMap(elid) {
        //layer to add has name matching the id of the element that fired event
        let layerToAdd = mapLayers[elid];

        //remove the layer that is displayed on the map
        mapLayers[currentMapLayer].remove();
        currentMapLayer = elid;

        //update the symbology of the layer being added
        updateSymbology(layerToAdd);

        //add new layer to map
        layerToAdd.addTo(map);
        
        
    }

    function updateSymbology(layergroup) {

        //reset min max values
        minMaxRadius['max'] = INITIALMAX;
        minMaxRadius['min'] = INITIALMIN;

        layergroup.eachLayer(function(layer) {
            let featureValue = calculateDifference(layer.feature.properties);
            setMinMax(featureValue);
            layer.setStyle({
                radius: calculateRadius(featureValue),
                fillColor: colorScale(featureValue),
                fillOpacity: .5
            });
            layer.setPopupContent(buildPopup(layer.feature.properties,featureValue));
        });

        updatePropLegend();

    }

    //assign a color to a number based on globals
    function colorScale(featureValue) {

        return featureValue < CENTERVALUE ? COLORS[2] :
            featureValue > CENTERVALUE ? COLORS[0] :
            COLORS[1];

    }

    function calculateDifference(featprop) {
        let firstYear = isNull(featprop[currentAttribute+YEARS[0]]),
        secondYear = isNull(featprop[currentAttribute+YEARS[1]]);

        changeInSales = secondYear - firstYear;

        if(currentStat == 'percent') {
            //don't divide by 0
            let divisor = (firstYear == 0 ? 1 : firstYear);
            
            percentChange = changeInSales/divisor * 100

            return percentChange;
        }
        else if(currentStat == 'number') {
            return changeInSales;
        }
    }

    //replace null values in the data with 0
    function isNull(maybeNull) {
        return (maybeNull == null ? 0 : maybeNull)
    }

    function buildPopup (featureAttributes, calculatedValue) {
        let popupContent = '',
        popupAttributes = ATTRIBUTES[currentMapLayer];

        for (key in popupAttributes) {
            popupContent += '<strong>'+popupAttributes[key] + ': </strong>' + 
                isNull(featureAttributes[key])  + '<br>';
        }

        //append the change in values, accepting the issues with toFixed for display purposes
        popupContent += '<strong>' + ADDITIONATTRIBUTETEXT + ': </strong>' +
            (currentStat == 'percent' ? calculatedValue.toFixed() + '%' : calculatedValue);

        return popupContent;
    }

    //build proportional symbol legend
    function buildPropLegend() {

        let w = PROPLEGENDWIDTH,
        h = (minMaxRadius['max'] * 2) + (PROPLEGENDPADDING * 2),
        cx = (minMaxRadius['max']) + PROPLEGENDPADDING,
        textx = cx + (minMaxRadius['max']) + PROPTEXTPADDING;


        //create the svg to hold the legend circles
        let svg = '<svg id="symbol-legend" width="'+ w + 'px" height="'+ h +'px">' +
                '<style>' +
                    'circle {' +
                        'fill: #c1cacd;' +
                        'stroke: #343a40;' +
                        'stroke-width: 1;' +
                    '}' +
                    'text {' +
                        'font-size: 10px;' +
                        'fill:  white;' +
                    '}' +
                '</style>'

        //give each circle an id 
        //create text to sit next to the legend
        for (circle in minMaxRadius) {

            svg += '<circle class="legend-circle" id="' + circle + 
            '" cx=' + cx + '/>';

            svg += '<text id="' + circle + '-text" class="legend-text" x="'+ textx +'"></text>';
        };


        $('#propSymbolLegend').append(svg);

        updatePropLegend();
    }

    function updatePropLegend() {

        //attach the radius to each symbol
        setMid();
        //diameter plus both sides of padding
        let h = (minMaxRadius['max'] * 2) + (PROPLEGENDPADDING * 2),
        circleCenterx = parseFloat($('#max').attr("cx")),
        textx = circleCenterx + minMaxRadius['max'] + PROPTEXTPADDING;

        $('#symbol-legend').attr({
            height: h
        });

	    for (circle in minMaxRadius) {

            $('#'+circle).attr({
                //height of svg minus one side of padding minus circle radius aligns bottoms of circles
                cy: h - PROPLEGENDPADDING - minMaxRadius[circle],
                r: minMaxRadius[circle]
            });

            $('#'+circle+'-text').html(decalcRadius(minMaxRadius[circle]).toFixed()+formatPercent());

            $('#'+circle+'-text').attr({
                //height of svg minus one side of padding minus circle diameter aligns text to top of circle
                y: h - PROPLEGENDPADDING - (minMaxRadius[circle] * 2),
                x: textx,
                dy: function() {
                    //adjust text spacing if circles are too small for normal alignment
                    if(h < 50) {
                        return ((circle == 'mid') ? 5 : (circle == 'min') ? 10 : 0);
                    }
                    else {
                        return 0;
                    }
                }
            });

        }
    }

    function setMid() {
        minMaxRadius['mid'] = (minMaxRadius['max'] + minMaxRadius['min'])/2;
    }



    //build or update map legend
    function buildColorLegend() {

        //overwrite current html in legend
        $('#legendBlock').empty();

        for (let i = 0; i < COLORS.length; i++) {
            //color swatch
            let legendText = '<i style="background:' + COLORS[i] + '"></i> ' +
                LEGENDLABELS[i] +'<br>';

            $('#legendBlock').append(legendText);
            
        }
    }

    //adds percentage sign to text if necessary
    function formatPercent() {
        if (currentStat == 'percent') {
            return '%'
        }
        
        return ''
    }

    //highlight feature on click
    function highlightFeature(e) {
       let layer = e.target;
    
        layer.setStyle({
            weight: 5,
            color: 'white',
            fillOpacity: 0.7,
            stroke: true
        });
    
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }   

    function resetHighlight(e) {
        mapLayers[currentMapLayer].resetStyle(e.target);
    }

    function calculateRadius(featureValue) {
        let positiveValue = Math.abs(featureValue),
        removeZero = (positiveValue == 0 ? .5 : positiveValue),
        layerToBeSymbolized = currentMapLayer+currentStat,
        scaleFactor = SCALEFACTORS[layerToBeSymbolized];

        return Math.sqrt((removeZero * scaleFactor)/(Math.PI * .6 ));
    }

    function decalcRadius(radius) {
        let layerToBeSymbolized = currentMapLayer+currentStat,
        scaleFactor = SCALEFACTORS[layerToBeSymbolized];

       return (Math.pow(radius,2)*(Math.PI*.6))/scaleFactor
    }

    //min max of circles and dataset
    function setMinMax(featureValue) {
        let currentRadiusMax = minMaxRadius['max'],
        currentRadiusMin = minMaxRadius['min'],
        calculatedRadius = calculateRadius(featureValue);

        minMaxRadius['max'] = (calculatedRadius > currentRadiusMax ? calculatedRadius : currentRadiusMax);
        minMaxRadius['min'] = (calculatedRadius < currentRadiusMin ? calculatedRadius : currentRadiusMin);
    }

///////////////////////
///////Data Calls//////
///////////////////////

	//get the map data
	function getData() {
        

        //areaPolys
		$.ajax(DATAFILES["areaPolys"], {
			dataType: 'json',
			success: function(response) {
                //draw map features
				mapLayers["areaPolys"] = L.geoJson(response, {
					style: function (feature) {
						return {
                            fillOpacity: 0,
                            color: '#6e8187',
                            weight: .75
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        layer.bindTooltip('Area ' +feature.properties.AreaNumber, {
                           // permanent: true
                           sticky: true
                        }).openTooltip();
                    }
                }).addTo(map);

			}
        });

		//Areas
		$.ajax(DATAFILES["areas"], {
			dataType: 'json',
			success: function(response) {

                //local variables
                let featureValue=0 //to store calculated value from style function below

                //draw map features
				mapLayers["areas"] = L.geoJson(response, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng);
                    },
					style: function (feature) {
                        featureValue = calculateDifference(feature.properties);
                        setMinMax(featureValue);
						return {
                            fillColor: colorScale(featureValue),
                            fillOpacity: .5,
                            stroke: false,
                            radius: calculateRadius(featureValue)
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        layer.bindPopup(buildPopup(feature.properties, featureValue));
                        layer.on({
                            click: highlightFeature,
                            popupclose: resetHighlight
                        });
                    }
                }).addTo(map);
                
                buildPropLegend();
                buildColorLegend();
                //setChart(response.features);

			}
        });

        //Blocks
        $.ajax(DATAFILES["blocks"], {
			dataType: 'json',
			success: function(response) {
                let featureValue = 0;
				mapLayers["blocks"] = L.geoJson(response, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng);
                    },
                    style: function(feature) {  
                        featureValue = calculateDifference(feature.properties);
                        return {
                            fillColor: colorScale(featureValue),
                            fillOpacity: .5,
                            stroke: false,
                            radius: calculateRadius(featureValue)
                            //color: 'white'
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        layer.bindPopup('');
                        layer.on({
                            click: highlightFeature,
                            popupclose: resetHighlight
                        });
                    },
				});
			}
        });


    }


    })();
