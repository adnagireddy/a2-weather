// set margin
const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 1000 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Global Variables (data object, vars to be plotted at a tme )
let allData = []
let xVar, yVar, targetState
let xScale, yScale
const months = ['01', '02', '03', '04', 
                '05', '06', '07', '08', '09'] //for some reason there's only data til sept?
let options = [] //populate to be the distinct column values of column STATION 
// calculated averages per month for each state stored here: 
let avgPerMonthByState = calcAvgTempPerMonth()

console.log("avgPerMonthByState", avgPerMonthByState)

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September']

// Inital variables for visual check 
xVar = monthNames[0], yVar = '30.00', targetState = 'GU'

//create empty svg 
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

// init function: loads data and calls functions that build visualization and 
function init(){
    d3.csv('./data/weather.csv', 
    // processing our data: this is the callback function, applied to each item in the array
    function(d){
        return {  
        // Besides converting the types, we also simpilify the variable names here. 
        station: d.station,
        state: d.state,
        latitude: +d.latitude, // using + to convert to numbers; same below
        elevation: +d.elevation, 
        date: +d.date, 
        min_temp: +d.TMIN, 
        max_temp: +d.TMAX,
        avg_temp: +d.TAVG,
        wind_speed: +d.AWND,
        wdf5: +d.WDF5,
        wsf5: +d.WSF5,
        snowfall: +d.SNOW,
        snowdepth: +d.SNWD,
        precipitation: +d.PRCP
  
     }
    })
    .then(data => {
            console.log(data) // Check the structure in the console
            allData = data // Save the processed data
            //populating dropdown states list, will serve as dropdown options:
            options = [...new Set(data.map(d => d.state))];
            console.log(options)
            // do calculations 
            avgPerMonthByState = calcAvgTempPerMonth();
            console.log("avgPerMonthByState", avgPerMonthByState)
            // placeholder for adding listerners
            setupSelector()
            // placeholder for building vis
            updateAxes()
            updateVis()
        })
    .catch(error => console.error('Error loading data:', error));

}

// SETUPSELECTION(): listeners are in setupSelector
function setupSelector() {
    // Handles UI changes (dropdowns)
    // Anytime the user tweaks something, this function reacts.
    // Calls updateAxes() and updateVis() when needed!

    d3.selectAll('.variable')
        // Loop over each dropdown button
        .each(function () {
            d3.select(this).selectAll('myOptions')
                .data(options)
                .enter()
                .append('option')
                .text(d => d) // The displayed text
                .attr("value", d => d); // The actual value used in the code
        })
        .on("change", function () {
            // Logs which dropdown was changed and its new value
            let drop_down_id = d3.select(this).property("id");
            let drop_down_value = d3.select(this).property("value");

            console.log("Dropdown changed:", drop_down_id, "New value:", drop_down_value);

            // Map to global variables
            if (drop_down_id == 'state_dropdown') {
                targetState = drop_down_value;
            }

            // Update the chart
            updateAxes();
            updateVis();
        });

    // Set default dropdown values
    d3.select('#state_dropdown').property('value', targetState);
}
  
// Draws, centers, and annotates x and y axis
function updateAxes(){
    svg.selectAll('.axis').remove()
    svg.selectAll('.labels').remove()

    xScale = d3.scaleBand()
        .domain(monthNames)
        .range([0, width])
        .padding(0.2)

    yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);  // Inverted for SVG coordinates

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)

    svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);


    svg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .text('Month');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 25)
        .style('text-anchor', 'middle')
        .text('Average Temperature (F)');

}

function getColor(temp) {
    if (temp < 55) return "#3A8DFF"; 
    if (temp >= 55 && temp <= 80) return "#4CAF50"; 
    return "#FF5733";  // hot
}

// Draws & Updates the Bars in Bar Chart  
function updateVis(){
    
    //BINDING DATA & Drawing BAR CHART
    // Convert result for data binding, in selected state = [{month : val, avg : val}, .. 9 months] form: 
    let month_avg_selected_state = Object.entries(avgPerMonthByState[targetState] || {}).map(([month, avg]) => ({ month, avg }));
    console.log('month_avg', month_avg_selected_state);

    svg.selectAll('.bars')
    .data(month_avg_selected_state, d => d.month)
    .join(
            //  draw bars 
            function(enter) {
                return enter.append('rect')
                    .attr('class', 'bars')
                    .attr('x', d => xScale(monthNames[months.indexOf(d.month)]))
                    .attr('y', height)
                    .attr('width', xScale.bandwidth())
                    .attr('height', 0)
                    .attr('fill', d => getColor(d.avg))
                    .on('mouseover', function (event, d) {
                        console.log(d) // See the data point in the console for debugging
                        d3.select('#tooltip')
                     // if you change opacity to hide it, you should also change opacity here
                            .style("display", 'block') // Make the tooltip visible
                            .html( // Change the html content of the <div> directly
                            `<strong>${monthNames[months.indexOf(d.month)]}</strong><br/>
                            Average Temperature: ${d.avg.toFixed(2)}°F`)
                            .style("left", (event.pageX + 20) + "px")
                            .style("top", (event.pageY - 28) + "px"); 
    
                        d3.select(this) // Refers to the hovered circle
                            .style('stroke', 'steelblue')
                            .style('stroke-width', '6px')               
                    })
                    .on("mouseout", function (event, d) {
                        d3.select('#tooltip')
                        .style('display', 'none') // Hide tooltip when cursor leaves
                        d3.select(this)
                        .style('stroke', 'none')
                    })
                    .transition()
                    //try to make step like effect: 
                    .delay((d, i) => i * 100)
                    .duration(500)
                    .attr('y', d => yScale(d.avg))
                    .attr('height', d => height - yScale(d.avg))
                },
             // redraw bars once state selected   
            function(update) {
                return update
                    .transition()
                    .duration(500)
                    .attr('x', d => xScale(monthNames[months.indexOf(d.month)]))
                    .attr('y', d => yScale(d.avg))
                    .attr('height', d => height - yScale(d.avg))
                    .attr('fill', d => getColor(d.avg))
                },
            // lower bars down     
            function(exit) {
                return exit
                    .transition()
                    .duration(500)
                    .attr('height', 0)
                    .attr('y', height)
                    .remove();
            });
}
  
// helper function to do calculation, utilizes FILTERING (category 1)! 
function calcAvgTempPerMonth() {
    let result = Object.fromEntries(options.map(state => [state, {}]));

    options.forEach(state => {
        months.forEach(month => {
            let monthAndStateData = allData.filter(d => 
                d.state === state && 
                String(d.date).substring(4, 6) === month && 
                +d.avg_temp > 0 // ✅ Excludes 0 values
            );

            console.log(`State: ${state}, Month: ${month}, Data Count: ${monthAndStateData.length}`);

            let avg = d3.mean(monthAndStateData, d => +d.avg_temp) || 0; 
            
            // Debugging: Print filtered temperature values used for averaging
            console.log(`State: ${state}, Month: ${month}, Avg Temp Data (No 0s):`, monthAndStateData.map(d => d.avg_temp));
            console.log(`Computed Average for ${state} in ${month}:`, avg);

            result[state][month] = avg;
        });
    });

    return result; 
}





// LAST LINE! 
window.addEventListener('load', init);
