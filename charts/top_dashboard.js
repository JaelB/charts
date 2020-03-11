var processCpuRowChart = dc.rowChart('#process-cpu-row');
var cpuMemTimeseriesChart = dc.compositeChart('#cpu-mem-line');
var timeSeriesRangeChart = dc.seriesChart('#range-line');
var weekDayRowChart = dc.rowChart('#weekday-row');
var workingHoursChart = dc.pieChart('#working-hour-pie');

var dateTimeParser = d3.timeParse('%Y%m%d%H%M%S'); // 20180420160935
var dateTimeFormatter = d3.timeFormat('%d %b %Y %H:%M:%S'); //  2018-Apr-20 16:09:35
var floatFormat = d3.format(',.2f');
var numberFormat = d3.format(',');


d3.csv('https://raw.githubusercontent.com/JaelB/charts/master/data/top_data.csv').then((data) => {
  data.forEach((d) => {
    d.timestamp = dateTimeParser(d.Timestamp);
  });

  function cpuMemGrouping(dim) {
    var group = dim.group().reduce(
      (p, v) => {
        ++p.count;
        p.cpu += +v.cpu;
        p.mem += +v.mem;
        p.avgCpu = p.cpu / p.count;
        p.avgMem = p.mem / p.count;
        return p;
      },
      (p, v) => {
        --p.count;
        p.cpu -= +v.cpu;
        p.mem -= +v.mem;
        p.avgCpu = p.cpu / p.count;
        p.avgMem = p.mem / p.count;
        return p;
      },
      () => ({ count: 0, cpu: 0.0, mem: 0.0, avgCpu: 0.0, avgMem: 0.0 })
    );
    return group;
  }

  var topData = crossfilter(data);

  var processDimension = topData.dimension(d => d.process);
  var processCpuGrp = cpuMemGrouping(processDimension);

  var dateTimeDim = topData.dimension(d => d.timestamp);
  var startDate = dateTimeDim.bottom(1)[0].timestamp;
  var endDate = dateTimeDim.top(1)[0].timestamp;

  var timeDimension = topData.dimension(d => d.timestamp);
  var timeGroup = cpuMemGrouping(timeDimension);

  var weekDayDimension = topData.dimension(d => {
    var day = d.timestamp.getDay();
    var name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${day}.${name[day]}`;
  });
  var weekDayGroup = cpuMemGrouping(weekDayDimension);

  var workingHoursDimension = topData.dimension(d => {
    var tHour = d.timestamp.getHours();
    if (tHour >= 9 && tHour <= 18) {
      return 'Working Hours';
    } else {
      return 'Non-Working Hours';
    }
  });
  var workingHoursGroup = cpuMemGrouping(workingHoursDimension);

  processCpuRowChart
    .width(390)
    .height(422)
    .dimension(processDimension)
		.group(processCpuGrp)
    .valueAccessor(d => d.value.count)
		.elasticX(true)
    .ordering(d => -d.value.count)
    .colors('#04E5C3')
    .title(d => [
      d.key,
      `Count: ${numberFormat(d.value.count)}`,
      `CPU Usage: ${floatFormat(d.value.avgCpu)}`,
      `Memory Usage: ${floatFormat(d.value.avgMem)}`
    ].join('\n'));

  cpuMemTimeseriesChart
    .width(820)
    .height(110)
    .margins({top: 10, right: 40, bottom: 20, left: 40})
    .mouseZoomable(true)
    .yAxisLabel('CPU %')
    .rightYAxisLabel("Memory %")
    .x(d3.scaleTime().domain([startDate, endDate]))
    .xUnits(d3.timeMonths)
    .round(d3.timeMonth.round)
    .elasticY(true)
    .brushOn(false)
    .renderHorizontalGridLines(true)
    .rangeChart(timeSeriesRangeChart)
    .compose([
      dc.lineChart(cpuMemTimeseriesChart)
        .dimension(timeDimension)
        .group(timeGroup)
        .valueAccessor(d => d.value.avgCpu),
      dc.lineChart(cpuMemTimeseriesChart)
        .dimension(timeDimension)
        .group(timeGroup)
        .valueAccessor(d => d.value.avgMem)
        .colors('orange')
        .useRightYAxis(true)
    ])
    .title(d => [
      dateTimeFormatter(d.key),
      `CPU Usage: ${floatFormat(d.value.avgCpu)}`,
      `Memory Usage: ${floatFormat(d.value.avgMem)}`
    ].join('\n'));

  timeSeriesRangeChart
    .width(820)
    .height(40)
    .margins({top: 10, right: 40, bottom: 20, left: 53})
    .brushOn(true)
    .dimension(timeDimension)
    .group(timeGroup)
    .valueAccessor(d => d.value.avgCpu)
    .x(d3.scaleTime().domain([startDate, endDate]))
    .seriesAccessor(() => '1');

  weekDayRowChart
    .width(390)
    .height(150)
    .dimension(weekDayDimension)
    .group(weekDayGroup)
    .valueAccessor(d => +d.value.count)
    .elasticX(true)
    .label(d => d.key.split('.')[1])
    .colors('#04E5C3')
    .title(d => [
      d.key.split('.')[1],
      `CPU Usage: ${floatFormat(d.value.avgCpu)}`,
      `Memory Usage: ${floatFormat(d.value.avgMem)}`
    ].join('\n'));

  workingHoursChart
    .width(400)
    .height(150)
    .radius(70)
    .innerRadius(30)
    .dimension(workingHoursDimension)
    .group(workingHoursGroup)
    .valueAccessor(d => d.value.avgCpu)
    .title(d => [
      d.key,
      `CPU Usage: ${floatFormat(d.value.avgCpu)}`,
      `Memory Usage: ${floatFormat(d.value.avgMem)}`
    ].join('\n'));

  dc.renderAll();

  timeSeriesRangeChart.filter(dc.filters.RangedFilter(d3.timeHour.offset(endDate, -1) , endDate));
  // timeSeriesRangeChart.filterAll();
  dc.redrawAll();
});
