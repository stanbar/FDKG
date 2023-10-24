import pandas as pd
import matplotlib.pyplot as plt

# Load the data
data = pd.read_csv('results.csv')

# Define the column names
options_column = 'Options'
voters_column = 'Voters'
time_column = 'Time'

# Set up the figure and axis
plt.figure(figsize=(12, 8))

# For each unique value in 'Options', plot a series
for option in data[options_column].unique():
    subset = data[data[options_column] == option]
    plt.plot(subset[voters_column], subset[time_column], label=f'No. options {option}')

# Set the y-axis to log scale
plt.yscale('log')

# Add labels, title, and legend
plt.xlabel('Number of Voters')
plt.ylabel('Time (Log Scale)')
plt.title('Time vs. Number of Voters for different Number of Options (Log Scale on Y-axis)')
plt.legend()
plt.grid(True, which="both", ls="--", linewidth=0.5)

plt.show()