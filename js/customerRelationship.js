$(window).load(function() {
    $('#loading').hide();
});
function resetChart(chartId) {
    var plottedCharts  =   dc.chartRegistry.list();
    for(chart in plottedCharts) {
        if(plottedCharts[chart].anchor() ===  '#'+chartId) {
            plottedCharts[chart].filterAll();
        }
    }
    dc.redrawAll();
}
function resetAll() {
    dc.filterAll();
    dc.renderAll();
}


function baseChart() {
    this.csvFileName        =   '';
    this.crossFilterDataSet =   '';
    this.chartTypes         =   new Array();
    this.setCsvFileName     =   function(csvFileName) {
        this.csvFileName    =   csvFileName;
    };
    this.getCsvFileName     =   function() {
        return this.csvFileName;
    };
    this.getCrossFilterDataSet   =   function() {
        return this.crossFilterDataSet;
    };
    this.errorMessage    =   function(errorMessage) {
        console.log(errorMessage);
    };
    this.resetAll      =   function() {
        this.generateChart(this.getCsvFileName());
        dc.filterAll();
    };   
    this.generateChart   =   function(csvFileName) {
        if(csvFileName !== '') {
            this.setCsvFileName(csvFileName);
            var baseChartObj    =   this;
            d3.csv(this.getCsvFileName(), function (csv) {
                baseChartObj.crossFilterDataSet =   crossfilter(csv);
                var mainChart               =	dc.geoChoroplethChart("#main-chart");
                var lineChartRelationStat   =   dc.lineChart("#line-chart-for-relation_status");
				
                var mainChartDimension	=	baseChartObj.crossFilterDataSet.dimension(function (d) {
                        return d["ADDR_ADDRESS_3"];
                });
                
                var geoProjection = d3.geo.stereographic().center([5.5, 57 ]).scale(5500)
                
                csv.forEach(function(d) {
					
					if(d.ACC_INCEP_DATE != 'NA') {
					
						d.dd = parseDate1(d.ACC_INCEP_DATE);                    
						d.month = d3.time.month(d.dd);
						
						if(d.RELATION_STATUS == 'The Relationship Ends')
						{
							d.rel_ends = parseDate1(d.ACC_INCEP_DATE);                    
							d.rel_ends_month = 1; //d3.time.month(d.rel_ends);
							d.rel_begin_month = 0;	
						}
						
						else if(d.RELATION_STATUS == 'The Relationship Begins')
						{
							d.rel_ends_month = 0;
							d.rel_begin = parseDate1(d.ACC_INCEP_DATE);                    
							d.rel_begin_month = 1; //d3.time.month(d.rel_begin);
						}
					}
                });


                runDimension     	      = baseChartObj.crossFilterDataSet.dimension(function(d) {
                    return d.month;
                });
                speedSumGroupRelEnd       = runDimension.group().reduceSum(function(d) {
                    return  d.rel_ends_month	;
                });

                speedSumGroupRelBegin     = runDimension.group().reduceSum(function(d) {
                    return  d.rel_begin_month;
                });
				

                var mainChartGroup = mainChartDimension.group().reduceCount(function(d) { return d.ADDR_ADDRESS_3; });
                d3.json("geo/ukjson.txt", function (statesJson) {
					
					
					
					var width = 450*80,
						height = 360*80;

					var projection = d3.geo.stereographic().center([10.0, 53 ])
						.scale(3000);
					//	.translate([width/2, height]);
					var path = d3.geo.path()
						.projection(projection);
	
					function zoomed() {
						projection
							.translate(d3.event.translate)
							.scale(d3.event.scale);
						svg.selectAll("path").attr("d", path);
						//mainChart.render();
					}

					var zoom = d3.behavior.zoom()
						.translate(projection.translate())
						.scale(projection.scale())
						.scaleExtent([height/160, 4100])
						.on("zoom", zoomed);

					var svg = d3.select("#main-chart")
						.attr("width", width)
						.attr("height", height)
						.call(zoom);
					svg.on("mousedown.zoom", null);
					svg.on("mousemove.zoom", null);
					svg.on("dblclick.zoom", null);
					svg.on("touchstart.zoom", null);
					//svg.on("wheel.zoom", null);
					//svg.on("mousewheel.zoom", null);
					svg.on("MozMousePixelScroll.zoom", null);
					
					mainChart
						.projection(projection)
						.width(width)
						.height(height)
						.transitionDuration(1000)
						.dimension(mainChartDimension)
						.group(mainChartGroup)
						.colors(d3.scale.quantize().range(["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#b30000", "#7f0000"]))
						.colorDomain([0, 200])
						.colorCalculator(function (d) { return d ? mainChart.colors()(d) : '#ccc'; })
						.overlayGeoJson(statesJson.features, "state", function (d) {
								return d.properties.NAME2;
						})
						.title(function (d) {
								return "City: "+d.key+"\nTotal Sales: " + (d.value ? d.value : 0);
						})
						.label(function (d) {
								return d.key;
						})
						.renderLabel(true)
						//.projection(geoProjection)
						;
                     mainChart.render();
					
                    for (chartType in baseChartObj.chartTypes) {
                        switch(baseChartObj.chartTypes[chartType].type) {
                            case 'pieChart':
                                var pieChart    =   dc.pieChart('#'+baseChartObj.chartTypes[chartType].htmlId);
                                var pieChartDimension	=	baseChartObj.crossFilterDataSet.dimension(function (d) {
                                        var dimensionColumn =   baseChartObj.chartTypes[chartType].dimensionColumn;
                                        return d[dimensionColumn];
                                });
                                var pieChartGroup	=	pieChartDimension.group().reduceCount(function(d) {
                                        var groupColumn =   baseChartObj.chartTypes[chartType].dimensionColumn;
                                        return d[groupColumn];
                                });
                                var colorScale = d3.scale.ordinal().range(baseChartObj.chartTypes[chartType].colors);
                                pieChart
                                    .width(baseChartObj.chartTypes[chartType].width)
                                    .height(baseChartObj.chartTypes[chartType].height)
                                    .slicesCap(baseChartObj.chartTypes[chartType].slicesCap)
                                    .radius(baseChartObj.chartTypes[chartType].radius)
                                    .innerRadius(baseChartObj.chartTypes[chartType].innerRadius)
                                    .dimension(pieChartDimension)
                                    .group(pieChartGroup)
                                    .legend(baseChartObj.chartTypes[chartType].legend)
                                    .colors(colorScale)
                                    .othersLabel(baseChartObj.chartTypes[chartType].othersLabel)
                                    .title(function(d){
                                        return d.key+": "+d.value;
                                    })
                                    .label(function(d){
                                        return parseFloat(((d.value/pieChartDimension.top(Number.POSITIVE_INFINITY).length) * 100)).toFixed(2)+"%";
                                    })
                                    .minAngleForLabel(baseChartObj.chartTypes[chartType].minAngleForLabel)
                                    .on("filtered", function(chart){
                                        if(chart.hasFilter()) {
                                            console.log(chart.filters());
                                            var CurentFilters    =   chart.filters().join();
                                            $(chart.anchor()+'-reset-link').show();
                                        }
                                        else {
                                            $(chart.anchor()+'-current-filters').hide();
                                            $(chart.anchor()+'-reset-link').hide();
                                            $(chart.anchor()+'-current-filters').html("");
                                        }
                                    })
									.renderlet(function (chart) {
										chart.select("g").attr("transform", "translate(135, 150)");
									});
                               pieChart.render();
                        }   
                    }
                    
					var minDate = new Date("07/01/2009");
                    var maxDate = new Date("06/30/2010");   
                    lineChartRelationStat
                      .width(document.getElementById('line-chart-for-relation_status').offsetWidth)
                      .height(300)
					  .elasticY(true)
                      .x(d3.time.scale().domain([minDate,maxDate]))
                      .interpolate('step-before')
                      .renderArea(true)
                      .brushOn(true)
                      .mouseZoomable(true)
                      .renderDataPoints(true)
                      .clipPadding(10)
                      .yAxisLabel("No. of Relationship Started/Ended")
                      .renderHorizontalGridLines(true)
                      .renderVerticalGridLines(true)
                      .transitionDuration(750)
                      .margins({top: 30, right: 50, bottom: 25, left: 52})
                      .legend(dc.legend().x(document.getElementById('line-chart-for-relation_status').offsetWidth-170).y(20).itemHeight(13).gap(5))
                      .dimension(runDimension)
					  .group(speedSumGroupRelBegin, 'Relationships Begin yearly')
                      .stack(speedSumGroupRelEnd, 'Relationships Ended yearly')
                      .xAxis();
					  
					lineChartRelationStat.render();
					
					window.onresize = function(event) {
					  var newWidth = document.getElementById('line-chart-for-relation_status').offsetWidth;
					  lineChartRelationStat.width(newWidth)
										   .transitionDuration(0)
										   .legend(dc.legend().x(document.getElementById('line-chart-for-relation_status').offsetWidth-170).y(20).itemHeight(13).gap(5));
					  lineChartRelationStat.render();
					  //dc.renderAll();
					  lineChartRelationStat.transitionDuration(750);;
					};
					
//////////////////////////////////////////////////////////////////////////////////////					
				/* Styling tooltips */
					var w = 800;      
					$('svg g').tipsy({ 
					gravity: 'w', 
					html: true, 
					title: $(this).children("title").html()
					});
//////////////////////////////////////////////////////////////////////////////////////
					 
					

                });
            });
            return true;
        }
        else {
            this.errorMessage('Error reading CSV file.');
            return false;
        }
    };
    this.addNewChart    =   function(chartObj) {
        this.chartTypes.push(chartObj);
    };
}


var chart   =   new baseChart();
var pieChartForAcclGact   =   {
    type: 'pieChart',
    htmlId: 'pie-chart-for-acc_gact_type',
    width: 275,
    height: 360,
    slicesCap: 3,
    radius: 120,
	innerRadius: 0, // Inner radius should be 0 for normal pie chart 
    legend: dc.legend().x(5).y(278).itemHeight(20).gap(10).horizontal(true),
    dimensionColumn: 'ACCL_GACT_TYPE',
    groupColumn: 'ACCL_GACT_TYPE',
    colors: ["#007ACC", "#0099FF", "#33ADFF", "#66C2FF", "#99D6FF", "#CCEBFF"],
    minAngleForLabel: 0,
    othersLabel: 'Others'
};

chart.addNewChart(pieChartForAcclGact);

//chart.addNewChart(pieChartForAccountStatus);
chart.generateChart('csv/SBPOCUK_R8_Dataset.csv');

    

