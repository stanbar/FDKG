import pandas as pd

n  = 100
k = n-1
t = 40
fdkgPct = 0.6

# Load CSV files
df_dkg = pd.read_csv(f'../../liveness_sim/full_simulation_results_nodes_DKG_{n}.csv')
df_barabasi = pd.read_csv(f'../../liveness_sim/full_simulation_results_nodes_BarabasiAlbert_{n}.csv')
df_random = pd.read_csv(f'../../liveness_sim/full_simulation_results_nodes_RandomGraph_{n}.csv')

def query_data(data, N, k, t, fdkgPct):
    return data[(data['nodes'] == N) & 
            (data['guardians'] == k) & 
       (data['threshold'] == t) & 
       (data['fdkgPercentage'] == fdkgPct)]



combined_df = pd.DataFrame({
  'DKG': query_data(df_dkg, n, k, t, fdkgPct)['successRate'].reset_index(drop=True),
  'BarabasiAlbert': query_data(df_barabasi, n, k, t, fdkgPct)['successRate'].reset_index(drop=True),
  'RandomGraph': query_data(df_random,  n, k, t, fdkgPct)['successRate'].reset_index(drop=True)
})

print(combined_df)