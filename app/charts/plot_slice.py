import pandas as pd
import matplotlib.pyplot as plt

n = 1000
df_barabasi = pd.read_csv(f'../../liveness_sim/full_simulation_results_nodes_BarabasiAlbert.csv')
df_random = pd.read_csv(f'../../liveness_sim/full_simulation_results_nodes_RandomGraph.csv')

n = 200
# Take only entries for nodes == 100 and fdkgPercentage == 1.0
df_f = df_random.query(f"nodes == {n} & fdkgPercentage == 0.5")

# For each (guardians, threshold), find the minimal tallierRetPct with successRate >= 0.99
df_min = df_f[df_f["successRate"] >= 0.99].groupby(['guardians','threshold'], as_index=False)['tallierRetPct'].min()

df_min['x'] = df_min['threshold'] / df_min['guardians']
df_min['y'] = df_min['guardians'] / n

plt.scatter(df_min['x'], df_min['y'], c=df_min['tallierRetPct'], cmap='viridis_r')
plt.colorbar(label='Minimal tallierRetention ≥ 0.99')
plt.xlabel('threshold/guardians')
plt.ylabel('guardians/nodes')
plt.tight_layout()
plt.show()