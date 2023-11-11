import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const LineChart = ({ jsonData, futureData }) => {
  const chartRef = useRef();

  useEffect(() => {
    try {
      // Parse JSON data
      const data = JSON.parse(jsonData);
      const futureRates = futureData.length > 0 ? JSON.parse(futureData) : [];

      // Extract date and price data
      const parseDate = d => new Date(d.date);
      const parsePrice = d => +d.price;

      const parseData = dataset => {
        return dataset.map(d => ({
          date: parseDate(d),
          price: parsePrice(d),
        }));
      };

      const processedData = parseData(data);
      const processedFutureData = parseData(futureRates);

      // Set up SVG dimensions
      const width = 800;
      const height = 400;
      const margin = { top: 20, right: 20, bottom: 30, left: 50 };

      // Create scales
      const xScale = d3.scaleTime()
        .domain(d3.extent([...processedData, ...processedFutureData], d => d.date))
        .range([margin.left, width - margin.right]);

      const yScale = d3.scaleLinear()
        .domain([400, d3.max([...processedData, ...processedFutureData], d => d.price)]) // Start at 400
        .range([height - margin.bottom, margin.top]);

      // Create line functions
      const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.price))
        .curve(d3.curveMonotoneX);

      // Remove existing chart
      d3.select(chartRef.current).selectAll('*').remove();

      // Create SVG container
      const svg = d3.select(chartRef.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      // Add past data line to the chart
      svg.append('path')
        .data([processedData])
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2);

      // Add future data line to the chart with a different color if futureData exists
      if (futureRates.length > 0) {
        svg.append('path')
          .data([processedFutureData])
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', 'orange') // Change the color to orange (or any other color)
          .attr('stroke-width', 2);
      }

      // Add axes
      svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .append('text')
        .attr('x', width - margin.right)
        .attr('y', -4)
        .attr('fill', '#000')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'end')
        .text('Date');

      svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('x', 2)
        .attr('y', margin.top - 5)
        .attr('fill', '#000')
        .attr('font-weight', 'bold')
        .text('Price');
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }

  }, [jsonData, futureData]);

  return (
    <div ref={chartRef}></div>
  );
};

export default LineChart;
