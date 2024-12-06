# Import Necessary Libraries
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import plotly.express as px

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

import warnings
warnings.filterwarnings('ignore')  # Suppress warnings for cleaner output

# 1. Data Loading and Preprocessing
def load_and_preprocess(filepath, label):
    """
    Loads the CSV data and preprocesses it.

    Parameters:
        filepath (str): Path to the CSV file.
        label (str): Label to identify the dataset.

    Returns:
        pd.DataFrame: Preprocessed DataFrame with an added 'NetworkType' column.
    """
    # Load the dataset
    data = pd.read_csv(filepath)
    print(f"Data Loaded Successfully from {filepath}.\n")

    # Handle missing values if any
    data.dropna(inplace=True)

    # Convert percentage columns from decimals to percentages
    percentage_cols = ['fdkgPercentage', 'tallierRetPct', 'tallierNewPct', 'successRate']
    data[percentage_cols] = data[percentage_cols] * 100

    # Add a column to indicate the network type
    data['NetworkType'] = label

    print(f"Data Preprocessing Completed for {label} Network.\n")
    return data


def perform_eda(data):
    """
    Performs exploratory data analysis on the combined dataset.

    Parameters:
        data (pd.DataFrame): The combined dataset.
    """
    print("Performing Exploratory Data Analysis (EDA)...\n")

    # Separate data by network type
    data_barabasi = data[data['NetworkType'] == 'Barabasi']
    data_random = data[data['NetworkType'] == 'Random']

    for network_type, df in [('Barabasi', data_barabasi), ('Random', data_random)]:
        print(f"Correlation Analysis for {network_type} Network:")
        corr_matrix = df.drop(columns=['NetworkType']).corr()
        print(corr_matrix['successRate'].sort_values(ascending=False), "\n")

        # Plot the correlation matrix
        plt.figure(figsize=(10,8))
        sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt=".2f")
        plt.title(f'Correlation Matrix - {network_type} Network')
        plt.show()

        # Distribution of Success Rate
        plt.figure(figsize=(10,6))
        sns.histplot(df['successRate'], bins=30, kde=True, color='skyblue')
        plt.title(f'Distribution of Success Rate - {network_type} Network')
        plt.xlabel('Success Rate (%)')
        plt.ylabel('Frequency')
        plt.show()


# 3. Model Training and Evaluation
def train_and_evaluate_models(data):
    """
    Trains and evaluates models for each network type.

    Parameters:
        data (pd.DataFrame): The combined dataset.
    """
    for network_type in ['Barabasi', 'Random']:
        print(f"Training Model for {network_type} Network...\n")
        df = data[data['NetworkType'] == network_type]

        feature_cols = ['guardians', 'threshold', 'fdkgPercentage', 'tallierRetPct']
        target = 'successRate'

        X = df[feature_cols]
        y = df[target]

        # Feature Scaling
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )

        # Train Random Forest Regressor
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_model.fit(X_train, y_train)

        # Evaluate the model
        y_pred = rf_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        print(f"{network_type} Network Model Evaluation:")
        print(f"MSE: {mse:.4f}")
        print(f"R²: {r2:.4f}\n")

        # Cross-Validation
        cv_scores = cross_val_score(rf_model, X_train, y_train, cv=5, scoring='r2')
        print(f"Cross-Validation R² Scores: {cv_scores}")
        print(f"Mean CV R² Score: {cv_scores.mean():.4f}\n")

        # Plot Feature Importance
        importances = rf_model.feature_importances_
        feature_importance = pd.Series(importances, index=feature_cols).sort_values(ascending=False)
        plt.figure(figsize=(10,6))
        sns.barplot(x=feature_importance, y=feature_importance.index, palette='viridis')
        plt.title(f'Feature Importances - {network_type} Network')
        plt.xlabel('Importance Score')
        plt.ylabel('Features')
        plt.show()


# 4. Main Function to Execute All Steps
def main():
    # Filepath to the CSV data
    filepath_barabasi = '../simulation_results_nodes_BarabasiAlbert_10000.csv'
    filepath_random = '../simulation_results_nodes_RandomGraph_10000.csv'
    
    # Load and preprocess data
    data_barabasi = load_and_preprocess(filepath_barabasi, 'Barabasi')
    data_random = load_and_preprocess(filepath_random, 'Random')

    # Combine datasets
    data = pd.concat([data_barabasi, data_random], ignore_index=True)
    
    # Perform EDA
    perform_eda(data)
    
    # Train and evaluate models
    train_and_evaluate_models(data)

# Execute the main function
if __name__ == "__main__":
    main()
