import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

function createPlot(filename: string) {
    // Read and parse CSV file
    const fileContent = fs.readFileSync(filename, 'utf-8');
    const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Get unique values for axes
    const guardians = [...new Set(records.map((r: any) => r.guardians))].sort((a, b) => Number(a) - Number(b));
    const fdkgPercentages = [...new Set(records.map((r: any) => r.fdkgPercentage))].sort((a, b) => Number(a) - Number(b));

    // Create the chart
    console.log('\nChart (Guardians vs FDKG Percentage, showing Success Rate):\n');
    
    // Print Y-axis labels and data
    fdkgPercentages.reverse().forEach(fdkg => {
        // Y-axis label
        process.stdout.write(`${String(fdkg).padStart(4)} │ `);
        
        // Data points
        guardians.forEach(g => {
            const dataPoint = records.find((r: any) => 
                r.guardians === g && r.fdkgPercentage === fdkg
            );
            
            if (!dataPoint) {
                process.stdout.write(' ');
            } else {
                const successRate = Number(dataPoint.successRate);
                if (successRate === 0) process.stdout.write(' ');
                else if (successRate === 1) process.stdout.write('█');
                else process.stdout.write('▒');
            }
            process.stdout.write(' ');
        });
        console.log();
    });

    // Print X-axis line
    process.stdout.write('     └');
    guardians.forEach(() => process.stdout.write('──'));
    console.log();

    // Print X-axis labels
    process.stdout.write('      ');
    guardians.forEach(g => process.stdout.write(`${g} `));
    console.log('\n');
}

// Execute the plot
createPlot('simulation_results_nodes_200.csv');
