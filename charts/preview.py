import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import plotly.express as px

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

from scipy.optimize import minimize


# Load the CSV data
filepath_barabasi = '../../liveness_sim/simulation_results_nodes_BarabasiAlbert_100000.csv'
data = pd.read_csv(filepath_barabasi)

# Inspect the data
print(data.head())

# Convert percentage columns from decimal to percentage format for better readability
percentage_cols = ['fdkgPercentage', 'tallierRetPct', 'tallierNewPct', 'successRate']
data[percentage_cols] = data[percentage_cols] * 100

# Check for any missing values
print(data.isnull().sum())

# Summary statistics
print(data.describe())

# plt.figure(figsize=(12, 6))
# sns.lineplot(data=data, x='fdkgPercentage', y='successRate', hue='nodes', marker='o')
# plt.title('Success Rate vs. FDKG Percentage for Different Number of Nodes')
# plt.xlabel('FDKG Percentage (%)')
# plt.ylabel('Success Rate (%)')
# plt.legend(title='Nodes')
# plt.grid(True)
# plt.show()

# plt.figure(figsize=(12, 6))
# sns.lineplot(data=data, x='tallierRetPct', y='successRate', hue='nodes', marker='o')
# plt.title('Success Rate vs. tallierRetPct for Different Number of Nodes')
# plt.xlabel('tallierRetPct (%)')
# plt.ylabel('Success Rate (%)')
# plt.legend(title='Nodes')
# plt.grid(True)
# plt.show()

# # Pivot the data for heatmap
# heatmap_data = data.pivot_table(
#     values='successRate',
#     index='guardians',
#     columns='threshold',
#     aggfunc='mean'
# )

# plt.figure(figsize=(8, 6))
# sns.heatmap(heatmap_data, annot=True, fmt=".1f", cmap='YlGnBu')
# plt.title('Average Success Rate by Guardians and Thresholds')
# plt.xlabel('Threshold')
# plt.ylabel('Guardians')
# plt.show()

# # Pivot the data for heatmap
# heatmap_data = data.pivot_table(
#     values='successRate',
#     index='tallierRetPct',
#     columns='threshold',
#     aggfunc='mean'
# )

# plt.figure(figsize=(8, 6))
# sns.heatmap(heatmap_data, annot=True, fmt=".1f", cmap='YlGnBu')
# plt.title('Average Success Rate by tallierRetPct and Thresholds')
# plt.xlabel('Threshold')
# plt.ylabel('tallierRetPct')
# plt.show()

# g = sns.FacetGrid(data, col='tallierRetPct', hue='nodes', height=5, aspect=1.2)
# g.map(sns.lineplot, 'fdkgPercentage', 'successRate', marker='o')
# g.add_legend(title='Nodes')
# g.set_titles("tallierRetPct: {col_name}")
# g.set_axis_labels('FDKG Percentage (%)', 'Success Rate (%)')
# plt.subplots_adjust(top=0.85)
# g.fig.suptitle('Success Rate vs. FDKG Percentage Segmented by tallierRetPct')
# plt.show()


plt.figure(figsize=(14, 7))
sns.barplot(
    data=data,
    x='nodes',
    y='successRate',
    hue='guardians'
)
plt.title('Success Rate by Nodes and Guardians')
plt.xlabel('Nodes')
plt.ylabel('Success Rate (%)')
plt.legend(title='Guardians')
plt.show()


plt.figure(figsize=(14, 7))
sns.barplot(
    data=data,
    x='nodes',
    y='successRate',
    hue='threshold'
)
plt.title('Success Rate by Nodes and Guardians')
plt.xlabel('Nodes')
plt.ylabel('Success Rate (%)')
plt.legend(title='Threshold')
plt.show()

# Filter data for high percentages
high_percentage_data = data[(data['fdkgPercentage'] >= 25) & (data['tallierRetPct'] >= 90)]

plt.figure(figsize=(14, 7))
sns.barplot(
    data=high_percentage_data,
    x='nodes',
    y='successRate',
    hue='guardians'
)
plt.title('Success Rate for FDKG 25% and 90% Tallier Retention by Nodes and Guardians')
plt.xlabel('Nodes')
plt.ylabel('Success Rate (%)')
plt.legend(title='Guardians')
plt.show()


plt.figure(figsize=(14, 7))
sns.barplot(
    data=high_percentage_data,
    x='nodes',
    y='successRate',
    hue='threshold'
)
plt.title('Success Rate for FDKG 25% and 90% Tallier Retention by Nodes and Guardians')
plt.xlabel('Nodes')
plt.ylabel('Success Rate (%)')
plt.legend(title='Threshold')
plt.show()
 

import plotly.express as px

# Example: Interactive Line Chart
fig = px.line(
    data,
    x='tallierRetPct',
    y='successRate',
    color='nodes',
    line_dash='guardians',
    markers=True,
    title='Interactive: Success Rate vs. tallierRetPct'
)
fig.update_layout(
    xaxis_title='tallierRetPct (%)',
    yaxis_title='Success Rate (%)'
)
fig.show()
