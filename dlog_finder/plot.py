import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

# Load the data
data = pd.read_csv("results27.csv")
data["Time"] = data["Time"] / 60000  # Convert time to minutes


# Function for the power-law fit: Y = a * X^b
def power_law_fit(x, a, b):
    return a * (x**b)


# Linear regression on the logarithmically transformed data
log_model = LinearRegression()
color_palette = plt.cm.tab10(np.linspace(0, 1, len(data["Options"].unique())))

plt.figure(figsize=(14, 8))

# Determining the range for extrapolation based on the plot's boundaries
min_voters = data["Voters"].min()
max_voters = data["Voters"].max()

for idx, option in enumerate(sorted(data["Options"].unique())):
    subset = data[(data["Options"] == option) & (data["Time"] > 0)]

    if not subset.empty:
        # Logarithmic transformation of the data
        log_X = np.log(subset["Voters"]).values.reshape(-1, 1)
        log_Y = np.log(subset["Time"]).values

        # Fit the linear model
        log_model.fit(log_X, log_Y)

        # Calculate the power-law coefficients
        a = np.exp(log_model.intercept_)
        b = log_model.coef_[0]

        # Plot the original data
        plt.scatter(
            subset["Voters"],
            subset["Time"],
            color=color_palette[idx],
            label=f"{option} candidates",
        )

        # Finding the X value where the extrapolation should stop (based on the maximum Y value)
        max_y = subset["Time"].max()
        max_x = (max_y / a) ** (1 / b)

        # Extrapolating the power-law fit up to the calculated max X value
        fit_X = np.linspace(min_voters, min(max_voters, max_x), 100)
        fit_Y = power_law_fit(fit_X, a, b)
        plt.plot(fit_X, fit_Y, color=color_palette[idx], linestyle="-.")

        # Annotation for the power-law equation
        equation_text = f"Y = {a:.2e}X^{b:.3f}"
        plt.text(
            fit_X[-1],
            fit_Y[-1],
            equation_text,
            fontsize=14,
            color=color_palette[idx],
            horizontalalignment="left",
            verticalalignment="bottom",
        )

# Adding plot details
# plt.title("Time [minutes] vs. Number of voters (Log-Log Scale)")
plt.xlabel("Number of voters", fontsize=16)
plt.ylabel("Time (in minutes)", fontsize=16)
plt.ylabel("Time (in minutes)")
plt.xscale("log")  # Using log scale for x-axis
plt.yscale("log")  # Also using log scale for y-axis for better visualization
plt.legend(loc='upper left')
plt.grid(True)

# Show the plot
plt.show()
