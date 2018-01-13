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
                
                var mainChart                       = dc.geoChoroplethChart("#lcp-main-chart");
                var lcpRowChartProductType          = dc.rowChart("#lcp-row-chart-for-product-type");
                var lcpBalanceOutstandingTimeline   = dc.lineChart("#lcp-balance-outstanding-timeline");
                var lcpAccOpenDateLineChart         = dc.lineChart("#lcp-account-opening-date-linechart");
                var dataTable                       = dc.dataTable("#data-table");
                
                var mainChartDimension	=	baseChartObj.crossFilterDataSet.dimension(function (d) {
                        return d["ADDR_ADDRESS_3"];
                });
                var mainChartGroup = mainChartDimension.group().reduceCount(function(d) { return d.ADDR_ADDRESS_3; });
                var geoProjection = d3.geo.stereographic().center([-1.5, 57 ]).scale(6500)
                              
                csv.forEach(function(d) {
                    d.predictedDate = parseDateFormatwithTimeStamp1(d.PRED_DATE);
                    d.accountOpenDate = parseDate(d.ACC_INCEP_DATE);
                    d.monthlyAccountOpen= d3.time.month(d.accountOpenDate);
                 });
                
                lcpPredictedDateDim     = baseChartObj.crossFilterDataSet.dimension(function(d) {return d.predictedDate;});
                lcpBalanceOutstandingGroupDim = lcpPredictedDateDim.group().reduceSum(function(d) {return d.ACC_BALANCE_OS;});
                
                lcpRunDimensionProductType  = baseChartObj.crossFilterDataSet.dimension(function(d) { return  d.PRODTYPEDESC;});
                lcpSpeedSumGroupProductType  = lcpRunDimensionProductType.group();
                
                lcpAccountOpeningDateDim = baseChartObj.crossFilterDataSet.dimension(function(d) { return d.monthlyAccountOpen; });
                lcpAccountOpeningDateGroupDim = lcpAccountOpeningDateDim.group().reduceCount(function(d) { return d.ID;});
                
                d3.json("geo/ukjson.txt", function (statesJson) {
                        mainChart.width(780)
                            .height(754)
                            .dimension(mainChartDimension)
                            .group(mainChartGroup)
                            .colors(d3.scale.quantize().range(["#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5","#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF"]))
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
                            .projection(geoProjection)
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
                                    .innerRadius(baseChartObj.chartTypes[chartType].innerRadius)
                                    .dimension(pieChartDimension)
                                    .group(pieChartGroup)
                                    .legend(baseChartObj.chartTypes[chartType].legend)
                                    .colors(colorScale)
                                    //.colors(d3.scale.category20c())
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
                                            //$(chart.anchor()+'-current-filters').show();
                                            $(chart.anchor()+'-reset-link').show();
                                            //$(chart.anchor()+'-current-filters').html("Current Filters: "+CurentFilters.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
                                        }
                                        else {
                                            $(chart.anchor()+'-current-filters').hide();
                                            $(chart.anchor()+'-reset-link').hide();
                                            $(chart.anchor()+'-current-filters').html("");
                                        }
                                    });
                               pieChart.render();
                        }   
                    }
                    
                    lcpRowChartProductType.width(780)
                        .height(400)
                        .margins({top: 20, left: 10, right: 10, bottom: 20})
                        .group(lcpSpeedSumGroupProductType)
                        .dimension(lcpRunDimensionProductType)
                        .colors(d3.scale.ordinal().range(["#66C2FF"]))
                        .gap(7)
                        .xAxis().ticks(4);

                    lcpRowChartProductType.render();
                    
                    var minDateAccountOpenDate = new Date("01/01/1973");
                    var maxDateAccountOpenDate = new Date("12/31/2015");  
                    
                    lcpAccOpenDateLineChart
                      .width(780)
                      .height(300)
                      .x(d3.time.scale().domain([minDateAccountOpenDate,maxDateAccountOpenDate]))
                      .interpolate('step-before')
                      .renderArea(true)
                      .brushOn(true)
                      .mouseZoomable(true)
                      .renderDataPoints(true)
                      .clipPadding(10)
                      .yAxisLabel("No. of Accounts Opened")
                      .renderHorizontalGridLines(true)
                      .renderVerticalGridLines(true)
                      .transitionDuration(1000)
                      .margins({top: 30, right: 50, bottom: 25, left: 40})
                      .legend(dc.legend().x(750).y(20).itemHeight(13).gap(5))
                      .dimension(lcpAccountOpeningDateDim)
                      .group(lcpAccountOpeningDateGroupDim, 'Accounts opened yearly')
                      .xAxis();

                    lcpAccOpenDateLineChart.render();
                    
                    
                    var minDatePredDate = new Date("01/01/2007");
                    var maxDatePredDate = new Date("12/31/2014");
                    
                     lcpBalanceOutstandingTimeline
                	.width(780)
                        .height(400)
                        .renderArea(true)
                        .interpolate('step-before')
                        .mouseZoomable(true)
                        .renderDataPoints(true)
                        .dimension(lcpPredictedDateDim)
                        .x(d3.time.scale().domain([minDatePredDate,maxDatePredDate]))
                        .renderHorizontalGridLines(true)
                        .renderVerticalGridLines(true)
                        .clipPadding(10)
                        .margins({top: 30, right: 50, bottom: 25, left: 70})                        
                        .brushOn(true)
                        .yAxisLabel("Balance Outstanding")                   
                        .renderArea(true)
                        .group(lcpBalanceOutstandingGroupDim)
                        .xAxis();
                
                    lcpBalanceOutstandingTimeline.render();
                  
                    dataTable.width(1000)
                            .height(1000)                            
                            .dimension(mainChartDimension)
                            .group(function (d) {                                
                                return "Data Snapshot";
                            })
                            .size(5000)
                            .columns([
                              'ACC_ACCOUNT_NO',
                              'ADDR_ADDRESS_3',    // d['date'], ie, a field accessor; capitalized automatically
                              'ACC_SUBACC_NO',
                              'ACC_BALANCE_OS',
                              'PRODTYPEDESC',
                              'NO_CUST',
                              'AGE_GROUP',
                              'INCOME_GROUP',
                              'ACC_INCEP_DATE',
                              'PRED_DATE'
                              
                            ])
                            .sortBy(function (d) {
                                  return +d.predictedDate;
                            })
                            .order(d3.ascending)
                            .renderlet(function (table) {
                                 table.selectAll('.dc-table-group').classed('info', true);
                            });
                            
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



var pieChartForAgeGroup   =   {
    type: 'pieChart',
    htmlId: 'lcp-pie-chart-for-age-group',
    width: 300,
    height: 300,
    slicesCap: 8,
    innerRadius: 0, // Inner radius should be 0 for normal pie chart 
    legend: dc.legend().x(320).y(20).itemHeight(10).gap(5),
    dimensionColumn: 'AGE_GROUP',
    groupColumn: 'AGE_GROUP',
    colors: ["#007ACC", "#0099FF", "#33ADFF", "#66C2FF", "#99D6FF", "#CCEBFF"],
    minAngleForLabel: 0.3,
    othersLabel: 'OTH'
};

var pieChartForIncomeGroup   =   {
    type: 'pieChart',
    htmlId: 'lcp-pie-chart-for-income-group',
    width: 300,
    height: 300,
    slicesCap: 4,
    innerRadius: 0, // Inner radius should be 0 for normal pie chart 
    legend: dc.legend().x(320).y(20).itemHeight(10).gap(5),
    dimensionColumn: 'INCOME_GROUP',
    groupColumn: 'INCOME_GROUP',
    colors: ["#007ACC", "#0099FF", "#33ADFF", "#66C2FF", "#99D6FF", "#CCEBFF"],
    minAngleForLabel: 0.3,
    othersLabel: 'OTH'
};

var pieChartForNumberOfCustomer   =   {
    type: 'pieChart',
    htmlId: 'lcp-pie-chart-for-number-of-customer',
    width: 300,
    height: 300,
    slicesCap: 4,
    innerRadius: 80, // Inner radius should be 0 for normal pie chart 
    legend: dc.legend().x(320).y(20).itemHeight(10).gap(5),
    dimensionColumn: 'NO_CUST',
    groupColumn: 'NO_CUST',
    colors: ["#007ACC", "#0099FF", "#33ADFF", "#66C2FF", "#99D6FF", "#CCEBFF"],
    minAngleForLabel: 0.3,
    othersLabel: 'OTH'
};


chart.addNewChart(pieChartForAgeGroup);
chart.addNewChart(pieChartForIncomeGroup);
chart.addNewChart(pieChartForNumberOfCustomer);
chart.generateChart('csv/SBPOCUK_R2.2.4_Dataset.csv');


                