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
data = pd.read_csv('../simulation_results_nodes4_200.csv')

# # Inspect the data
# print(data.head())

# # Convert percentage columns from decimal to percentage format for better readability
# percentage_cols = ['fdkgPercentage', 'tallierRetPct', 'tallierNewPct', 'successRate']
# data[percentage_cols] = data[percentage_cols] * 100

# # Check for any missing values
# print(data.isnull().sum())


# # Summary statistics
# print(data.describe())

# # Distribution of successRate
# sns.histplot(data['successRate'], bins=20, kde=True)
# plt.title('Distribution of Success Rates')
# plt.xlabel('Success Rate (%)')
# plt.ylabel('Frequency')
# plt.show()

# plt.figure(figsize=(12, 8))
# scatter = plt.scatter(
#     data['fdkgPercentage'],
#     data['successRate'],
#     c=data['tallierRetPct'],
#     s=data['tallierNewPct'] * 10,  # Scaling for better visibility
#     alpha=0.6,
#     cmap='viridis'
# )
# plt.colorbar(scatter, label='Tallier Retention Percentage (%)')
# plt.title('Success Rate vs. FDKG Percentage')
# plt.xlabel('FDKG Percentage (%)')
# plt.ylabel('Success Rate (%)')
# plt.grid(True)
# plt.show()

# g = sns.FacetGrid(data, col='tallierRetPct', hue='tallierNewPct', palette='viridis', col_wrap=4, height=4)
# g.map(plt.scatter, 'fdkgPercentage', 'successRate', alpha=0.6)
# g.add_legend(title='Tallier New Percentage (%)')
# g.set_titles(col_template='Tallier Retention: {col_name}%')
# g.set_axis_labels('FDKG Percentage (%)', 'Success Rate (%)')
# plt.subplots_adjust(top=0.9)
# g.fig.suptitle('Success Rate vs. FDKG Percentage by Tallier Retention and New Percentages')
# plt.show()

# # Pivot the data to create a matrix for heatmap
# heatmap_data = data.pivot_table(
#     values='successRate',
#     index='tallierRetPct',
#     columns='tallierNewPct',
#     aggfunc='mean'
# )

# plt.figure(figsize=(12, 8))
# sns.heatmap(heatmap_data, annot=True, fmt=".1f", cmap='YlGnBu')
# plt.title('Average Success Rate by Tallier Retention and New Percentages')
# plt.xlabel('Tallier New Percentage (%)')
# plt.ylabel('Tallier Retention Percentage (%)')
# plt.show()

# # Melt the data to have tallierRetPct and tallierNewPct in a single variable
# melted_data = data.melt(
#     id_vars=['nodes', 'guardians', 'threshold', 'fdkgPercentage', 'successRate'],
#     value_vars=['tallierRetPct', 'tallierNewPct'],
#     var_name='Tallier_Type',
#     value_name='Tallier_Percentage'
# )

# plt.figure(figsize=(14, 8))
# sns.lineplot(
#     data=melted_data,
#     x='fdkgPercentage',
#     y='successRate',
#     hue='Tallier_Type',
#     style='Tallier_Percentage',
#     markers=True,
#     dashes=False
# )
# plt.title('Success Rate vs. FDKG Percentage by Tallier Types and Percentages')
# plt.xlabel('FDKG Percentage (%)')
# plt.ylabel('Success Rate (%)')
# plt.legend(title='Tallier Type / Percentage')
# plt.grid(True)
# plt.show()

# sns.lmplot(
#     data=data,
#     x='tallierRetPct',
#     y='successRate',
#     hue='tallierNewPct',
#     aspect=1.5,
#     markers='o',
#     scatter_kws={'alpha':0.6},
#     line_kws={'linewidth':2}
# )
# plt.title('Success Rate vs. Tallier Retention Percentage by Tallier New Percentage')
# plt.xlabel('Tallier Retention Percentage (%)')
# plt.ylabel('Success Rate (%)')
# plt.show()

# import plotly.express as px

# fig = px.scatter(
#     data,
#     x='fdkgPercentage',
#     y='successRate',
#     color='tallierRetPct',
#     size='tallierNewPct',
#     hover_data=['nodes', 'guardians', 'threshold'],
#     title='Interactive: Success Rate vs. FDKG Percentage',
#     labels={
#         'fdkgPercentage': 'FDKG Percentage (%)',
#         'successRate': 'Success Rate (%)',
#         'tallierRetPct': 'Tallier Retention Percentage (%)',
#         'tallierNewPct': 'Tallier New Percentage (%)'
#     },
#     color_continuous_scale='Viridis'
# )

# fig.update_layout(
#     xaxis=dict(title='FDKG Percentage (%)'),
#     yaxis=dict(title='Success Rate (%)'),
#     legend_title='Tallier Retention (%)'
# )

# fig.show()


# OLD

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

# # Filter data for high percentages
# high_percentage_data = data[(data['fdkgPercentage'] >= 65) & (data['tallierRetPct'] >= 65)]

# plt.figure(figsize=(14, 7))
# sns.barplot(
#     data=high_percentage_data,
#     x='nodes',
#     y='successRate',
#     hue='guardians'
# )
# plt.title('Success Rate for High FDKG and Tallier Percentages by Nodes and Guardians')
# plt.xlabel('Nodes')
# plt.ylabel('Success Rate (%)')
# plt.legend(title='Guardians')
# plt.show()


# import plotly.express as px

# # Example: Interactive Line Chart
# fig = px.line(
#     data,
#     x='tallierRetPct',
#     y='successRate',
#     color='nodes',
#     line_dash='guardians',
#     markers=True,
#     title='Interactive: Success Rate vs. tallierRetPct'
# )
# fig.update_layout(
#     xaxis_title='tallierRetPct (%)',
#     yaxis_title='Success Rate (%)'
# )
# fig.show()

# OPTIMISATION

# Define feature columns and target
feature_cols = ['nodes', 'guardians', 'threshold', 'fdkgPercentage', 'tallierRetPct', 'tallierNewPct']
target = 'successRate'

X = data[feature_cols]
y = data[target]

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Feature scaling (optional but recommended for some models)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


# Initialize the model
rf = RandomForestRegressor(n_estimators=100, random_state=42)

# Train the model
rf.fit(X_train, y_train)

# Predict on test set
y_pred = rf.predict(X_test)

# Evaluate the model
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"Random Forest - MSE: {mse:.4f}, R²: {r2:.4f}")



def objective_function(x):
    """
    Objective function to maximize successRate.
    x: array-like, [nodes, guardians, threshold, fdkgPercentage, tallierRetPct, tallierNewPct]
    Returns: negative successRate (since most optimization functions minimize)
    """
    # Create a DataFrame from input
    input_df = pd.DataFrame([x], columns=feature_cols)
    
    # Predict successRate
    pred = rf.predict(input_df)[0]
    
    # We aim to maximize successRate, so return negative for minimization
    return -pred

from scipy.optimize import minimize

# Define bounds for each variable
# Assuming:
# nodes: 10, 50, 100
# guardians: 2, 3, 4
# threshold: 1, 2, 3, 4
# fdkgPercentage: 0.1 to 1 (10% to 100%)
# tallierRetPct: 0.5 to 1 (50% to 100%)
# tallierNewPct: 0.05 to 1 (5% to 100%)

bounds = [
    (10, 200),    # nodes
    (2, 7),       # guardians
    (1, 7),       # threshold
    (10, 100),    # fdkgPercentage
    (10, 100),    # tallierRetPct
    (5,5)      # tallierNewPct
]

# Initial guess (can be the mean or a reasonable starting point)
initial_guess = [
    50,    # nodes
    3,     # guardians
    2,     # threshold
    50,    # fdkgPercentage
    75,    # tallierRetPct
    5     # tallierNewPct
]

# Define constraints (if any)
# For example, if nodes must be multiples of 10, etc., but for simplicity, we'll keep them continuous

result = minimize(
    objective_function,
    initial_guess,
    method='L-BFGS-B',
    bounds=bounds
)

# Extract the optimal variables
optimal_vars = result.x
optimal_success_rate = -result.fun

print("Optimal Configuration:")
print(f"Nodes: {optimal_vars[0]:.0f}")
print(f"Guardians: {optimal_vars[1]:.0f}")
print(f"Threshold: {optimal_vars[2]:.0f}")
print(f"FDKG Percentage: {optimal_vars[3]:.2f}%")
print(f"Tallier Retention Percentage: {optimal_vars[4]:.2f}%")
print(f"Tallier New Percentage: {optimal_vars[5]:.2f}%")
print(f"Predicted Success Rate: {optimal_success_rate:.2f}%")


from itertools import product

# Define discrete values for variables
nodes_values = [10, 50, 100, 200]
guardians_values = [2, 3, 4, 5, 6, 7]
threshold_values = [1, 2, 3, 4, 5, 6, 7]
fdkgPercentage_values = [10, 25, 50, 75, 100]  # in %
tallierRetPct_values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]              # in %
tallierNewPct_values = [5]  # in %

# Create all possible combinations (this can be computationally intensive)
combinations = product(
    nodes_values,
    guardians_values,
    threshold_values,
    fdkgPercentage_values,
    tallierRetPct_values,
    tallierNewPct_values
)

# Initialize variables to store the best configuration
best_success_rate = -np.inf
best_config = None

for combo in combinations:
    # Ensure fdkgPercentage and tallierRetPct are not required to be 100%
    # They can take any value within their ranges

    # Predict successRate
    pred = rf.predict([combo])[0]

    # Update if better
    if pred > best_success_rate:
        best_success_rate = pred
        best_config = combo

# Display the best configuration
if best_config:
    print("Optimal Configuration via Grid Search:")
    print(f"Nodes: {best_config[0]}")
    print(f"Guardians: {best_config[1]}")
    print(f"Threshold: {best_config[2]}")
    print(f"FDKG Percentage: {best_config[3]}%")
    print(f"Tallier Retention Percentage: {best_config[4]}%")
    print(f"Tallier New Percentage: {best_config[5]}%")
    print(f"Predicted Success Rate: {best_success_rate:.2f}%")


optimal_data = {
    'Variable': ['Nodes', 'Guardians', 'Threshold', 'FDKG Percentage', 'Tallier Retention %', 'Tallier New %'],
    'Value': [optimal_vars[0], optimal_vars[1], optimal_vars[2], optimal_vars[3], optimal_vars[4], optimal_vars[5]]
}

optimal_df = pd.DataFrame(optimal_data)

plt.figure(figsize=(10,6))
sns.barplot(x='Variable', y='Value', data=optimal_df, palette='Set2')
plt.title('Optimal Configuration to Maximize Success Rate')
plt.ylabel('Value (%)' if 'Percentage' in optimal_df['Variable'].values else 'Count')
plt.show()


import plotly.express as px

# Interactive Scatter Plot for Success Rate vs. FDKG Percentage
fig = px.scatter(
    data,
    x='fdkgPercentage',
    y='successRate',
    color='tallierRetPct',
    size='tallierNewPct',
    hover_data=['nodes', 'guardians', 'threshold'],
    title='Success Rate vs. FDKG Percentage',
    labels={
        'fdkgPercentage': 'FDKG Percentage (%)',
        'successRate': 'Success Rate (%)',
        'tallierRetPct': 'Tallier Retention (%)',
        'tallierNewPct': 'Tallier New (%)'
    },
    color_continuous_scale='Viridis'
)

fig.show()


def load_and_preprocess(filepath):
    data = pd.read_csv(filepath)
    percentage_cols = ['fdkgPercentage', 'tallierRetPct', 'tallierNewPct', 'successRate']
    data[percentage_cols] = data[percentage_cols] * 100
    return data

def perform_eda(data):
    sns.histplot(data['successRate'], bins=30, kde=True, color='skyblue')
    plt.title('Distribution of Success Rate')
    plt.xlabel('Success Rate (%)')
    plt.ylabel('Frequency')
    plt.show()

    sns.heatmap(data.corr(), annot=True, cmap='coolwarm', fmt=".2f")
    plt.title('Correlation Matrix')
    plt.show()

def train_random_forest(X_train, y_train):
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    return rf

def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"Random Forest - MSE: {mse:.4f}, R²: {r2:.4f}")
    return mse, r2

def plot_feature_importance(model, feature_cols):
    importances = model.feature_importances_
    feature_importance = pd.Series(importances, index=feature_cols).sort_values(ascending=False)
    sns.barplot(x=feature_importance, y=feature_importance.index, palette='viridis')
    plt.title('Feature Importances')
    plt.xlabel('Importance Score')
    plt.ylabel('Features')
    plt.show()

def optimize_success_rate(model, scaler, bounds, initial_guess):
    def objective(x):
        # x contains scaled features
        input_df = pd.DataFrame([x], columns=feature_cols)
        pred = model.predict(input_df)[0]
        return -pred  # Negative for maximization

    result = minimize(
        objective,
        initial_guess,
        method='L-BFGS-B',
        bounds=bounds
    )

    optimal_vars = result.x
    optimal_success_rate = -result.fun

    return optimal_vars, optimal_success_rate

# Usage Example
if __name__ == "__main__":
    # Load and preprocess data
    data = load_and_preprocess('simulation_results.csv')

    # Perform EDA
    perform_eda(data)

    # Define features and target
    feature_cols = ['nodes', 'guardians', 'threshold', 'fdkgPercentage', 'tallierRetPct', 'tallierNewPct']
    target = 'successRate'
    X = data[feature_cols]
    y = data[target]

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train model
    rf_model = train_random_forest(X_train, y_train)

    # Evaluate model
    mse, r2 = evaluate_model(rf_model, X_test, y_test)

    # Plot feature importance
    plot_feature_importance(rf_model, feature_cols)


    # Optimize
    optimal_vars, optimal_success_rate = optimize_success_rate(rf_model, scaler=None, bounds=bounds, initial_guess=initial_guess)

    print("Optimal Configuration:")
    print(f"Nodes: {optimal_vars[0]:.0f}")
    print(f"Guardians: {optimal_vars[1]:.0f}")
    print(f"Threshold: {optimal_vars[2]:.0f}")
    print(f"FDKG Percentage: {optimal_vars[3]:.2f}%")
    print(f"Tallier Retention Percentage: {optimal_vars[4]:.2f}%")
    print(f"Tallier New Percentage: {optimal_vars[5]:.2f}%")
    print(f"Predicted Success Rate: {optimal_success_rate:.2f}%")



