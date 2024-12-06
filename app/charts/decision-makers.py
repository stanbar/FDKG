import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

def load_simulation_data(filepath):
    """
    Loads the simulation data from a CSV file.

    Parameters:
        filepath (str): Path to the simulation CSV file.

    Returns:
        pd.DataFrame: Loaded simulation data.
    """
    try:
        data = pd.read_csv(filepath)
        print(f"Data loaded successfully from {filepath}.")
        return data
    except FileNotFoundError:
        print(f"Error: File not found at {filepath}. Please check the path and try again.")
        return None

def filter_data(data, N, fdkgPct, retPct):
    """
    Filters the simulation data based on input parameters.

    Parameters:
        data (pd.DataFrame): The complete simulation data.
        N (int): Number of Nodes.
        fdkgPct (float): FDKG Participation Percentage.
        retPct (float): Tallier Retention Percentage.

    Returns:
        pd.DataFrame: Filtered data subset.
    """
    filtered = data[
        (data['nodes'] == N) &
        (data['fdkgPercentage'] == fdkgPct) &
        (data['tallierRetPct'] == retPct)
    ]
    if filtered.empty:
        print("No simulation data matches the provided parameters.")
    else:
        print(f"Filtered data contains {len(filtered)} records.")
    return filtered

def find_optimal_parameters(filtered_data, success_threshold=90):
    """
    Identifies optimal (t, k) combinations that achieve at least the specified success rate.

    Parameters:
        filtered_data (pd.DataFrame): The subset of simulation data.
        success_threshold (float): Minimum required success rate (%).

    Returns:
        pd.DataFrame: Optimal (t, k) combinations.
    """
    # Filter combinations that meet or exceed the success threshold
    successful = filtered_data[filtered_data['successRate'] >= success_threshold]
    
    if successful.empty:
        print(f"No (t, k) combinations achieve a success rate of {success_threshold}%.")
        return pd.DataFrame()
    
    # Sort by number of guardians (ascending) and threshold (descending)
    successful_sorted = successful.sort_values(by=['guardians', 'threshold'], ascending=[True, False])
    
    # Drop duplicates to keep the first occurrence of each (k, t) pair
    optimal = successful_sorted.drop_duplicates(subset=['guardians', 'threshold'])
    
    # Select the combination with the smallest k and largest t
    optimal = optimal.nsmallest(1, ['guardians']).sort_values(by='threshold', ascending=False).head(1)
    
    return optimal[['threshold', 'guardians', 'successRate']]

def generate_heatmap(filtered_data):
    """
    Generates a heatmap showing success rates for different (t, k) combinations.

    Parameters:
        filtered_data (pd.DataFrame): The subset of simulation data.

    Returns:
        None
    """
    pivot_table = filtered_data.pivot_table(
        index='threshold',
        columns='guardians',
        values='successRate',
        aggfunc='mean'
    )
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(pivot_table, annot=True, fmt=".1f", cmap='YlGnBu', vmin=0, vmax=1, cbar_kws={'label': 'Success Rate (%)'})
    plt.title('Success Rate Heatmap for (Threshold, Guardians)')
    plt.xlabel('Number of Guardians (k)')
    plt.ylabel('Threshold (t)')
    
    plt.show()

def batch_recommendations(data, N_values, fdkgPct_values, retPct_values, success_threshold=90):
    """
    Generates a recommendation table for multiple input scenarios.

    Parameters:
        data (pd.DataFrame): The complete simulation data.
        N_values (list): List of Number of Nodes.
        fdkgPct_values (list): List of FDKG Participation Percentages.
        retPct_values (list): List of Tallier Retention Percentages.
        success_threshold (float): Minimum required success rate (%).

    Returns:
        pd.DataFrame: Recommendation table.
    """
    recommendations = []
    
    for N in N_values:
        for fdkgPct in fdkgPct_values:
            for retPct in retPct_values:
                filtered = filter_data(data, N, fdkgPct, retPct)
                if filtered.empty:
                    continue
                optimal = find_optimal_parameters(filtered, success_threshold)
                if not optimal.empty:
                    t_opt = optimal['threshold'].values[0]
                    k_opt = optimal['guardians'].values[0]
                    success = optimal['successRate'].values[0]
                    recommendations.append({
                        'Number of Nodes (N)': N,
                        'FDKG Participation (%)': fdkgPct,
                        'Tallier Retention (%)': retPct,
                        'Threshold (t)': t_opt,
                        'Number of Guardians (k)': k_opt,
                        'Success Rate (%)': success
                    })
    
    recommendation_df = pd.DataFrame(recommendations)
    return recommendation_df


def main():
    # Path to the simulation data CSV (update this path as necessary)
    filepath = '../simulation_results_nodes_BarabasiAlbert_10000.csv'
    
    # Load the simulation data
    data = load_simulation_data(filepath)
    if data is None:
        return
    
    # # User inputs
    # try:
    #     N = int(input("Enter the number of nodes (N): "))
    #     fdkgPct = float(input("Enter the FDKG Participation Percentage (fdkgPct) [e.g., 50 for 50%]: "))
    #     retPct = float(input("Enter the Tallier Retention Percentage (retPct) [e.g., 75 for 75%]: "))
    # except ValueError:
    #     print("Invalid input. Please enter numerical values for N, fdkgPct, and retPct.")
    #     return
    
    # # Filter the data based on user inputs
    # filtered = filter_data(data, N, fdkgPct, retPct)
    # if filtered.empty:
    #     return
    
    # # Find optimal (t, k) parameters
    # optimal = find_optimal_parameters(filtered, success_threshold=0.8)
    # if not optimal.empty:
    #     t_opt = optimal['threshold'].values[0]
    #     k_opt = optimal['guardians'].values[0]
    #     success = optimal['successRate'].values[0]
    #     print("\nOptimal Parameters to Achieve at least 90% Success Rate:")
    #     print(f"Threshold (t): {t_opt}")
    #     print(f"Number of Guardians (k): {k_opt}")
    #     print(f"Achieved Success Rate: {success}%")
    # else:
    #     print("Consider adjusting your input parameters or accept a lower success rate.")
    
    # # Generate a heatmap (optional)
    # generate_heatmap(filtered)


    # Define parameter ranges for batch recommendations
    N_values = [10, 100, 500, 1000, 10000]  # Extend as needed
    fdkgPct_values = [0.25, 0.5, 0.75]  # Example percentages
    retPct_values = [0.9]        # Example percentages
    
    # Generate batch recommendations
    recommendations = batch_recommendations(data, N_values, fdkgPct_values, retPct_values, success_threshold=0.8)
    
    if not recommendations.empty:
        print("\nBatch Recommendations:")
        print(recommendations)
        # Save to CSV for inclusion in the paper
        recommendations.to_csv('parameter_recommendations.csv', index=False)
        print("\nRecommendations saved to parameter_recommendations.csv.")
    else:
        print("No recommendations could be made based on the provided simulation data.")

if __name__ == "__main__":
    main()