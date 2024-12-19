import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load input data
def generate_heatmap(parameters_recommendations_df, optimal_configurations_df, network_type):
    new_input_df = parameters_recommendations_df
    # Rename columns for clarity
    new_input_df.rename(columns={
        'Number of Nodes (N)': 'N',
        'FDKG Participation (%)': 'FDKG Participation',
        'Tallier Retention (%)': 'Tallier Retention',
        'Successfull Configurations Count': 'Successful Configurations Count'
    }, inplace=True)

    # Filter relevant columns
    new_input_df = new_input_df[['N', 'FDKG Participation', 'Tallier Retention', 'Successful Configurations Count']]

    # Pivot the table to have FDKG Participation on the X-axis and Tallier Retention on the Y-axis
    pivoted_dfs = {}
    for n_value in new_input_df['N'].unique():
        # Filter rows for the given N value
        n_df = new_input_df[new_input_df['N'] == n_value]
        # Pivot the table
        pivoted_df = n_df.pivot_table(
            index='Tallier Retention', 
            columns='FDKG Participation', 
            values='Successful Configurations Count', 
            aggfunc='sum'
        )
        # Sort Tallier Retention descending and FDKG Participation ascending
        pivoted_df.sort_index(ascending=False, inplace=True)
        pivoted_df.sort_index(axis=1, ascending=True, inplace=True)
        # Store the pivoted DataFrame
        pivoted_dfs[n_value] = pivoted_df

    # Combine the pivoted DataFrames back into a single output DataFrame
    output_rows = []
    for n_value, pivoted_df in pivoted_dfs.items():
        for row_index, row in pivoted_df.iterrows():
            row_dict = {'Number of nodes': n_value, 'Retention Percentage\\FDKG Percentage': row_index}
            row_dict.update({int(col * 100): value for col, value in row.items()})
            output_rows.append(row_dict)

    # Create the final output DataFrame
    new_output_df = pd.DataFrame(output_rows)

    # Save the output to CSV
    new_output_file_path = 'new_output.csv'
    new_output_df.to_csv(new_output_file_path, index=False)


    ############## HEATMAP PLOTTING ################


    # Create a combined heatmap for all the N values in the new output table
    combined_df = new_output_df.copy()

    # Melt the dataframe to have columns 'N', 'Retention Percentage', 'FDKG Percentage', and 'Successful Configurations Count'
    melted_df = combined_df.melt(
        id_vars=['Number of nodes', 'Retention Percentage\\FDKG Percentage'],
        var_name='FDKG Participation (%)',
        value_name='Successful Configurations Count'
    )

    # Rename columns for better readability
    melted_df.rename(columns={
        'Number of nodes': 'N',
        'Retention Percentage\\FDKG Percentage': 'Tallier Retention (%)',
        'FDKG Participation (%)': 'FDKG Participation (%)'
    }, inplace=True)

    # Convert 'FDKG Participation (%)' and 'Tallier Retention (%)' to numeric
    melted_df['FDKG Participation (%)'] = pd.to_numeric(melted_df['FDKG Participation (%)'], errors='coerce')
    melted_df['Tallier Retention (%)'] = pd.to_numeric(melted_df['Tallier Retention (%)'], errors='coerce')

    # Drop rows with NaN values
    melted_df.dropna(subset=['FDKG Participation (%)', 'Tallier Retention (%)', 'Successful Configurations Count'], inplace=True)

    # Pivot the dataframe to have a format suitable for the heatmap
    heatmap_df = melted_df.pivot_table(
        index=['Tallier Retention (%)', 'N'], 
        columns='FDKG Participation (%)', 
        values='Successful Configurations Count',
        aggfunc='sum'
    )

    # Rename columns for clarity
    optimal_configurations_df.rename(columns={
        'Number of nodes': 'N',
        'Tallier Retention': 'Tallier Retention (%)'
    }, inplace=True)

    # Melt the dataframe to have columns 'N', 'Retention Percentage', 'FDKG Participation (%)', and 'Optimal Configuration'
    melted_optimal_df = optimal_configurations_df.melt(
        id_vars=['N', 'Tallier Retention (%)'],
        var_name='FDKG Participation (%)',
        value_name='Optimal Configuration'
    )

    # Rename columns for better readability
    melted_optimal_df.rename(columns={
        'FDKG Participation (%)': 'FDKG Participation (%)',
    }, inplace=True)

    # Convert 'FDKG Participation (%)' and 'Tallier Retention (%)' to numeric
    melted_optimal_df['FDKG Participation (%)'] = pd.to_numeric(melted_optimal_df['FDKG Participation (%)'], errors='coerce')
    melted_optimal_df['Tallier Retention (%)'] = pd.to_numeric(melted_optimal_df['Tallier Retention (%)'], errors='coerce')

    # Drop rows with NaN values
    melted_optimal_df.dropna(subset=['FDKG Participation (%)', 'Tallier Retention (%)', 'Optimal Configuration'], inplace=True)

    # Pivot the dataframe to have a format suitable for the heatmap
    optimal_config_heatmap_df = melted_optimal_df.pivot_table(
        index=['Tallier Retention (%)', 'N'], 
        columns='FDKG Participation (%)', 
        values='Optimal Configuration',
        aggfunc='first'
    )

    # Reorder the Y-axis to be sorted by 'N' ascending and 'Tallier Retention (%)' descending
    heatmap_df_sorted = heatmap_df.copy()
    heatmap_df_sorted.sort_index(level=['N', 'Tallier Retention (%)'], ascending=[True, False], inplace=True)

    optimal_config_heatmap_df_sorted = optimal_config_heatmap_df.copy()
    optimal_config_heatmap_df_sorted.sort_index(level=['N', 'Tallier Retention (%)'], ascending=[True, False], inplace=True)

    # Plot the heatmap with values overlaid and detailed caption
    plt.figure(figsize=(15, 10))
    sns.heatmap(
        heatmap_df_sorted, 
        cmap='YlGnBu', 
        linewidths=0.1, 
        linecolor='gray', 
        cbar=True, 
        square=False, 
        annot=optimal_config_heatmap_df_sorted, 
        fmt='s', 
        cbar_kws={'label': 'Count of successful unique (k,t) configurations'}
    )

    plt.title(f'Heatmap of Successful Configurations Count and Optimal (k,t) Configurations for {network_type}')
    plt.xlabel('FDKG Participation (%)')
    plt.ylabel('Tallier Retention (%) & N')
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)

    # Add caption below the plot
    plt.figtext(
        0.5, -0.1, 
        ("This heatmap shows the count of all (k,t) configurations that achieve a 99% success rate for each combination of N, FDKG Participation (%), "
        "and Tallier Retention (%). The intensity of the color represents the count of successful unique configurations. The numeric values inside each cell "
        "represent the most optimal (k,t) configuration for that particular parameter combination."),
        ha="center", fontsize=12, wrap=True
    )

    # Display the heatmap
    plt.tight_layout()
    plt.show()
    # Save the heatmap to a file
    output_plot_file_path = f'one_heatmap_plot_{network_type}.png'
    plt.savefig(output_plot_file_path, bbox_inches='tight')


if __name__ == "__main__":
    network_type = 'RandomGraph' # 'BarabasiAlbert' or 'RandomGraph'

    if network_type == 'BarabasiAlbert':
        parameters_recommendations_df = pd.read_csv("parameter_recommendations_2_BarabasiAlbert_99.csv")  # Replace with your file path
        optimal_configurations_df  = pd.read_csv("optimals_BA_99.csv")
    else:
        parameters_recommendations_df = pd.read_csv("parameter_recommendations_2_RandomGraph_99.csv")
        optimal_configurations_df  = pd.read_csv("optimals_RN_99.csv")

    generate_heatmap(parameters_recommendations_df, optimal_configurations_df, network_type='BarabasiAlbert')