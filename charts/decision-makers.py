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

def find_optimal_parameters(filtered_data, success_threshold=0.9):
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
    
    # Sort by threshold (descending) and guardians (ascending)
    successful_sorted = successful.sort_values(by=['threshold', 'guardians'], ascending=[False, True])
    
    # Select the combination with the largest t and smallest k
    optimal = successful_sorted.head(1)
    
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


def generate_heatmap(filtered_data, N, fdkgPct, retPct):
    """
    Generates and saves a heatmap showing success rates for different (t, k) combinations.

    Parameters:
        filtered_data (pd.DataFrame): The subset of simulation data.
        save_path (str): Path to save the heatmap image.

    Returns:
        None
    """
    filtered_data['successRate'] = filtered_data['successRate'] * 100
    pivot_table = filtered_data.pivot_table(
        index='threshold',
        columns='guardians',
        values='successRate',
        aggfunc='mean'
    )
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(pivot_table, annot=True, fmt=".1f", cmap='YlGnBu', vmin=0, vmax=100, cbar_kws={'label': 'Success Rate (%)'})
    plt.title(f'Success Rate Heatmap for (Threshold, Guardians)\nN={N}, FDKG Participation={fdkgPct*100}%, Retention={retPct*100}%')
    plt.xlabel('Number of Guardians (k)')
    plt.ylabel('Threshold (t)')
    
    # # Highlight cells that meet the success threshold
    # for i in range(pivot_table.shape[0]):
    #     for j in range(pivot_table.shape[1]):
    #         if pivot_table.iloc[i, j] >= success_threshold:
    #             plt.gca().add_patch(plt.Rectangle((j, i), 1, 1, fill=False, edgecolor='red', lw=3))
    
    save_path = f'parameter_heatmap_N{N}_fdkgPct{fdkgPct}_retPct{retPct}.png'
    # plt.savefig(save_path)
    # print(f"Heatmap saved as {save_path}.")
    # plt.show()

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
                # Count all successful configurations
                successful_count = len(filtered[filtered['successRate'] >= (success_threshold / 100)])
                if successful_count == 0:
                    continue
                optimal = find_optimal_parameters(filtered, success_threshold/100)
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
                        'Success Rate (%)': success,
                        'Successfull Configurations Count': successful_count
                    })
                    generate_heatmap(filtered, N=N, fdkgPct=fdkgPct, retPct=retPct)
    
    recommendation_df = pd.DataFrame(recommendations)
    return recommendation_df

def main():
    # Path to the simulation data CSV (update this path as necessary)
    graph="DKG" # "RandomGraph" "BarabasiAlbert" "DKG"
    filepath = f'../../liveness_sim/full_simulation_results_nodes_{graph}_1000.csv'
    
    # Load the simulation data
    data = load_simulation_data(filepath)
    if data is None:
        return

    # Define parameter ranges for batch recommendations
    N_values = [10, 100, 1_000]  # Extend as needed
    fdkgPct_values = [.2, .4, .6, .8, 1.0]  # Example percentages
    retPct_values = [0.5, 0.7, 0.9, 1.0]        # Example percentages
    
    success_threshold = 99
    # Generate batch recommendations
    recommendations = batch_recommendations(data, N_values, fdkgPct_values, retPct_values, success_threshold=success_threshold)
    
    if not recommendations.empty:
        print("\nBatch Recommendations:")
        print(recommendations)
        # Save to CSV for inclusion in the paper
        file_name = f'parameter_recommendations_2_{graph}_{success_threshold}.csv'
        recommendations.to_csv(file_name, index=False)
        print(f"\nRecommendations saved to {file_name}")
    else:
        print("No recommendations could be made based on the provided simulation data.")

if __name__ == "__main__":
    main()