import pandas as pd
import itertools
import seaborn as sns
import matplotlib.pyplot as plt

graphs = ["BarabasiAlbert"]
n_values = [100, 200, 300, 400, 500, 600]
p_values = [round(0.1 * i, 1) for i in range(1, 11)]

for graph, n, p in itertools.product(graphs, n_values, p_values):
  df = pd.read_csv(f'../liveness_sim/full_simulation_results_nodes_BarabasiAlbert_100600.csv')
  df_f = df.query(f"nodes == {n} & fdkgPercentage == {p}")
  df_min = df_f[df_f["successRate"] >= 0.99].groupby(['guardians','threshold'], as_index=False)['tallierRetPct'].min()
  df_min['x'] = df_min['threshold'] / df_min['guardians']
  df_min['y'] = df_min['guardians'] / n

  plt.figure()
  plt.scatter(df_min['x'], df_min['y'], c=df_min['tallierRetPct'], cmap='viridis_r', s=100)
  plt.colorbar(label='Minimal $r$ that success rate ≥ 0.99')
  plt.xlabel('$g_t$/$g_k$')
  plt.ylabel('$g_k$/$n$')
  plt.tight_layout()
  plt.savefig(f'minimal_retention_for_guardians_to_threshold/p{p}_n{n}.png')
  plt.close()