Ring signatures (RS) in essence:
RS is a technique which allows to prove that we know trapdoor of A or trapdoor of B.
RS for $(A, A-H)$ is proof that I know trapdoor of either $A$, or trapdoor of $A-H$.
Concretely, I know $t$ such that either $A = tG$, $A = tG+H$.

In our case $H$ is vote for 1 or 0. So RS allow us to prove that the encrypted vote is correct without revealing whether we have voted 1 or 0.
