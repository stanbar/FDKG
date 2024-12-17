import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

def generate_condensed_heatmap(csv_path, output_path='condensed_heatmap.png',
                               success_threshold=90, fixed_ret=0.9, fixed_t=1):
    """
    Generates a condensed heatmap showing the minimal number of guardians (k) required
    to achieve at least `success_threshold`% success rate for a given retention (retPct)
    and threshold (t=1).

    The heatmap's rows correspond to different numbers of nodes (N) and its columns correspond
    to different FDKG participation percentages (fdkgPct). Each cell shows the minimal k
    that yields at least `success_threshold`% success rate under these conditions.

    Parameters:
        csv_path (str): Path to the CSV file containing the simulation results.
        output_path (str): Path to save the generated heatmap image.
        success_threshold (float): Minimum desired success rate percentage.
        fixed_ret (float): Fixed tallier retention percentage to filter on.
        fixed_t (int): Fixed threshold value to consider.
    """
    # Load the data
    data = pd.read_csv(csv_path)
    
    # Filter for the given retention and threshold
    subset = data[
        (data['Tallier Retention (%)'] == fixed_ret) &
        (data['Threshold (t)'] == fixed_t)
    ]
    
    if subset.empty:
        print("No data matches the specified retention and threshold conditions.")
        return
    
    # Further filter to only keep rows that meet or exceed the success threshold
    # But we need the minimal k for each (N, fdkgPct) that achieves ≥ success_threshold
    subset_success = subset[subset['Success Rate (%)'] * 100 >= success_threshold]
    
    if subset_success.empty:
        print(f"No configuration achieves {success_threshold}% success rate under the given conditions.")
        return
    
    # Group by N and fdkgPct and find minimal k
    # Note: The data might already have multiple entries per (N, fdkgPct) with different k.
    # We want the minimal k that still achieves success_threshold% success.
    # Also note that FDKG Participation (%) and Tallier Retention (%) are given as decimals in the snippet.
    # According to the given data structure, these are decimals (e.g. 0.8) or percentages?
    # The snippet shows them as floats (0.2,0.3,...), let's assume they are decimals not multiplied by 100.
    # If needed, we can adjust accordingly. The provided data uses fractions like 0.3 for FDKG Participation (%),
    # so we'll treat them as fractions (0.3 = 30%). Similarly for retPct, we have fixed_ret=0.9 means 90%.

    # For each (N, fdkgPct) pair, find the minimal k that achieves ≥ success_threshold
    grouped = subset_success.groupby(['Number of Nodes (N)', 'FDKG Participation (%)'])
    minimal_k = grouped['Number of Guardians (k)'].min().reset_index()

    # Pivot the data to create a matrix with N as rows and fdkgPct as columns
    # Rows: N, Columns: fdkgPct, Values: minimal k
    pivot_table = minimal_k.pivot(index='Number of Nodes (N)', columns='FDKG Participation (%)', values='Number of Guardians (k)')

    # Sort the indices and columns for a cleaner presentation
    pivot_table = pivot_table.sort_index(axis=0).sort_index(axis=1)

    # Create a heatmap
    plt.figure(figsize=(8, 6))
    sns.heatmap(pivot_table, annot=True, fmt=".0f", cmap='YlGnBu', cbar_kws={'label': 'Minimal Guardians (k)'})
    plt.title(f"Minimal Number of Guardians (k) for ≥{success_threshold}% Success Rate\n"
              f"(t={fixed_t}, retPct={int(fixed_ret*100)}%)")
    plt.xlabel("FDKG Participation (%)")
    plt.ylabel("Number of Nodes (N)")

    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    print(f"Condensed heatmap saved as {output_path}.")
    # plt.show()

if __name__ == "__main__":
    # Example usage:
    # Adjust the filepath to point to the updated CSV containing the 73 rows.
    graph = "BarabasiAlbert" # "RandomGraph"
    csv_filepath = f"parameter_recommendations_{graph}.csv"  # Replace with the actual CSV filename
    generate_condensed_heatmap(csv_filepath, output_path=f"condensed_heatmap_{graph}.png", success_threshold=90, fixed_ret=0.9, fixed_t=1)
