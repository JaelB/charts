dataLabels = {
  'id' : 'ID',
  'level': 'Level',
  'subLevel': 'Sub-Level',
  'value': 'Value'
};
d3.json('https://raw.githubusercontent.com/JaelB/charts/master/data/level-data.json').then((data) => {

  ids = data.map(d => d.id);
  distinctIds = ids.filter(getUniqueArray);
  // add options to dropdown
  $('<option>').val('All').text('All').appendTo('#ddms');
  distinctIds.forEach((d) => {
    $('<option>').val(d).text(d).appendTo('#ddms');
  })
  // select option on page load
  $("#ddms").val('All');
  // on dropdown selection change
  $('#ddms').on('change', function() {
    prepareData(this.value);
  });
  // to group granular data and to prepare required data structure for charts
  prepareData('All');

  function prepareData(selectVal) {
    // assign data type for data variables. Can be done inline while grouping as well.
    data.forEach((d) => {
      d.value = +d.value; // value is assigned integer datatype
    });
    // filter data based on dropdown selection
    var filteredData;
    if (selectVal == 'All') {
      filteredData = data;
    } else {
      filteredData = data.filter(d => d.id == selectVal);
    }
    // load data to crossfilter library that is priarily used for data grouping and other data manipulations
    var cf = crossfilter(filteredData);
    // group data by level
    var levelDim = cf.dimension(d => d.level);
    var levelGrp = levelDim.group().reduceSum(d => +d.value);
    // group data by sublevel
    var subLevelDim = cf.dimension(d => [d.level, d.subLevel]);
    var subLevelGrp = subLevelDim.group().reduceSum(d => +d.value);

    var tableData = [];
    subLevelGrp.all().forEach((d) => {
      // prepare data structure required for table
      tableData.push({level: d.key[0], subLevel: d.key[1], value: d.value});
    });
    var barData = levelGrp.all();
    var l1Data = preparePieData(subLevelGrp,'l1');
    var l2Data = preparePieData(subLevelGrp,'l2');
    var l3Data = preparePieData(subLevelGrp,'l3');

    drawTable('#data-table', tableData);
    drawBarChart('#level-bar', barData);
    drawPieChart('#l1-pie', l1Data);
    drawPieChart('#l2-pie', l2Data);
    drawPieChart('#l3-pie', l3Data);
  }
});

function getUniqueArray(value, index, self) {
    return self.indexOf(value) === index;
}

function preparePieData(group, level) {
  var subLevData = group.all().filter(d => d.key[0] == level);
  var pieData = [];
  subLevData.forEach((d) => {
    // prepare data structure required for pie chart
    pieData.push([d.key[1], d.value]);
  });
  return pieData;
}

function drawPieChart(divId, data) {
  var pieChart = c3.generate({
      bindto: divId,
      size: {
        height: 300,
        width: 300
      },
      data: {
        columns: data,
        type : 'pie'
      },
      legend: {
        position: 'right'
      },
      pie: {
        label: {
          format: function (value, ratio, id) {
            return value;
          }
        }
      },
      tooltip: {
        format: {
            title: function (d) { return d; },
            value: function (value, ratio, id) {
              return `${value} (${d3.format(',.1%')(ratio)})`;
          }
        }
      }
  });
}

function drawBarChart(divId, data) {
  var barChart = c3.generate({
    bindto: divId,
    size: {
      height: 250
    },
    data: {
      json: data,
      keys: {
        x: 'key',
        value: ['value'],
      },
      type: 'bar',
    },
    legend: {
      show: false
    },
    axis: {
      rotated: true,
      x: {
        type: 'category'
      }
    }
  });
}

function drawTable(divId, data) {
  d3.select(divId).html('');
  var numberFormat = d3.format(',');
  var table = d3.select(divId)
                .append('table')
                .attr('class','table is-bordered is-narrow is-hoverable is-fullwidth');

  var titles = d3.keys(data[0]).filter(d => d != 'id');
  var headers = table.append('thead').append('tr')
                     .selectAll('th')
                     .data(titles).enter()
                     .append('th')
                     .attr('class', 'has-background-info has-text-white')
                     .style('text-align', 'center')
                     .text(d => dataLabels[d]);

  var rows = table.append('tbody');
  // creating hierarchy for the data
  var nestedData = d3.nest()
                     .key(d => d.level)
                     .entries(data);

  nestedData.forEach((d) => {
    var rowSpan = d.values.length;
    d.values.forEach((value, index) => {
      var tr = rows.append('tr');
      if( index == 0 ) {
        tr.append("td")
          .attr("rowspan", rowSpan)
          .text(value.level);
      }
      tr.append('td')
        .text(value.subLevel);
      tr.append('td')
        .text(numberFormat(value.value))
        .style('text-align', 'right');
    })
  });
}
